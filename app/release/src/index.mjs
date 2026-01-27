#! /usr/bin/env node
import basic from '@hapi/basic';
import Boom from '@hapi/boom';
import Hapi from '@hapi/hapi';
import restFsPlugin from '@infitx/rest-fs';
import path from 'path';

import config from './config.mjs';
import app from './handler/app.mjs';
import getDfspState from './handler/getDfspState.mjs';
import keyRotate from './handler/keyRotate.mjs';
import keyRotateDFSP from './handler/keyRotateDFSP.mjs';
import notify from './handler/notify.mjs';
import offboard from './handler/offboard.mjs';
import onboard from './handler/onboard.mjs';
import ping from './handler/ping.mjs';
import reonboard from './handler/reonboard.mjs';
import report from './handler/report.mjs';
import { cdRevisionGet } from './handler/revision.mjs';
import triggerCronJob from './handler/triggerJob.mjs';

const init = async () => {
    const server = Hapi.server({
        port: config.server.port,
        host: config.server.host
    });
    const masked = ['/app', '/', '/report/{key*}'];

    server.auth.scheme('authorization-header', () => {
        return {
            authenticate: (request, h) => {
                const authHeader = request.headers['authorization'];
                if (authHeader === config.server.auth && authHeader) {
                    return h.authenticated({ credentials: {} });
                }
                throw Boom.unauthorized('Unauthorized');
            }
        };
    });
    server.auth.strategy('service', 'authorization-header');
    await server.register(basic);
    server.auth.strategy('report', 'basic', {
        validate: (request, username, password) => (username === 'admin' && password === config.server.auth) ? {
            isValid: true,
            credentials: { user: username }
        } : { isValid: false }
    });

    if (config.github?.token) {
        const { default: initCd } = await import('./handler/cd.mjs');
        await initCd(server);
    }

    server.events.on({ name: 'request', channels: 'app' }, (request, event, tags) => {
        if (tags.error) {
            console.error(new Date(), `▶ ${request.method.toUpperCase()} ${request.path} ${event.error?.output?.statusCode}`, event.error ?? 'unknown');
        } else {
            console.log(new Date(), event.data);
        }
    });

    server.ext('onRequest', (request, h) => {
        if (request.path === '/health' || request.path.startsWith('/rest-fs/')) return h.continue;
        request.log(['info'], `▶ ${request.method.toUpperCase()} ${request.path}`);
        return h.continue;
    });

    server.ext('onPreResponse', (request, h) => {
        if (request.path === '/health' || request.path.startsWith('/rest-fs/')) return h.continue;
        const response = request.response;
        if (response.isBoom) {
            request.log(['error'], response);
        } else {
            request.log(['info'], `◀ ${request.method.toUpperCase()} ${request.path} ${response.statusCode} ${masked.includes(request.route.path) ? '[body]' : JSON.stringify(response.source)}`);
        }
        return h.continue;
    });

    // Register the REST filesystem plugin
    await server.register({
        plugin: restFsPlugin,
        options: {
            options: config.server.fs,
            baseDir: path.resolve('.'),
            routePrefix: '/rest-fs',
            maxFileSize: 52428800 // 50MB
        }
    });

    server.route({
        options: config.server.post,
        method: 'POST',
        path: '/keyRotate/{key}',
        handler: keyRotate
    });

    server.route({
        options: config.server.post,
        method: 'POST',
        path: '/keyRotateDFSP/{key}',
        handler: keyRotateDFSP
    });

    server.route({
        options: config.server.post,
        method: 'POST',
        path: '/triggerCronJob/{namespace}/{job}',
        handler: triggerCronJob
    });

    server.route({
        // options: config.server.post,
        method: 'GET',
        path: '/dfsp/{id}/state',
        handler: async (request, h) => {
            const { id } = request.params
            const result = await getDfspState(id)
            return h.response(result);
        }
    });

    server.route({
        options: config.server.get,
        method: 'GET',
        path: '/health',
        handler: (request, h) => {
            return h.response({ status: 'ok' }).code(200);
        }
    });

    server.route({
        options: config.server.post,
        method: 'POST',
        path: '/notify',
        handler: notify
    });

    server.route({
        options: config.server.post,
        method: 'POST',
        path: '/reonboard/{key?}',
        handler: reonboard
    });

    server.route({
        options: config.server.get,
        method: 'GET',
        path: '/app',
        handler: app
    });

    server.route({
        options: { auth: 'report' },
        method: 'GET',
        path: '/report/{key*}',
        handler: report
    });

    server.route({
        options: config.server.post,
        method: 'POST',
        path: '/onboard/{dfsp}',
        handler: onboard
    });

    server.route({
        options: config.server.post,
        method: 'POST',
        path: '/offboard/{dfsp}',
        handler: offboard
    });

    server.route({
        options: config.server.post,
        method: 'POST',
        path: '/ping/{dfsp}',
        handler: ping
    });

    if (config.github?.token) {
        server.route({
            options: config.server.get,
            method: 'GET',
            path: '/',
            handler: cdRevisionGet
        });
    }

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, exiting...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, exiting...');
    process.exit(0);
});

init();
