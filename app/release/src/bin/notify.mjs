#! /usr/bin/env node
import { readFileSync } from 'fs';

import notifyRelease from '../release.mjs';
import copyReportToS3 from '../s3.mjs';
import notifySlack from '../slack.mjs';

export default async function notify({
    report,
    summary
}) {
    const reportUrl = await copyReportToS3(summary.name, report);
    return await Promise.all([
        notifySlack({
            ...summary,
            reportUrl
        }),
        notifyRelease({
            totalAssertions: summary.stats?.total,
            totalPassedAssertions: summary.stats?.passed,
            duration: summary.duration,
            allure: summary,
            report: reportUrl
        })
    ]);
}

if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
    notify({
        report: 'allure-report/index.html',
        summary: JSON.parse(readFileSync('allure-report/summary.json'))
    }).catch(err => {
        console.error('Error in notify:', err);
        process.exit(1);
    });
}
