import AWS from 'aws-sdk';
import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';

export default async (testName, reportURL, config) => {
    if (!reportURL) return;
    if ((!config?.s3?.endpoint && !config?.s3?.region) || !config?.bucket?.Bucket || !config?.reportEndpoint) {
        console.warn('S3 configuration is incomplete, skipping report upload');
        return;
    }

    const { accessKeyId, secretAccessKey, ...s3Config } = config.s3 || {};

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
    if (typeof reportURL === 'object') {
        if (typeof reportURL.body !== 'string')
            throw new Error('Report body must be a string when reportURL is an object');
        report = Buffer.from(reportURL.body);
        ContentType = reportURL.contentType || 'text/html';
        ContentLength = report.length;
    } else if (/^https?:\/\//.test(reportURL)) {
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
    const Key = `reports/${config.id || testName}/${new Date().toISOString()}`.toLowerCase().replace(/ /g, '_');
    const params = {
        ...config.bucket,
        Key,
        Body: report,
        ContentType,
        ...ContentLength > 0 && { ContentLength }
    };

    await s3.putObject(params).promise();
    return config.reportEndpoint.replace('{key}', Key);
};
