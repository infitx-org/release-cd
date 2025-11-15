const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const { defineFeature, loadFeature } = require('jest-cucumber');
const rc = require('rc');

const config = rc('portal_test', {
    credentials: {
        anonymous: {}
    }
});

const feature = loadFeature('portal.feature');

defineFeature(feature, test => {
    let users = {};
    let portals = {};

    const parseForm = html => {
        // extract action URL, input and button values from the HTML form
        const action = html
            .match(/<form.*?action="(.*?)"/s)?.[1]
            ?.replace(/&amp;/g, '&')
            ?.replace(/&lt;/g, '<')
            ?.replace(/&gt;/g, '>');
        const method = html.match(/<form.*?method="(.*?)"/s)[1];
        const inputs = html
            .match(/<(?:input|button).*?name="(.*?)".*?value="(.*?)"/gs)
            .reduce((acc, input) => {
                const [, name, value] = input.match(
                    /<(?:input|button).*?name="(.*?)".*?value="(.*?)"/s
                );
                acc[name] = value;
                return acc;
            }, {});
        return { action, method, inputs };
    };

    async function formFlow(portal, user) {
        try {
            const flow = await portal.client.get(portal.loginUrl);
            // submit the form to get to the login page
            const url = new URL(flow.data.ui.action, portal.loginUrl).href;
            const loginForm = await portal.client.request({
                url,
                method: flow.data.ui.method,
                data: flow.data.ui.nodes.reduce((acc, node) => {
                    if (node.attributes && node.attributes.name && node.attributes.value) {
                        acc[node.attributes.name] = node.attributes.value;
                    }
                    return acc;
                }, {}),
                responseType: 'document',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'text/html',
                },
            });
            const login = parseForm(loginForm.data);
            await portal.client.request({
                url: new URL(login.action, url).href,
                method: login.method,
                data: {
                    ...login.inputs,
                    username: user.username,
                    password: user.password,
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'text/html',
                },
            });
            return true;
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    async function oidcFlow(portal, user) {
        try {
            const tokenRequest = await axios.post(
                portal.loginUrl,
                {
                    grant_type: 'client_credentials',
                    client_id: user.username,
                    client_secret: user.password
                },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            )

            portal.token = tokenRequest.data.access_token
            return true;
        } catch (error) {
            throw new Error(`OIDC authentication failed: ${error.message}`);
        }
    }

    const authenticateUser = async (role, portal) => {
        portal = portals[`${role}@${portal}`];
        portal.jar.removeAllCookiesSync();
        portal.token = '';
        const user = Object.values(users).find(u => u.role === role);
        if (!user) throw new Error(`User with role ${role} not found`);
        if (!user.username) return true; // No authentication for anonymous user
        switch (user.flow) {
            case 'form': return formFlow(portal, user)
            case 'oidc': return oidcFlow(portal, user)
            default: throw new Error(`Unsupported flow ${user.flow} for user ${user.username}`)
        }
    };

    function checkEndpointAccess({ given, when, then }) {
        given('credentials for the following roles are configured:', table => {
            table.forEach(row => {
                expect(config.credentials?.[row.role]).toBeDefined();
                users[row.role] = {
                    role: row.role,
                    portal: row.portal,
                    username: config.credentials[row.role]?.username,
                    password: config.credentials[row.role]?.password,
                    flow: row.flow
                };
            });
        });

        given('portal and login URLs for the following portals are configured:', table => {
            table.forEach(row => {
                expect(config.portals[row.portal]?.url).toBeDefined();
                Object.keys(users).forEach(role => {
                    const jar = new CookieJar();
                    portals[`${role}@${row.portal}`] = {
                        url: config.portals[row.portal]?.url,
                        loginUrl: config.portals[row.portal]?.loginUrl,
                        jar,
                        client: wrapper(axios.create({ jar })),
                    };
                });
            });
        });

        given('I am authenticated with the existing roles', async () => {
            for (const [role, { portal }] of Object.entries(users)) {
                expect(await authenticateUser(role, portal)).toBe(true);
            }
        });

        then('check access for the following endpoints:', async table => {
            const observed = [];
            for (const { portal, path: endpoint, method, ...roleStatuses } of table) {
                const observedStatuses = [];
                const expectedStatuses = [];
                for (const role of Object.keys(users)) {
                    if (!roleStatuses[role]) continue; // Skip if no expected status for this role
                    let response;
                    const currentPortal = portals[`${role}@${portal}`];
                    try {
                        response = await currentPortal.client.request({
                            url: `${currentPortal.url}${endpoint}`,
                            method,
                            timeout: 10000,
                            headers: {
                                ...currentPortal.token && { authorization: `Bearer ${currentPortal.token}` }
                            }
                        });
                    } catch (error) {
                        response = error.response ?? { status: error.message };
                    }
                    observedStatuses.push(`${role} ${response?.status}`);
                    expectedStatuses.push(`${role} ${roleStatuses[role]}`);
                }
                observed.push([
                    `${portal} ${method} ${endpoint} | ${observedStatuses.join(' | ')}`,
                    `${portal} ${method} ${endpoint} | ${expectedStatuses.join(' | ')}`
                ]);
            }
            observed.forEach(([obs, exp]) => expect(obs).toBe(exp));
        });
    };

    test('MCM DFSP endpoints', checkEndpointAccess);
    test('MCM DFSPs', checkEndpointAccess);
    test('MCM HUB endpoints', checkEndpointAccess);
    test('MCM Other endpoints', checkEndpointAccess);
    test('MCM-ext DFSP endpoints', checkEndpointAccess);
});
