#! /usr/bin/env node
import { readFileSync } from 'fs';

import notifyRelease from './release.mjs';
import copyReportToS3 from './s3.mjs';
import notifySlack from './slack.mjs';

export default async function notify({
    report,
    stats
}) {
    const reportUrl = await copyReportToS3(stats.name, report);
    return await Promise.all([
        notifySlack({
            ...stats,
            reportUrl
        }),
        notifyRelease({
            ...stats,
            totalAssertions: stats.total,
            totalPassedAssertions: stats.passed,
            report: reportUrl
        })
    ]);
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
