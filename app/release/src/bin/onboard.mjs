#! /usr/bin/env node
import AdminClient from '@keycloak/keycloak-admin-client';
import axios from 'axios';
import https from 'https';

import config from '../config.mjs';
import { k8sApi, k8sCustom } from '../k8s.mjs';

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
export default async function onboard(dfsp) {
    if (!mcmVS) {
        console.log(new Date(), '... Get MCM virtual service');
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
        console.log(new Date(), '... Get Keycloak admin virtual service');
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
        console.log(new Date(), '... Get onboard client secret from Keycloak');
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
        console.log(new Date(), '... Authenticate to Keycloak');
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

    console.log(new Date(), '... Get MCM access token');
    const access_token = await getAccessToken(onboardClientSecret, config.mcm.realm, baseUrl);

    console.log(new Date(), `... Get ${dfsp} CSR`);
    const { data: csr } = await axios.get(
        new URL(`/api/dfsps/${dfsp}/enrollments/inbound?state=CSR_LOADED`, mcmBaseUrl),
        {
            headers: {
                authorization: `Bearer ${access_token}`
            }
        }
    );

    for (const item of csr || []) {
        console.log(new Date(), `... ${dfsp} CSR:`, item?.id, item?.validationState, item?.state);
        if (item?.state === 'CSR_LOADED') {
            console.log(new Date(), `... Signing ${dfsp} CSR`);
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
    console.log(new Date(), `... Onboarding ${dfsp} `);
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
}

if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
    if (process.argv.length < 3) {
        console.error('Usage: onboard <dfsp>');
        process.exit(1);
    }
    onboard(process.argv[2]).catch(err => {
        console.error('Error in onboard:', err);
        process.exit(1);
    });
}
