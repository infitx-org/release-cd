import config from './config.mjs';

export default async function notifyRelease({
    reportId = config.report.id,
    ...summary
}) {
    const { url, reportId } = config.release;
    if (!url || !reportId) return;
    console.log(`Notifying release at ${url} for report ${reportId}`);
    await fetch(url, {
        method: 'POST', body: JSON.stringify({
            [`tests.${reportId}`]: summary
        })
    });
}
