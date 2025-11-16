import AWS from 'aws-sdk';
import { createReadStream } from 'fs';

import config from './config.mjs';

export default async (testName, reportURL) => {
    if (!reportURL) return;
    if ((!config.report?.s3?.endpoint && !config.report?.region) || !config.report?.s3?.bucket || !config.report?.reportEndpoint) {
        console.warn('S3 configuration is incomplete, skipping report upload');
        return;
    }

    const { bucket, accessKeyId, secretAccessKey, ...s3Config } = config.report.s3 || {};

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
    if (/^https?:\/\//.test(reportURL)) {
        try {
            report = await fetch(reportURL);
            ContentType = report.headers.get('content-type')
            report = report.body;
        } catch (error) {
            console.error(`Error fetching report from ${reportURL}: ${error.message}`);
            throw error;
        }
    } else {
        report = createReadStream(reportURL);
        ContentType = 'text/html';
    }
    const Key = `reports/${testName}/${new Date().toISOString()}`.toLowerCase().replace(/ /g, '_');
    const params = {
        Bucket: bucket,
        Key,
        Body: report,
        ContentType,
        ACL: 'public-read'
    };

    await s3.putObject(params).promise();
    return config.report.reportEndpoint.replace('{key}', Key);
};
