import * as k8s from '@kubernetes/client-node';
import config from './config.mjs';

export default async function keyRotate(request, h) {
    if (config.server?.auth) {
        const authHeader = request.headers['authorization'];
        if (authHeader !== config.server.auth) return h.response({ message: 'Unauthorized' }).code(401);
    }
    const k8sConfig = new k8s.KubeConfig();
    k8sConfig.loadFromDefault();
    const k8sApi = k8sConfig.makeApiClient(k8s.CustomObjectsApi);

    await k8sApi.deleteNamespacedSecret('secret', 'namespace');
    return h.response({ status: 'ok' }).code(200);
}
