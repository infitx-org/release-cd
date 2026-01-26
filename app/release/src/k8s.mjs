import * as k8s from '@kubernetes/client-node';

const k8sConfig = new k8s.KubeConfig();
k8sConfig.loadFromDefault();

const watcher = new k8s.Watch(k8sConfig);
const k8sApi = k8sConfig.makeApiClient(k8s.CoreV1Api);
const k8sCustom = k8sConfig.makeApiClient(k8s.CustomObjectsApi);
const k8sBatchApi = k8sConfig.makeApiClient(k8s.BatchV1Api);

export { k8sApi, k8sBatchApi, k8sConfig, k8sCustom, watcher };

