#! /usr/bin/env node
import AdminClient from '@keycloak/keycloak-admin-client';
import axios from 'axios';
import https from 'https';

import config from '../config.mjs';
import pingDFSP from '../fn/ping.mjs';
import { k8sApi, k8sBatchApi, k8sCustom } from '../k8s.mjs';
import notifyRelease from '../release.mjs';

axios.defaults.timeout = 60000; // Set default timeout to 60 seconds
const onboardClientId = 'onboard';

async function getAccessToken(client_secret, realm, baseUrl) {
    return (await axios.post(new URL(`/realms/${realm}/protocol/openid-connect/token`, baseUrl), {
        client_id: onboardClientId,
        client_secret,
        grant_type: 'client_credentials'
    }, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })).data.access_token;
}

let mcmVS = null;
let keycloakAdminVS = null;
let onboardClientSecret = null;

// this function will sign any pending CSRs and onboard the DFSP
export default async function onboard(dfsp, pingTimeout) {
    const startTime = Date.now();
    const result = [];
    const log = string => {
        console.log(new Date(), '... ' + string);
        result.push(string);
    }
    try {
        if (!mcmVS) {
            log('Get MCM virtual service');
            mcmVS = await k8sCustom.getNamespacedCustomObject({
                apiVersion: 'networking.istio.io/v1alpha3',
                group: 'networking.istio.io',
                version: 'v1alpha3',
                namespace: 'mcm',
                plural: 'virtualservices',
                name: 'mcm-vs'
            });
            if (!mcmVS) throw new Error('MCM virtual service not found');
        }
        const mcmBaseUrl = 'https://' + mcmVS.spec.hosts[0];

        if (!keycloakAdminVS) {
            log('Get Keycloak admin virtual service');
            keycloakAdminVS = await k8sCustom.getNamespacedCustomObject({
                group: 'networking.istio.io',
                version: 'v1alpha3',
                namespace: 'keycloak',
                plural: 'virtualservices',
                name: 'keycloak-admin-vs'
            });
            if (!keycloakAdminVS) throw new Error('Keycloak admin virtual service not found');
        }

        const baseUrl = 'https://' + keycloakAdminVS.spec.hosts[0]
        if (!onboardClientSecret) {
            log('Get onboard client secret from Keycloak');
            const keycloakSecret = await k8sApi.readNamespacedSecret({
                name: 'switch-keycloak-initial-admin',
                namespace: 'keycloak'
            })
            const keycloak = new AdminClient({
                baseUrl,
                realmName: config.keycloak.realm,
                requestOptions: {
                    agent: new https.Agent({
                        requestCert: true,
                        rejectUnauthorized: false
                    })
                }
            });
            log('Authenticate to Keycloak');
            await keycloak.auth({
                username: Buffer.from(keycloakSecret.data.username, 'base64').toString('utf-8'),
                password: Buffer.from(keycloakSecret.data.password, 'base64').toString('utf-8'),
                grantType: 'password',
                clientId: 'admin-cli'
            });
            const found = await keycloak.clients.findOne({ realm: config.mcm.realm, clientId: onboardClientId });
            if (!found) throw new Error(`Client onboard not found in realm ${config.mcm.realm}`);
            onboardClientSecret = found[0].secret;
        }

        log('Get MCM access token');
        const access_token = await getAccessToken(onboardClientSecret, config.mcm.realm, baseUrl);

        log(`Get ${dfsp} CSR`);
        const { data: csr } = await axios.get(
            new URL(`/api/dfsps/${dfsp}/enrollments/inbound?state=CSR_LOADED`, mcmBaseUrl),
            {
                headers: {
                    authorization: `Bearer ${access_token}`
                }
            }
        );

        for (const item of csr || []) {
            log(`${dfsp} CSR:`, item?.id, item?.validationState, item?.state);
            if (item?.state === 'CSR_LOADED') {
                log(`Signing ${dfsp} CSR`);
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

        log(`Delete onboard job ${dfsp}-onboard-dfsp if exists`);
        await k8sBatchApi.deleteNamespacedJob({
            name: `${dfsp}-onboard-dfsp`,
            namespace: 'mojaloop'
        }).catch(err => {
            if (err.code !== 404) throw err;
        });

        log(`Onboarding ${dfsp} `);
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

        log(`Pinging ${dfsp} to verify onboarding`);
        log(`${await pingDFSP(dfsp, pingTimeout)}`);

        notifyRelease({
            reportId: 'onboard-' + dfsp,
            totalAssertions: 1,
            totalPassedAssertions: 1,
            isPassed: true,
            duration: Date.now() - startTime,
            report: {
                body: result.join('\n'),
                contentType: 'text/plain'
            }
        }).catch(err => {
            console.error(new Date(), 'Error notifying release:', err);
        });

        return result.join('\n');
    } catch (error) {
        notifyRelease({
            reportId: 'onboard-' + dfsp,
            totalAssertions: 1,
            totalPassedAssertions: 0,
            isPassed: false,
            duration: Date.now() - startTime,
            report: {
                body: result.join('\n') + '\n\nError: ' + error.message,
                contentType: 'text/plain'
            }
        }).catch(err => {
            console.error(new Date(), 'Error notifying release:', err);
        });
        throw error;
    }
}

if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
    if (process.argv.length < 3) {
        console.error(new Date(), 'Usage: onboard <dfsp>');
        process.exit(1);
    }
    onboard(process.argv[2]).catch(err => {
        console.error(new Date(), 'Error in onboard:', err);
        process.exit(1);
    });
}
