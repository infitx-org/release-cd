import debug from 'debug';

import { k8sApi, watcher } from '../k8s.mjs';
import notifyRelease from '../release.mjs';
import { boomify } from '@hapi/boom';

const log = debug('release-cd:keyRotate');


export default async function keyRotateDFSP(request, h) {

    try {
        const results = [];
        const dfsps = request.params.dfsps || [];
        
        switch (request.params.key) {
            case 'tls-server': {
                const result = await Promise.all(dfsps.map(dfsp => {
                    return deleteSecretAndAwaitRecreation(`${dfsp}-vault-tls-cert`, dfsp, 'tls-server');
                }))
                results.push(...result.map(res => ({ dfsp, ...res })));
                break;
            }
            case 'jws': {
                const result = await Promise.all(dfsps.map(dfsp => {
                    return rotateJWS(dfsp);
                }))
                results.push(...result.map(res => ({ dfsp, ...res })));
                break;
            }
            case 'outboundTLS': {
                const result = await Promise.all(dfsps.map(dfsp => {
                    return rotateOutboundTLS(dfsp);
                }))
                results.push(...result.map(res => ({ dfsp, ...res })));
                break;
            }
            case 'all': {
                const result1 = await Promise.all(dfsps.map(dfsp => {
                    return rotateJWS(dfsp);
                }))
                results.push(...result1.map(res => ({ dfsp, ...res })));
                const result2 = await Promise.all(dfsps.map(dfsp => {
                    return rotateOutboundTLS(dfsp);
                }))
                results.push(...result2.map(res => ({ dfsp, ...res })));
                const result3 = await Promise.all(dfsps.map(dfsp => {
                    return deleteSecretAndAwaitRecreation(`${dfsp}-vault-tls-cert`, dfsp, 'tls-server');
                }))
                results.push(...result3.map(res => ({ dfsp, ...res })));
                break;
            }
            default:
                return h.response({ message: 'Unknown key' }).code(400);
        }
        
        return h.response(results).code(200);
    } catch (error) {
        return h.response({ message: error.message }).code(500);
    }
}

async function rotateJWS(dfspName) {
        return axios.post(`http://${dfspName}-management-api.${dfspName}.svc.cluster.local/recreate/JWS`, {
            reason: 'release-cd-triggered recreate'
        })
        .then(response => (response.data))
        .catch(error => boomify(error, {
            message: `Error re-creating JWS for PM ${dfspName}`,
            data: error.response?.data
        }))
}

async function rotateOutboundTLS(dfspName) {
        axios.post(`http://${dfspName}-management-api.${dfspName}.svc.cluster.local/recreate/outboundTLS`, {
            reason: 'release-cd-triggered recreate'
        })
        .then(response => (response.data))
        .catch(error => boomify(error, {
            message: `Error re-creating outboundTLS for PM ${dfspName}`,
            data: error.response?.data
        }))
}

async function deleteSecretAndAwaitRecreation(secretName, namespace, keyName) {
    const startTime = Date.now();
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
                    notifyRelease({
                        reportId: `key-rotate-${keyName}`,
                        totalAssertions: 1,
                        totalPassedAssertions: 1,
                        isPassed: true,
                        duration: Date.now() - startTime,
                        keyRotate: { uid, resourceVersion, creationTimestamp, name, namespace }
                    }).catch(err => {
                        console.error('Error notifying release of key rotation:', err);
                    });
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

