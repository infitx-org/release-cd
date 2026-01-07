import config from './config.mjs';
import { k8sApi } from './k8s.mjs';

export default async function notifyRelease({
    reportId = config.report.id,
    ...summary
}) {
    const { data: { reportUrl } = {} } = await k8sApi.readNamespacedConfigMap({ name: 'release-cd-jobs', namespace: 'release-cd' });

    if (!reportUrl || !reportId) return;
    console.log(`Notifying release at ${reportUrl} for report ${reportId}`);
    await fetch(
        reportUrl,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: config.server?.auth },
            body: JSON.stringify({ [`tests.${reportId}`]: summary })
        }
    );
}
