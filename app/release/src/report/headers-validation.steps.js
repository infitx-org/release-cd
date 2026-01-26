const rc = require('rc');
const { defineFeature, loadFeature } = require('jest-cucumber');
const { expect } = require('@jest/globals');
const { oidcFlow, sendDiscoveryRequest } = require('./testUtils');

const config = rc('portal_test', {
  credentials: {
    anonymous: {}
  }
});

const hubExtApi = 'Hub external API'

const feature = loadFeature(__dirname + './headers-validation.feature');

defineFeature(feature, test => {
  const dfsps = {};
  let tokens;
  let extApi;

  const background = ({ given, when, then }) => {
    given('credentials for OIDC (Keycloak clients) for DFSPs', table => {
      table.forEach(row => {
        const creds = config.credentials?.[row.dfsp] || {}
        expect(creds.username).toBeDefined();
        expect(creds.password).toBeDefined();

        dfsps[row.dfsp] = {
          id: row.dfsp,
          username: creds.username, // or clientId / clientSecret ?
          password: creds.password,
          flow: row.flow
        };
      })
    })

    given('hub external API and OIDC endpoints are configured', () => {
      extApi = config.portals[hubExtApi] || {}
      expect(extApi.url).toBeDefined();
      expect(extApi.loginUrl).toBeDefined();
    })

    when('DFSPs send auth requests to OIDC endpoint with provided credentials', async () => {
      tokens = await Promise.all(
        Object.values(dfsps).map(dfsp => oidcFlow(extApi, dfsp))
      )
    })

    then('all DFSPs get access tokens', () => {
      tokens.map(token => {
        expect(typeof token).toBe('string');
      })
    })
  }

  test('Successful validation of FSPIOP source and proxy headers', ({ given, when, then }) => {
    let responses
    let expectedResults
    let expectedStatusCodes

    background({ given, when, then });

    when('DFSP sends discovery requests with proper access_token and headers:', async (table) => {
      responses = await Promise.all(
        table.map(row => {
          expectedStatusCodes.push(row.statusCode)
          return sendDiscoveryRequest({
            extApiUrl: extApi.url,
            token: tokens[0], // todo: utilize table "token" column,
            source: row.source,
            proxy: row.proxy
          })
        })
      )
      expectedResults = structuredClone(table)
    })

    then('all requests succeed with proper statusCode', () => {
      responses.forEach((res, i) => {
        expect(res.status).toBe(expectedStatusCodes);
        const { token, source, proxy } = expectedResults[i] || {}
        const reqDetails = `${token} | ${source} | ${proxy}`
        expect(`${reqDetails} | ${res.status}`).toBe(`${reqDetails} | ${expectedStatusCodes}`);
      })
    })
  })
})
