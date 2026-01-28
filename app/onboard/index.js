import AdminClient from '@keycloak/keycloak-admin-client';
import * as k8s from '@kubernetes/client-node';
import axios from 'axios';
import http from 'http';
import https from 'https';
import jwt from 'jsonwebtoken';
import util from 'node:util';

import config from './config.js';

if (!config.http.auth) throw new Error('Missing HTTP auth in config');

let resolveHealth;
const waitHealth = new Promise(resolve => resolveHealth = resolve);
axios.defaults.timeout = 15000; // Set default timeout to 15 seconds

function logError(message, error) {
    if (error)
        console.error(message, util.inspect({
            ...error,
            ...error.config && { config: '{...}' },
            ...error.request && {
                request: {
                    host: error.request.host,
                    method: error.request.method,
                    path: error.request.path,
                    protocol: error.request.protocol
                }
            },
            ...error.response && {
                response: {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                }
            }
        }, { depth: 2, colors: true }));
    else
        console.error(message);
}

process.on('SIGINT', () => {
    console.log('Received SIGINT, exiting...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, exiting...');
    process.exit(0);
});

console.log('Connect to kubernetes');
const kubeConfig = new k8s.KubeConfig();
if (config.k8s.loadFromCluster) {
    kubeConfig.loadFromCluster();
} else {
    kubeConfig.loadFromDefault();
}
const k8sClient = k8s.KubernetesObjectApi.makeApiClient(kubeConfig);
const keycloakSecret = await k8sClient.read({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
        name: 'switch-keycloak-initial-admin',
        namespace: 'keycloak'
    }
})

const keycloakAdminVS = await k8sClient.read({
    apiVersion: 'networking.istio.io/v1alpha3',
    kind: 'VirtualService',
    metadata: {
        name: 'keycloak-admin-vs',
        namespace: 'keycloak'
    }
});
if (!keycloakAdminVS) throw new Error('Keycloak admin virtual service not found');

const { keycloak: { baseUrl = 'https://' + keycloakAdminVS.spec.hosts[0], realmName, ...auth }, mcm: { realm }, dfsps } = config;
const { env, suffix } = config.env?.match?.(/^(?<env>\w+)(?<suffix>-.*|\w{3})$/)?.groups || {};
if (!env || !suffix) throw new Error('Unexpected env: ' + config.env);

let keycloak;
let server;
const contentType = { 'Content-Type': 'application/json' }

if (dfsps[env]?.length) {
    console.log('Connect to keycloak');
    keycloak = new AdminClient({
        baseUrl,
        realmName,
        requestOptions: {
            agent: new https.Agent({
                requestCert: true,
                rejectUnauthorized: false
            })
        }
    });

    async function getKeycloakSecrets() {
        await keycloak.auth({
            username: Buffer.from(keycloakSecret.data.username, 'base64').toString('utf-8'),
            password: Buffer.from(keycloakSecret.data.password, 'base64').toString('utf-8'),
            ...auth
        });
        return (await keycloak.clients.find({ realm: 'dfsps' })).reduce((secrets, client) =>
            client.secret ? { ...secrets, [client.clientId]: client.secret } : secrets
            , {});
    }

    server = http.createServer(async (req, res) => {
        if (req.method === 'GET' && req.url === '/secrets') {
            try {
                // check access token
                const authHeader = req.headers['authorization'];
                if (authHeader !== config.http.auth) {
                    res.writeHead(401, contentType);
                    res.end(JSON.stringify({ error: 'Unauthorized' }));
                    return;
                }
                const secrets = await getKeycloakSecrets();
                res.writeHead(200, contentType);
                res.end(JSON.stringify(secrets));
                console.log('GET /secrets:', Object.keys(secrets));
            } catch (error) {
                logError('Error fetching secrets:', error);
                res.writeHead(500, contentType);
                res.end(JSON.stringify({ error: 'Failed to fetch secrets' }));
            }
        } else if (req.url === '/health') {
            res.writeHead(200, contentType);
            res.end(JSON.stringify({ status: 'ok' }));
            setTimeout(resolveHealth, 5000);
            return;
        } else {
            console.error('Invalid request:', req.method, req.url);
            res.writeHead(404, contentType);
            res.end(JSON.stringify({ error: 'Not Found' }));
        }
    });
} else {
    // create a dummy server to keep the process alive
    server = http.createServer((req, res) => {
        if (req.url === '/health') {
            res.writeHead(200, contentType);
            res.end(JSON.stringify({ status: 'ok' }));
            setTimeout(resolveHealth, 5000);
            return;
        } else {
            console.error('Invalid request:', req.method, req.url);
            res.writeHead(404, contentType);
            res.end(JSON.stringify({ error: 'Not Found' }));
        }
    });
}

server.listen(config.http.port, '0.0.0.0', () => {
    console.log(`Server is running on http://${server.address().address}:${server.address().port}`);
});

server.on('error', (error) => {
    logError('Server error:', error);
    process.exit(1);
});

async function getAccessToken(client_secret) {
    return (await axios.post(new URL(`/realms/${realm}/protocol/openid-connect/token`, baseUrl), {
        client_id: 'onboard',
        client_secret,
        grant_type: 'client_credentials'
    }, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })).data.access_token;
}

async function onboardLoop(access_token, secret) {
    const remaining = new Set(dfsps[env]);
    const all = Array.from(remaining);

    console.log('Get MCM virtual service');
    const mcmVS = await k8sClient.read({
        apiVersion: 'networking.istio.io/v1alpha3',
        kind: 'VirtualService',
        metadata: {
            name: 'mcm-vs',
            namespace: 'mcm'
        }
    });
    if (!mcmVS) throw new Error('MCM virtual service not found');
    const mcmBaseUrl = 'https://' + mcmVS.spec.hosts[0];

    const start = Date.now();
    const onboarded = [];
    let result;
    while (true) {
        console.log('Processing DFSPs:', Array.from(remaining).join(','));
        for (const dfsp of all) {
            try {
                console.log(`Get ${dfsp} CSR`);
                const { data: csr } = await axios.get(
                    new URL(`/api/dfsps/${dfsp}/enrollments/inbound?state=CSR_LOADED`, mcmBaseUrl),
                    {
                        headers: {
                            authorization: `Bearer ${access_token}`
                        }
                    }
                );

                for (const item of csr || []) {
                    console.log(`${dfsp} CSR:`, item?.id, item?.validationState, item?.state);
                    if (item?.state === 'CSR_LOADED') {
                        console.log(`Signing ${dfsp} CSR`);
                        await axios.post(
                            new URL(`/api/dfsps/${dfsp}/enrollments/inbound/${item?.id}/sign`, mcmBaseUrl),
                            {},
                            {
                                headers: {
                                    contentType: 'application/json',
                                    authorization: `Bearer ${access_token}`
                                }
                            }
                        );
                    }
                }
                if (csr?.some(item => 'CSR_LOADED' === item?.state)) {
                    console.log(`Onboarding ${dfsp} `);
                    await axios.post(
                        new URL(`/api/dfsps/${dfsp}/onboard`, mcmBaseUrl),
                        {},
                        {
                            headers: {
                                contentType: 'application/json',
                                authorization: `Bearer ${access_token}`
                            }
                        }
                    );
                    remaining.delete(dfsp);
                    onboarded.push(dfsp);
                }
            } catch (error) {
                logError(`Error processing ${dfsp} CSRs:`, error);
            }
        }
        if (remaining.size === 0) {
            console.log('All DFSP onboardings are triggered');
            result = [onboarded, false];
            break;
        }
        if (Date.now() - start > 60 * 60 * 1000) {
            console.log('Timeout reached');
            result = [onboarded, true];
            break;
        }
        console.log('Waiting for ' + config.retryIntervalSeconds + ' seconds before checking again');
        await new Promise(resolve => setTimeout(resolve, config.retryIntervalSeconds * 1000));
        console.log('Get new token');
        access_token = await getAccessToken(secret);
    }
    return result;
}

async function onboard() {
    if (!dfsps[env]?.length) {
        console.log('No DFSPs to onboard');
        return [];
    }

    await keycloak.auth({
        username: Buffer.from(keycloakSecret.data.username, 'base64').toString('utf-8'),
        password: Buffer.from(keycloakSecret.data.password, 'base64').toString('utf-8'),
        ...auth
    });
    console.log('Create the onboard client if it doesn\'t exist');
    let [result] = await keycloak.clients.findOne({ realm, clientId: 'onboard' })
    if (!result) {
        result = await keycloak.clients.create({
            realm,
            enabled: true,
            clientId: 'onboard',
            name: 'Onboarding',
            clientAuthenticatorType: 'client-secret',
            serviceAccountsEnabled: true
        });
        [result] = await keycloak.clients.findOne({ realm, clientId: 'onboard' })
    }

    console.log('Get access token');
    const accessToken = await getAccessToken(result.secret);

    console.log('Add the mcmadmin role to the onboard client');
    await axios.post(config.rbac.url, {
        username: jwt.decode(accessToken).sub,
        roles: ['mcmadmin']
    });
    return await onboardLoop(accessToken, result.secret);
}

class RetryError extends Error {
    constructor(message) {
        super(message);
        this.retry = true;
    }
}

async function getSecrets(url) {
    try {
        const response = await axios.get(url, {
            headers: { authorization: config.http.auth },
            validateStatus: () => true // We'll handle status codes manually
        });
        if (response.status !== 200) {
            throw new RetryError(`Failed to fetch secrets from ${url}: HTTP ${response.status}`);
        }
        return response.data;
    } catch (error) {
        if (error instanceof RetryError) throw error;
        if (error.response) {
            throw new RetryError(`Failed to fetch secrets from ${url}: HTTP ${error.response.status}`);
        } else if (error.code === 'ECONNABORTED') {
            throw new RetryError('Request timeout');
        } else if (error instanceof SyntaxError) {
            throw new RetryError(`Failed to parse response data: ${error.message}`);
        } else {
            logError('Request error:', error);
            return {};
        }
    }
}

async function secrets() {
    if (!config.secrets[env]) {
        console.log('No secrets to push for env: ' + env);
        return [];
    }

    const secretsData = {};
    const pushData = [];
    let retry = true;

    for (const [url, map] of Object.entries(config.secrets[env])) {
        const secrets = await getSecrets(url.replace('${suffix}', suffix))
        if (Object.keys(map).every(key => secrets[key])) retry = false;
        Object.assign(secretsData, Object.fromEntries(
            Object.entries(secrets)
                .filter(([key]) => map[key])
                .map(([key, value]) => [map[key].replace('${suffix}', suffix).replace(/\//g, '.'), Buffer.from(JSON.stringify({ value })).toString('base64')])
        ));
        pushData.push(...Object.keys(secrets)
            .filter(key => map[key])
            .map(key => ({
                match: {
                    secretKey: map[key].replace('${suffix}', suffix).replace(/\//g, '.'),
                    remoteRef: {
                        remoteKey: map[key].replace('${suffix}', suffix)
                    }
                }
            }))
        );
    }

    if (!Object.keys(secretsData).length) throw new Error('No secrets found');

    console.log('Got secrets: ', Object.keys(secretsData));

    // create secret in kubernetes
    try {
        await k8sClient.list('v1', 'Secret', 'onboard')
        await k8sClient.delete({
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name: 'onboard',
                namespace: 'onboard'
            }
        });
    } catch (error) {
        if (error.code !== 404) throw error;
    }
    await k8sClient.create({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
            name: 'onboard',
            namespace: 'onboard'
        },
        type: 'Opaque',
        data: secretsData
    });

    // create push secret in kubernetes
    try {
        await k8sClient.list('external-secrets.io/v1alpha1', 'PushSecret', 'onboard')
        await k8sClient.delete({
            apiVersion: 'external-secrets.io/v1alpha1',
            kind: 'PushSecret',
            metadata: {
                name: 'onboard',
                namespace: 'onboard'
            }
        });
    } catch (error) {
        if (error.code !== 404) throw error;
    }

    await k8sClient.create({
        apiVersion: 'external-secrets.io/v1alpha1',
        kind: 'PushSecret',
        metadata: {
            name: 'onboard',
            namespace: 'onboard'
        },
        spec: {
            updatePolicy: 'Replace',
            refreshInterval: '1h',
            secretStoreRefs: [{
                name: 'tenant-vault-secret-store',
                kind: 'ClusterSecretStore'
            }],
            selector: {
                secret: {
                    name: 'onboard'
                }
            },
            data: pushData
        }
    });
    return [Object.keys(secretsData), retry];
}

function tryPushSecrets() {
    secrets().then(([secrets, retry]) => {
        secrets && console.log('Secrets pushed to vault:', secrets);
        if (retry === undefined) return;
        if (retry) {
            console.log('Retrying secrets in ' + (config.retryIntervalSeconds) + ' seconds...');
            setTimeout(tryPushSecrets, config.retryIntervalSeconds * 1000);
        } else {
            console.log('Refreshing secrets in ' + (config.refreshIntervalSeconds) + ' seconds...');
            setTimeout(tryPushSecrets, config.refreshIntervalSeconds * 1000);
        }
    }).catch((error) => {
        logError('Error pushing secrets:', error);
        if (error.retry) {
            console.log('Retrying secrets in ' + (config.retryIntervalSeconds) + ' seconds...');
            setTimeout(tryPushSecrets, config.retryIntervalSeconds * 1000);
        } else process.exit(1);
    });
}

function tryOnboard() {
    onboard().then(([dfsps, retry]) => {
        dfsps && console.log('Onboarding completed for:', dfsps);
        if (retry === undefined) return;
        if (retry) {
            console.log('Retrying onboarding in ' + (config.retryIntervalSeconds) + ' seconds...');
            setTimeout(tryOnboard, config.retryIntervalSeconds * 1000);
        } else {
            console.log('Refreshing onboarding in ' + (config.refreshIntervalSeconds) + ' seconds...');
            setTimeout(tryOnboard, config.refreshIntervalSeconds * 1000);
        }
    }).catch((error) => {
        logError('Error during onboarding:', error);
        if (error.retry) {
            console.log('Retrying onboarding in ' + (config.retryIntervalSeconds) + ' seconds...');
            setTimeout(tryOnboard, config.retryIntervalSeconds * 1000);
        } else process.exit(1);
    });
}

waitHealth.then(() => {
    tryPushSecrets();
    tryOnboard();
});
