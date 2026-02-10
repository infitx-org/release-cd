import config from './config.mjs';
import { k8sApi } from './k8s.mjs';
import copyReportToS3 from './s3.mjs';

export default async function notifyRelease({
    reportId = config.report.id,
    ...summary
}) {
    const { data: { reportUrl } = {} } = await k8sApi.readNamespacedConfigMap({ name: 'release-cd-jobs', namespace: 'release-cd' });

    if (!reportUrl || !reportId) return;
    console.log(new Date(), `... Notifying release at ${reportUrl} for report ${reportId}`);
    if (summary.report && typeof summary.report === 'object' && summary.report.body) {
        summary.report = await copyReportToS3(reportId, summary.report, config.release.report);
    }
    summary.lastModified = new Date().toISOString()
    await fetch(
        reportUrl,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: config.server?.auth },
            body: JSON.stringify({ [`tests.${reportId}`]: summary })
        }
    );
}
