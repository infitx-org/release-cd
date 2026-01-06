#! /usr/bin/env node
import Hapi from '@hapi/hapi';

import config from './config.mjs';
import app from './handler/app.mjs';
import keyRotate from './handler/keyRotate.mjs';
import notify from './handler/notify.mjs';
import reonboard from './handler/reonboard.mjs';
import { cdRevisionGet } from './handler/revision.mjs';
import triggerCronJob from './handler/triggerJob.mjs';

const init = async () => {
    const server = Hapi.server({
        port: config.server.port,
        host: config.server.host
    });

    if (config.github?.token) {
        const { default: initCd } = await import('./handler/cd.mjs');
        await initCd(server);
    }

    server.events.on({ name: 'request', channels: 'app' }, (request, event, tags) => {
        if (tags.error) {
            console.error(new Date(), `=> ${request.method.toUpperCase()} ${request.path} ${event.error?.output?.statusCode}`, event.error ?? 'unknown');
        } else {
            console.log(new Date(), event.data);
        }
    });

    server.ext('onRequest', (request, h) => {
        if (request.path === '/health') return h.continue;
        request.log(['info'], `=> ${request.method.toUpperCase()} ${request.path}`);
        return h.continue;
    });

    server.ext('onPreResponse', (request, h) => {
        if (request.path === '/health') return h.continue;
        const response = request.response;
        if (response.isBoom) {
            request.log(['error'], response);
        } else {
            request.log(['info'], `<= ${request.method.toUpperCase()} ${request.path} ${response.statusCode} ${JSON.stringify(response.source)}`);
        }
        return h.continue;
    });


    server.route({
        method: 'POST',
        path: '/keyRotate/{key}',
        handler: keyRotate
    });

    server.route({
        method: 'POST',
        path: '/triggerCronJob/{namespace}/{job}',
        handler: triggerCronJob
    });

    server.route({
        method: 'GET',
        path: '/health',
        handler: (request, h) => {
            return h.response({ status: 'ok' }).code(200);
        }
    });

    server.route({
        method: 'POST',
        path: '/notify',
        handler: notify
    });

    server.route({
        method: 'POST',
        path: '/reonboard',
        handler: reonboard
    });

    server.route({
        method: 'GET',
        path: '/app',
        handler: app
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: cdRevisionGet
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
