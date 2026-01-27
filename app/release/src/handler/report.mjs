import Boom from '@hapi/boom';
import AWS from 'aws-sdk';

import config from '../config.mjs';

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

export default async function report(request, h) {
    // Validate S3 configuration
    if (!config.report?.s3 || !config.report?.bucket?.Bucket) {
        throw Boom.serverUnavailable('S3 configuration is incomplete');
    }

    const { key } = request.params || {};

    if (!key) {
        throw Boom.badRequest('Missing required path parameter: key');
    }

    try {
        const params = {
            Bucket: config.report.bucket.Bucket,
            Key: key
        };

        // First get metadata with headObject (doesn't download content)
        const metadata = await s3.headObject(params).promise();

        // Create a read stream for the object content
        const stream = s3.getObject(params).createReadStream();

        return h.response(stream)
            .type(metadata.ContentType || 'application/octet-stream')
            .header('Content-Length', metadata.ContentLength)
            .header('Last-Modified', metadata.LastModified?.toUTCString())
            .header('ETag', metadata.ETag)
            .code(200);

    } catch (error) {
        if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
            throw Boom.notFound(`Object not found: ${key}`);
        }
        console.error(new Date(), 'Error retrieving S3 object:', error);
        throw Boom.internal('Failed to retrieve object from bucket', error);
    }
}