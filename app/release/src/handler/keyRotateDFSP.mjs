import debug from 'debug';

import { boomify } from '@hapi/boom';
import axios from 'axios';
import { k8sApi, watcher } from '../k8s.mjs';
import notifyRelease from '../release.mjs';

const log = debug('release-cd:keyRotate');

export default async function keyRotateDFSP(request, h) {
    try {
        const results = [];
        const dfsps = request.payload?.dfsps || [];
        const proxies = request.payload?.proxies || [];
        const startTime = Date.now();
        const push = responses => results.push(...responses.map((res, index) => ({ dfsp: dfsps[index], ...res })))
        const tlsServer = () => Promise.all(
            dfsps.map(dfsp =>
                deleteSecretAndAwaitRecreation(`${dfsp}-vault-tls-cert`, dfsp)
            ).concat(proxies.map(proxy => [
                deleteSecretAndAwaitRecreation(`${proxy}-vault-tls-cert-scheme-a`, proxy),
                deleteSecretAndAwaitRecreation(`${proxy}-vault-tls-cert-scheme-b`, proxy)
            ]).flat())
        ).then(push)
        const jws = () => Promise.all(
            dfsps.map(dfsp =>
                rotateJWS(`${dfsp}-management-api.${dfsp}`)
            ).concat(proxies.map(proxy => [
                rotateJWS(`${proxy}-management-api-a.${proxy}`),
                rotateJWS(`${proxy}-management-api-b.${proxy}`)
            ]).flat())
        ).then(push)
        const outboundTLS = () => Promise.all(
            dfsps.map(dfsp =>
                rotateOutboundTLS(`${dfsp}-management-api.${dfsp}`)
            ).concat(proxies.map(proxy => [
                rotateOutboundTLS(`${proxy}-management-api-a.${proxy}`),
                rotateOutboundTLS(`${proxy}-management-api-b.${proxy}`)
            ]).flat())
        ).then(push)

        switch (request.params.key) {
            case 'tls-server':
                await tlsServer();
                break;
            case 'jws':
                await jws()
                break;
            case 'outboundTLS':
                await outboundTLS();
                break;
            case 'all':
                await jws();
                await outboundTLS();
                await tlsServer();
                break;
            default:
                return h.response({ message: 'Unknown key' }).code(400);
        }

        notify(request.params.key, Date.now() - startTime, [...dfsps, ...proxies]);
        return h.response(results).code(200);
    } catch (error) {
        return h.response({ message: error.message }).code(500);
    }
}

async function notify(keyName, duration, dfsps) {
    notifyRelease({
        reportId: `key-rotate-${keyName}`,
        totalAssertions: 1,
        totalPassedAssertions: 1,
        isPassed: true,
        duration,
        keyRotateDFSP: { dfsps }
    }).catch(err => {
        console.error('Error notifying release of key rotation:', err);
    });
}

async function rotateCredential(dfspNameAndNamespace, credentialType) {
    const config = {
        jws: {
            endpoint: '/recreate/JWS',
            stateProperty: 'dfspJWS',
            identifierKey: 'createdAt',
            errorMessage: 'JWS createdAt did not change'
        },
        outboundTLS: {
            endpoint: '/recreate/outboundTLS',
            stateProperty: 'dfspClientCert',
            identifierKey: 'id',
            errorMessage: 'outboundTLS id did not change'
        }
    };

    const { endpoint, stateProperty, identifierKey, errorMessage } = config[credentialType];

    try {
        // Get initial state
        const initialResponse = await axios.get(`http://${dfspNameAndNamespace}.svc.cluster.local:9050/state`);
        const initialValue = initialResponse.data?.[stateProperty]?.[identifierKey] || 0;

        // Trigger recreation
        const recreateResponse = await axios.post(`http://${dfspNameAndNamespace}.svc.cluster.local${endpoint}`, {
            reason: 'release-cd-triggered recreate'
        });

        // Poll for changes with delay
        const maxAttempts = 20;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds delay
            try {
                const currentResponse = await axios.get(`http://${dfspNameAndNamespace}.svc.cluster.local:9050/state`);
                const currentValue = currentResponse.data?.[stateProperty]?.[identifierKey];

                if (currentValue && currentValue !== initialValue) {
                    return {
                        success: true,
                        initialValue,
                        newValue: currentValue,
                        attempt,
                        recreateResponse: recreateResponse.data
                    };
                }
            } catch (error) {
                log(`Attempt ${attempt} failed to get state for ${dfspNameAndNamespace}:`, error.message);
            }
        }

        // If we reach here, credential didn't change within the timeout
        throw new Error(`${errorMessage} for ${dfspNameAndNamespace} after ${maxAttempts} attempts`);

    } catch (error) {
        throw boomify(error, {
            message: `Error rotating ${credentialType} for PM ${dfspNameAndNamespace}`,
            data: error.response?.data
        });
    }
}

async function rotateJWS(dfspName) {
    return rotateCredential(dfspName, 'jws');
}

async function rotateOutboundTLS(dfspName) {
    return rotateCredential(dfspName, 'outboundTLS');
}

async function deleteSecretAndAwaitRecreation(secretName, namespace) {
    let version;
    let secret;
    const fieldSelector = `metadata.name=${secretName}`;
    try {
        const existing = await k8sApi.listNamespacedSecret({ namespace, fieldSelector });
        secret = existing.items[0];
        version = existing.metadata.resourceVersion;
    } catch (error) {
        if (error.code !== 404) throw error;
        log(error);
    }

    return new Promise((resolve, reject) => {
        let timeout;
        let watch;
        watcher.watch(
            `/api/v1/namespaces/${namespace}/secrets`,
            { fieldSelector, ...version && { resourceVersion: version } },
            (type, obj) => {
                log(`Event: ${type}`, obj);
                if (type === 'ADDED') {
                    if (timeout) clearTimeout(timeout);
                    timeout = null;
                    const { uid, resourceVersion, creationTimestamp, name, namespace } = obj.metadata;
                    try {
                        resolve({ name, namespace, uid, resourceVersion, creationTimestamp });
                    } finally {
                        watch?.abort();
                    }
                } else if (type === 'ERROR') {
                    if (timeout) clearTimeout(timeout);
                    timeout = null;
                    watch?.abort();
                    log('Watch error event:', obj);
                    reject(new Error(obj?.message || 'Watch error'));
                }
            },
            err => {
                if (err) {
                    if (timeout) clearTimeout(timeout);
                    timeout = null;
                    log('Watch error:', err);
                    reject(new Error(watch?.signal?.reason || err.message));
                }
            }
        ).then(req => {
            watch = req;
            timeout = setTimeout(() => req.abort('Timeout waiting for secret recreation'), 300000);
            if (secret) k8sApi.deleteNamespacedSecret({ name: secretName, namespace }).catch(console.error);
            return req;
        }).catch(reject);
    });
}

