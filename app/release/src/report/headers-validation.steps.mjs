import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import rc from 'rc';
import { defineFeature, loadFeature } from 'jest-cucumber';

import { releaseCdClient } from '../apiClients/releaseCdClient.mjs';
import {
  oidcFlow,
  padEnd,
  sendDiscoveryRequest,
  withAllureSteps,
  withAttachmentJSON,
  withAttachmentCSV,
  withTags
} from './test.utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = rc('portal_test', {
  credentials: {
    anonymous: {}
  }
});

const feature = loadFeature(__dirname + '/headers-validation.feature');


defineFeature(feature, test => {
  const extApiPortal = Object.freeze(config.portals?.['Hub external API'] || {})
  let DFSPs = {};
  let tls; // for alice

  /** @type {Array<DfspAccessToken>} */
  let dfspTokens = []

  // make it configurable?
  const ALIASES = Object.freeze({
    alice: 'test-fxp2',
    bob: 'bob',
    xxx: 'xxx'
  })
  const mapDfspId = (id) => ALIASES[id] || id
  const mapToken = (id) => (DFSPs[id]?.token || '')

  const createDfsp = (row) => {
    const dfspId = mapDfspId(row.dfsp)

    const creds = config.credentials?.[dfspId] || {}
    expect(creds.username).toBeDefined();
    expect(creds.password).toBeDefined();

    return {
      id: row.dfsp,
      dfspId,
      username: creds.username, // or clientId / clientSecret ?
      password: creds.password,
      flow: row.flow,
      token: '' // will be populated later
    }
  }

  beforeAll(async () => {
    const { status, data } = await releaseCdClient.getDfspState(ALIASES['alice']) // get it from config?
    expect(status).toBe(200)
    expect(data).toBeDefined()
    tls = data?.state?.outboundTLS
  })

  const backgroundGetAccessTokens = ({ given, when, then }) => {
    DFSPs = {};

    given('credentials for OIDC (Keycloak) clients for DFSPs', table => {
      withTags(feature.tags)

      table.forEach(row => {
        DFSPs[row.dfsp] = createDfsp(row)
      })
    })

    given('hub external API and OIDC endpoints are configured', () => {
      const { url, loginUrl, tls } = extApiPortal || {}
      withAttachmentJSON('Hub external API and OIDC (login) URLs:', { url, loginUrl })
      expect(url).toBeDefined();
      expect(loginUrl).toBeDefined();
    })

    given('mTLS creds to connect to extapi endpoint received', async () => {
      expect(tls?.ca, 'No TLS ca').toBeDefined()
      expect(tls?.cert, 'No TLS cert').toBeDefined()
      expect(tls?.key, 'No TLS key').toBeDefined()
    })

    when('DFSPs send auth requests to OIDC endpoint with provided credentials', async () => {
      dfspTokens = dfspTokens?.length ? dfspTokens : await Promise.all( // call it only once during all tests
        Object.values(DFSPs)
          .map(dfsp => oidcFlow(extApiPortal, dfsp))
      )
    })

    then('all DFSPs get access tokens', () => {
      dfspTokens.forEach(({ token, id } = {}) => {
        expect(typeof token).toBe('string');
        expect(DFSPs[id]).toBeDefined();
        DFSPs[id].token = token;
      })
    })
  }

  const sendManyDiscoveryRequests = (table) => Promise.all(
    table.map(row => sendDiscoveryRequest({
      extApiPortal,
      tls,
      token: mapToken(row.token),
      source: mapDfspId(row.source),
      proxy: mapDfspId(row.proxy),
    }))
  )

  const validateResponses = (responses, expectedResults) => {
    const errors = [];
    const reqStrings = []

    responses.forEach((res, i) => {
      const { token, source, proxy, statusCode } = expectedResults[i] || {}

      const reqDetails = `row:${padEnd(i)} | t:${padEnd(token)} | s:${padEnd(source)} | p:${padEnd(proxy)} | expected: ${statusCode}`

      if (String(res.status) !== statusCode) {
        errors.push(`${reqDetails} | got: ${res.status}`)
      }
      reqStrings.push(reqDetails)
    })

    withAttachmentJSON('Expected results (table):', reqStrings)
    withAttachmentJSON('Expected results (JSON):', expectedResults);
    withAttachmentCSV('Expected results (CSV):', expectedResults);

    expect(errors, 'actual and expected statusCodes mismatching').toEqual([])
  }

  test('Successful validation of FSPIOP source and proxy headers', withAllureSteps(({ given, when, then }) => {
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

  test('Failed validation due to incorrect FSPIOP source and proxy headers', withAllureSteps(({ given, when, then }) => {
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

  test('Failed validation due to missing access token', withAllureSteps(({ given, when, then }) => {
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

  test('Failed validation due to wrong access token', withAllureSteps(({ given, when, then }) => {
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
})
