import * as k8s from '@kubernetes/client-node';
import debug from 'debug';
import notifyRelease from '../release.mjs';

import config from '../config.mjs';

const log = debug('release-cd:keyRotate');

const k8sConfig = new k8s.KubeConfig();
k8sConfig.loadFromDefault();
const watcher = new k8s.Watch(k8sConfig);
const k8sApi = k8sConfig.makeApiClient(k8s.CoreV1Api);

export default async function keyRotate(request, h) {
    if (config.server?.auth) {
        const authHeader = request.headers['authorization'];
        if (authHeader !== config.server.auth) return h.response({ message: 'Unauthorized' }).code(401);
    }
    let namespace = '';
    let secretName = '';
    const startTime = Date.now();

    switch (request.params.key) {
        case 'hub':
            namespace = 'mojaloop';
            secretName = 'switch-jws';
            break;
        default:
            return h.response({ message: 'Unknown key' }).code(400);
    }

    let version;
    try {
        const existing = await k8sApi.readNamespacedSecret({ name: secretName, namespace });
        version = existing.metadata.resourceVersion;
    } catch (error) {
        if (error.code !== 404) throw error;
        log(error);
    }

    return new Promise((resolve, reject) => {
        let timeout

        const reqPromise = watcher.watch(
            `/api/v1/namespaces/${namespace}/secrets`,
            { fieldSelector: `metadata.name=${secretName}`, ...version && { resourceVersion: version } },
            (type, obj) => {
                log(`Event: ${type}`, obj);
                if (type === 'ADDED') {
                    if (timeout) clearTimeout(timeout);
                    timeout = null;
                    reqPromise.then(watch => watch.abort());
                    const { uid, resourceVersion, creationTimestamp, name, namespace } = obj.metadata;
                    resolve(h.response({ name, namespace, uid, resourceVersion, creationTimestamp }).code(200));
                    notifyRelease({
                        reportId: `key-rotate-${request.params.key}`,
                        totalAssertions: 1,
                        totalPassedAssertions: 1,
                        duration: Date.now() - startTime,
                        keyRotate: { uid, resourceVersion, creationTimestamp, name, namespace }
                    }).catch(err => {
                        console.error('Error notifying release of key rotation:', err);
                    });
                }
            },
            err => {
                if (err) {
                    if (timeout) clearTimeout(timeout);
                    timeout = null;
                    log('Watch error:', err);
                    reqPromise.then(watch => {
                        resolve(h.response({ message: watch?.signal?.reason || err.message }).code(500));
                    }).catch(reject);
                }
            }
        ).then(req => {
            timeout = setTimeout(() => req.abort('Timeout waiting for secret recreation'), 300_000);
            if (version) k8sApi.deleteNamespacedSecret({ name: secretName, namespace }).catch(console.error);
            return req;
        });
    });
}
