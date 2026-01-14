import AWS from 'aws-sdk';
import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';

import config from './config.mjs';

export default async (testName, reportURL) => {
    if (!reportURL) return;
    if ((!config.report?.s3?.endpoint && !config.report?.s3?.region) || !config.report?.bucket?.Bucket || !config.report?.reportEndpoint) {
        console.warn('S3 configuration is incomplete, skipping report upload');
        return;
    }

    const { accessKeyId, secretAccessKey, ...s3Config } = config.report.s3 || {};

    const s3 = new AWS.S3({
        ...s3Config,
        ...accessKeyId && {
            credentials: new AWS.Credentials({
                accessKeyId,
                secretAccessKey
            })
        }
    });

    let report;
    let ContentType
    let ContentLength
    if (/^https?:\/\//.test(reportURL)) {
        try {
            report = await fetch(reportURL);
            ContentType = report.headers.get('content-type')
            ContentLength = Number(report.headers.get('content-length'));
            report = ContentLength > 0 ? Readable.fromWeb(report.body) : Buffer.from(await report.arrayBuffer());
        } catch (error) {
            console.error(`Error fetching report from ${reportURL}: ${error.message}`);
            throw error;
        }
    } else {
        ContentLength = statSync(reportURL).size;
        report = createReadStream(reportURL);
        ContentType = 'text/html';
    }
    const Key = `reports/${config.report.id || testName}/${new Date().toISOString()}`.toLowerCase().replace(/ /g, '_');
    const params = {
        ...config.report.bucket,
        Key,
        Body: report,
        ContentType,
        ...ContentLength > 0 && { ContentLength }
    };

    await s3.putObject(params).promise();
    return config.report.reportEndpoint.replace('{key}', Key);
};
