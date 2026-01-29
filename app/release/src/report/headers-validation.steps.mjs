import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import rc from 'rc';
import { defineFeature, loadFeature } from 'jest-cucumber';

import { releaseCdClient } from '../apiClients/releaseCdClient.mjs';
import {
  oidcFlow,
  padEnd,
  sendDiscoveryRequest,
  sendQuotesRequests,
} from './test.utils.mjs';
import * as fixtures from './fixtures.mjs';
import allureUtils from './allure.utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = rc('portal_test', {
  credentials: {
    anonymous: {}
  }
});

const DFSP_ROLES_CREDS = Object.freeze({
  alice: config.credentials['test_fxp2'], // make it configurable?
  /**
   npm/npx and "node --run ..." filter out environment variables with hyphens in key names.
   So if credential for test-fxp2 is stored as:
   portal_test_credentials__test-fxp2__password=...
   this env var will be sanitized and removed as having non-POSIX compliant characters (hyphens)
   */
  bob: config.credentials.bob,
})
const getCredsForRole = (role) => DFSP_ROLES_CREDS[role] || {}

/** assume username (Keycloak clientId) should be the same as dfspId (dfspName) */
const mapDfspId = (role) => getCredsForRole(role)?.username || role

const feature = loadFeature(__dirname + '/headers-validation.feature');


defineFeature(feature, test => {
  const extApiPortal = Object.freeze(config.portals?.['Hub external API'] || {})
  let DFSPs = {};
  let tls; // for alice

  const getToken = (role) => (DFSPs[role]?.token || '')

  /** @type {Array<DfspAccessToken>} */
  let dfspTokens = []

  const createDfspConfig = (row) => {
    const creds = getCredsForRole(row.id)
    expect(creds.username).toBeDefined();
    expect(creds.password).toBeDefined();

    return {
      id: row.id, // rename to role? (alice/bob, dfsp1/dfsp2 ...)
      username: creds.username, // or clientId / clientSecret ?
      password: creds.password,
      flow: row.flow,
      token: '' // will be populated after auth request is made
    }
  }

  beforeAll(async () => {
    allureUtils.withTags(feature.tags)

    const { status, data } = await releaseCdClient.getDfspState(mapDfspId('alice')) // get it from config?
    expect(status).toBe(200)
    expect(data).toBeDefined()

    tls = data?.state?.outboundTLS
  })

  const backgroundGetAccessTokens = ({ given, when, then }) => {
    DFSPs = {};

    given('hub external API portal endpoints are configured', () => {
      const { url, loginUrl } = extApiPortal || {}
      allureUtils.withAttachmentJSON('Hub external API portal URLs:', { url, loginUrl })
      expect(url).toBeDefined();
      expect(loginUrl).toBeDefined();
    })

    given('credentials for OIDC (Keycloak) clients for DFSPs provided', table => {
      table.forEach(row => {
        DFSPs[row.id] = createDfspConfig(row)
      })
    })

    given('each DFSP has valid access token', async () => {
      dfspTokens = dfspTokens?.length
        ? dfspTokens
        : await Promise.all( // run it only once
            Object.values(DFSPs).map(dfsp => oidcFlow(extApiPortal, dfsp))
          )

      expect(dfspTokens.length).toBeGreaterThan(0)

      dfspTokens.forEach(({ token, id } = {}) => {
        expect(typeof token).toBe('string');
        expect(DFSPs[id]).toBeDefined();
        DFSPs[id].token = token;
      })
    })

    given('mTLS creds for extapi endpoint are received', async () => {
      expect(tls?.ca, 'No TLS ca').toBeDefined()
      expect(tls?.cert, 'No TLS cert').toBeDefined()
      expect(tls?.key, 'No TLS key').toBeDefined()
    })
  }

  const sendManyDiscoveryRequests = (table) => Promise.all(
    table.map(row => sendDiscoveryRequest({
      url: extApiPortal.url,
      token: getToken(row.token),
      source: mapDfspId(row.source),
      proxy: mapDfspId(row.proxy),
      partyId: fixtures.TEST_PARTY_ID,
      tls,
    }))
  )

  const sendManyQuotesRequests = (table) => Promise.all(
    table.map(row => sendQuotesRequests({
      url: extApiPortal.url,
      token: getToken(row.token),
      source: mapDfspId(row.source),
      proxy: mapDfspId(row.proxy),
      destination: 'destination-dfsp',
      quoteId: fixtures.TEST_QUOTE_ID,
      tls,
    }))
  )

  const validateResponses = (responses, expectedResults) => {
    const errors = [];
    const reqStrings = []

    responses.forEach((res, i) => {
      const { token, source, proxy, statusCode } = expectedResults[i] || {}

      const reqDetails = `row:${padEnd(i)} | t:${padEnd(token)} | s:${padEnd(source)} | p:${padEnd(proxy)} | expected: ${statusCode}`
      reqStrings.push(reqDetails)

      if (String(res.status) !== statusCode) {
        errors.push(`${reqDetails} | got: ${res.status}`)
      }
    })

    allureUtils.withAttachmentJSON('Expected results (table):', reqStrings)
    allureUtils.withAttachmentJSON('Expected results (JSON):', expectedResults, true);
    allureUtils.withAttachmentCSV('Expected results (CSV):', expectedResults);

    expect(errors, `actual and expected statusCodes mismatching  [count: ${errors.length}]`).toEqual([])
  }

  test('Successful validation of FSPIOP source and proxy headers', allureUtils.withAllureSteps(({ given, when, then }) => {
    backgroundGetAccessTokens({ given, when, then });

    let expectedResults
    let responses

    when('DFSP sends discovery requests with proper access_token and headers:', async (table) => {
      expectedResults = structuredClone(table)
      responses = await sendManyDiscoveryRequests(table)
    })

    then('all requests succeed with proper statusCode', () => {
      validateResponses(responses, expectedResults)
    })
  }))

  test('Failed validation due to incorrect FSPIOP source and proxy headers', allureUtils.withAllureSteps(({ given, when, then }) => {
    backgroundGetAccessTokens({ given, when, then });

    let expectedResults
    let responses

    when('DFSP sends discovery requests with valid own access_token and incorrect headers:', async (table) => {
      expectedResults = structuredClone(table)
      responses = await sendManyDiscoveryRequests(table)
    })

    then('all requests fail with proper error statusCode', () => {
      validateResponses(responses, expectedResults);
    })
  }))

  test('Failed validation due to missing access token', allureUtils.withAllureSteps(({ given, when, then }) => {
    backgroundGetAccessTokens({ given, when, then });

    let expectedResults
    let responses

    when('DFSP send discovery requests without access token:', async (table) => {
      expectedResults = structuredClone(table)
      responses = await sendManyDiscoveryRequests(table)
    })

    then('all requests fail with 401 Unauthorized error', () => {
      validateResponses(responses, expectedResults);
    })
  }))

  test('Failed validation due to wrong access token', allureUtils.withAllureSteps(({ given, when, then }) => {
    backgroundGetAccessTokens({ given, when, then });

    let expectedResults
    let responses

    when('send discovery requests with access_token from another DFSP:', async (table) => {
      expectedResults = structuredClone(table)
      responses = await sendManyDiscoveryRequests(table)
    })

    then('requests fail with 400 Bad Request error', () => {
      validateResponses(responses, expectedResults);
    })
  }))

  test('Quotes requests fail validation due to incorrect source/proxy headers', allureUtils.withAllureSteps(({ given, when, then }) => {
    backgroundGetAccessTokens({ given, when, then });

    let expectedResults
    let responses

    when('send quotes requests with valid access_token and incorrect headers:', async (table) => {
      expectedResults = structuredClone(table)
      responses = await sendManyQuotesRequests(table)
    })

    then('requests fail with Bad Request error', () => {
      validateResponses(responses, expectedResults);
    })
  }))
})
