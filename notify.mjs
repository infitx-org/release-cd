import { readFileSync } from 'fs';

import copyReportToS3 from './s3.mjs';
import notifySlack from './slack.mjs';

async function notify({
    report,
    stats
}) {
    return await notifySlack({
        ...stats,
        reportUrl: await copyReportToS3(stats.name, report)
    })
}

if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
    notify({
        report: 'allure-report/index.html',
        stats: JSON.parse(readFileSync('allure-report/summary.json'))
    }).catch(err => {
        console.error('Error in notify:', err);
        process.exit(1);
    });
}
