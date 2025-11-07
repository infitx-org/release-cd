const axios = require('axios');
const {CookieJar} = require('tough-cookie');
const {wrapper} = require('axios-cookiejar-support');
const {defineFeature, loadFeature} = require('jest-cucumber');
const rc = require('rc');

const config = rc('portal_test', {
    credentials: {
        anonymous: {}
    }
});

const jar = new CookieJar();
const client = wrapper(axios.create({jar}));
const feature = loadFeature('portal.feature');

defineFeature(feature, test => {
    let users = {};
    let endpoints = {};
    let portals = {};
    let currentUser = null;
    let response = null;
    let baseURL = '';
    let loginURL = '';
    let currentRole = '';

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
        return {action, method, inputs};
    };

    const authenticateUser = async (role, portal) => {
        if (currentRole === role && baseURL === portals[portal].url) return true; // Reuse existing session if role hasn't changed
        jar.removeAllCookiesSync();
        currentRole = '';
        baseURL = '';
        const user = Object.values(users).find(u => u.role === role);
        if (!user) {
            throw new Error(`User with role ${role} not found`);
        }
        if (!user.username) {
            currentRole = role;
            baseURL = portals[portal].url;
            return true; // No authentication for anonymous user
        }
        try {
            const flow = await client.get(`${loginURL}${portals[portal].url}`);
            // submit the form to get to the login page
            const url = new URL(flow.data.ui.action, loginURL).href;
            const loginForm = await client.request({
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
            const authResponse = await client.request({
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
            currentRole = role;
            baseURL = portals[portal].url;
            return true;
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    };

    test('"<role>" access to MCM endpoint "<endpoint_name>"', ({given, when, then}) => {
        given('the following roles exist:', table => {
            table.forEach(row => {
                users[row.role] = {
                    role: row.role,
                    username: config.credentials[row.role]?.username,
                    password: config.credentials[row.role]?.password,
                };
            });
        });

        given(/the login URL is configured/, () => {
            loginURL = config.loginUrl;
            expect(loginURL).toBeDefined();
        });

        given('the portals URLs are configured', () => {
            portals = config.portals;
            expect(Object.keys(portals || {}).length).toBeGreaterThan(0);
        });

        given('the following API endpoints are available:', table => {
            table.forEach(row => {
                endpoints[row.endpoint] = row;
            });
        });

        given(/^I am authenticated as "(.*)" at portal "(.*)"$/, async (role, portal) => {
            authenticated = await authenticateUser(role, portal);
            currentUser = Object.values(users).find(u => u.role === role);
            expect(authenticated).toBe(true);
        });

        when(/^I send a request to "(.*)"$/, async endpointName => {
            const endpoint = endpoints[endpointName].path;
            expect(endpoint).toBeDefined();

            try {
                response = await client.request({
                    url: `${baseURL}${endpoint}`,
                    method: endpoints[endpointName].method,
                });
            } catch (error) {
                response = error.response;
            }
        });

        then(/^I should receive a "(.*)" response for "(.*)"$/, (expectedStatus, endpointName) => {
            expect(response).toBeDefined();
            expect(response.status).toBe(parseInt(expectedStatus));
        });
    });
});
