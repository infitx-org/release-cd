import { IncomingWebhook } from '@slack/webhook';

import config from './config.mjs';

const millisecondsToTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export default async function notifySlack(message) {
    if (!config.slack.url) return;
    try {
        const webhook = new IncomingWebhook(config.slack.url);
        if (typeof message === 'string') message = { text: message }
        if (typeof message === 'object') {
            const {
                name = config.report.name || 'Test',
                prefix = config.slack.prefix || '',
                stats,
                duration,
                reportUrl,
                top5FailedTestCases = {},
                traceUrl
            } = message;

            message = {
                text: name,
                blocks: [{
                    type: 'rich_text',
                    elements: [{
                        type: 'rich_text_section',
                        elements: [
                            { type: 'text', text: `${stats.total === stats.passed ? '✅' : '⚠️'}${prefix} ` },
                            reportUrl ? { type: 'link', url: reportUrl, text: name } : { type: 'text', text: name },
                            { type: 'text', text: ', failed: ' },
                            { type: 'text', text: `${stats.failed}/${stats.total}(${(100 * (stats.failed / stats.total)).toFixed(2)}%)`, style: { code: true } },
                            { type: 'text', text: ', duration: ' },
                            { type: 'text', text: millisecondsToTime(duration), style: { code: true } },
                            top5FailedTestCases.length > 0 && { type: 'text', text: ', top 5 failed test cases:' },
                            traceUrl && { type: 'link', url: traceUrl, text: ' trace' }
                        ].filter(Boolean)
                    }, ...(top5FailedTestCases.length > 0
                        ? [{
                            type: 'rich_text_list',
                            style: 'bullet',
                            elements: top5FailedTestCases.map(tc => ({
                                type: 'rich_text_section',
                                elements: [{ type: 'text', text: `${tc.name}: ${tc.failed}` }]
                            }))
                        }]
                        : []
                    )]
                }]
            }
        }
        await webhook.send(message);
    } catch (error) {
        console.error(`Error sending Slack notification: ${error.message}`);
    }
}
