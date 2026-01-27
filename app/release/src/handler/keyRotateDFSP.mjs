import { boomify } from '@hapi/boom';
import axios from 'axios';
import { k8sApi, watcher } from '../k8s.mjs';
import notifyRelease from '../release.mjs';

export default async function keyRotateDFSP(request, h) {
    const messages = [];
    const log = string => {
        console.log(new Date(), '... ' + string);
        messages.push(string);
    }
    const startTime = Date.now();
    try {
        const results = [];
        const dfsps = request.payload?.dfsps || [];
        const proxies = request.payload?.proxies || [];

        log(`Starting key rotation for key type: ${request.params.key}`);
        log(`DFSPs to process: ${dfsps.length > 0 ? dfsps.join(', ') : 'none'}`);
        log(`Proxies to process: ${proxies.length > 0 ? proxies.join(', ') : 'none'}`);
        const push = responses => results.push(...responses.map((res, index) => ({ dfsp: dfsps[index], ...res })))
        const tlsServer = () => Promise.all(
            dfsps.map(dfsp =>
                deleteSecretAndAwaitRecreation(`${dfsp}-vault-tls-cert`, dfsp, log)
            ).concat(proxies.map(proxy => [
                deleteSecretAndAwaitRecreation(`${proxy}-vault-tls-cert-scheme-a`, proxy, log),
                deleteSecretAndAwaitRecreation(`${proxy}-vault-tls-cert-scheme-b`, proxy, log)
            ]).flat())
        ).then(push)
        const jws = () => Promise.all(
            dfsps.map(dfsp =>
                rotateJWS(`${dfsp}-management-api.${dfsp}`, log)
            ).concat(proxies.map(proxy => [
                rotateJWS(`${proxy}-management-api-a.${proxy}`, log),
                rotateJWS(`${proxy}-management-api-b.${proxy}`, log)
            ]).flat())
        ).then(push)
        const outboundTLS = () => Promise.all(
            dfsps.map(dfsp =>
                rotateOutboundTLS(`${dfsp}-management-api.${dfsp}`, log)
            ).concat(proxies.map(proxy => [
                rotateOutboundTLS(`${proxy}-management-api-a.${proxy}`, log),
                rotateOutboundTLS(`${proxy}-management-api-b.${proxy}`, log)
            ]).flat())
        ).then(push)

        switch (request.params.key) {
            case 'tls-server':
                log('Rotating TLS server certificates...');
                await tlsServer();
                log('TLS server certificate rotation completed');
                break;
            case 'jws':
                log('Rotating JWS credentials...');
                await jws();
                log('JWS credential rotation completed');
                break;
            case 'outboundTLS':
                log('Rotating outbound TLS certificates...');
                await outboundTLS();
                log('Outbound TLS certificate rotation completed');
                break;
            case 'all':
                log('Rotating all credential types...');
                log('Step 1/3: Rotating JWS credentials...');
                await jws();
                log('Step 2/3: Rotating outbound TLS certificates...');
                await outboundTLS();
                log('Step 3/3: Rotating TLS server certificates...');
                await tlsServer();
                log('All credential rotations completed');
                break;
            default:
                return h.response({ message: 'Unknown key' }).code(400);
        }

        const duration = Date.now() - startTime;
        log(`Key rotation completed successfully in ${duration}ms`);
        log(`Results: ${results.length} operations processed`);
        results.push(messages)
        notify(request.params.key, duration, messages.join('\n'), true).catch(err => {
            console.error(new Date(), 'Error notifying release of key rotation:', err);
        });
        return h.response(results).code(200);
    } catch (error) {
        console.error(new Date(), 'Key rotation error:', error);
        log(`Key rotation failed: ${error.message}`);
        await notify(request.params.key, Date.now() - startTime, messages.join('\n') + '\n==============\nError: ' + error.message + '\n\n' + error.stack, false).catch(err => {
            console.error(new Date(), 'Error notifying release of key rotation failure:', err);
        });
        return h.response({ message: error.message }).code(500);
    }
}

async function notify(keyName, duration, body, isPassed) {
    notifyRelease({
        reportId: `key-rotate-${keyName}`,
        totalAssertions: 1,
        totalPassedAssertions: isPassed ? 1 : 0,
        isPassed,
        duration,
        report: {
            body,
            contentType: 'text/plain'
        }
    }).catch(err => {
        console.error(new Date(), 'Error notifying release of key rotation:', err);
    });
}

async function rotateCredential(dfspNameAndNamespace, credentialType, log) {
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
        log(`Rotating ${credentialType} for ${dfspNameAndNamespace}...`);
        // Get initial state
        log(`Fetching initial state for ${dfspNameAndNamespace}...`);
        const initialResponse = await axios.get(`http://${dfspNameAndNamespace}.svc.cluster.local:9050/state`);
        const initialValue = initialResponse.data?.[stateProperty]?.[identifierKey] || 0;
        log(`Initial ${identifierKey} value for ${dfspNameAndNamespace}: ${initialValue}`);

        // Trigger recreation
        log(`Triggering ${credentialType} recreation for ${dfspNameAndNamespace}...`);
        const recreateResponse = await axios.post(`http://${dfspNameAndNamespace}.svc.cluster.local${endpoint}`, {
            reason: 'release-cd-triggered recreate'
        });
        log(`Recreation triggered for ${dfspNameAndNamespace}, polling for changes...`);

        // Poll for changes with delay
        const maxAttempts = 20;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds delay
            try {
                const currentResponse = await axios.get(`http://${dfspNameAndNamespace}.svc.cluster.local:9050/state`);
                const currentValue = currentResponse.data?.[stateProperty]?.[identifierKey];

                if (currentValue && currentValue !== initialValue) {
                    log(`${credentialType} successfully changed for ${dfspNameAndNamespace}: ${initialValue} -> ${currentValue} (attempt ${attempt})`);
                    return {
                        success: true,
                        initialValue,
                        newValue: currentValue,
                        attempt,
                        recreateResponse: recreateResponse.data
                    };
                }
                log(`Attempt ${attempt}/${maxAttempts}: ${credentialType} not yet changed for ${dfspNameAndNamespace}`);
            } catch (error) {
                log(`Attempt ${attempt} failed to get state for ${dfspNameAndNamespace}:`, error.message);
            }
        }

        // If we reach here, credential didn't change within the timeout
        log(`${credentialType} rotation timeout for ${dfspNameAndNamespace} after ${maxAttempts} attempts`);
        throw new Error(`${errorMessage} for ${dfspNameAndNamespace} after ${maxAttempts} attempts`);

    } catch (error) {
        throw boomify(error, {
            message: `Error rotating ${credentialType} for PM ${dfspNameAndNamespace}`,
            data: error.response?.data
        });
    }
}

async function rotateJWS(dfspName, log) {
    return rotateCredential(dfspName, 'jws', log);
}

async function rotateOutboundTLS(dfspName, log) {
    return rotateCredential(dfspName, 'outboundTLS', log);
}

async function deleteSecretAndAwaitRecreation(secretName, namespace, log) {
    log(`Starting secret rotation for ${secretName} in namespace ${namespace}`);
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
                log(`Watch event for ${secretName}: ${type}`);
                if (type === 'ADDED') {
                    if (timeout) clearTimeout(timeout);
                    timeout = null;
                    const { uid, resourceVersion, creationTimestamp, name, namespace } = obj.metadata;
                    log(`Secret ${secretName} recreated successfully (UID: ${uid})`);
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
            if (secret) {
                log(`Deleting existing secret ${secretName} in namespace ${namespace}...`);
                k8sApi.deleteNamespacedSecret({ name: secretName, namespace }).catch(err => {
                    log(`Error deleting secret ${secretName}: ${err.message}`);
                    console.error(err);
                });
            } else {
                log(`No existing secret ${secretName} found, waiting for creation...`);
            }
            return req;
        }).catch(reject);
    });
}

