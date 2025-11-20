import config from './config.mjs';

export default async function notifyRelease({
    reportId = config.report.id,
    ...summary
}) {
    const { url } = config.release;
    if (!url || !reportId) return;
    console.log(`Notifying release at ${url} for report ${reportId}`);
    await fetch(
        url,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [`tests.${reportId}`]: summary })
        }
    );
}
