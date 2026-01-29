import { Agent } from 'node:https';
import { readFileSync } from 'node:fs';
import axios from 'axios';
import { logger } from '../logger.mjs'
import * as dto from './dto.js';

const log = logger.child({ module: 'testUtils' });

/**
 * @typedef {Object} DfspAccessToken
 * @prop {string} token - OIDC access token
 * @prop {string} id - DFSP identifier
 */

/**
 *  @param {{ loginUrl: string }} portal - Portal configuration containing OIDC login URL.
 *  @param {{ [id]: string, username: string, password: string }} dfsp - DFSP config with id and credentials.
 *  @returns Promise<DfspAccessToken>
 */
async function oidcFlow(portal, dfsp) {
  try {
    const response = await axios.post(
      portal.loginUrl,
      {
        grant_type: 'client_credentials',
        client_id: dfsp.username,
        client_secret: dfsp.password
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    )

    if (String(dfsp.id) !== String(dfsp.username)) {
      log.info('dfsp id !== username', { creds: dfsp })
    }

    return {
      token: response.data?.access_token,
      id: dfsp.id
      // id: creds.username // (!) check failures
    }
  } catch (error) {
    const errMessage = 'error in OIDC authentication:'
    log.warn(errMessage, error)
    throw new Error(`${errMessage} ${error.message}`);
  }
}

const sendHttpRequest = async ({
  url,
  method = 'GET',
  headers = {},
  timeout = 10_000,
  tls = null,
  useGlobalAgent = true,
} = {}) => {
  const opts = { url, method, headers, timeout };

  if (tls) {
    opts.httpsAgent = createHttpsAgent(tls, useGlobalAgent)
  }

  return axios.request(opts).catch(err => {
    const res = err.response ?? { status: err.message } // todo: think better way

    log.child({
      status: res.status,
      request: { url, method, headers },
      component: 'sendHttpRequest'
    }).warn(`failed to send http request: `, err)

    return res;
  });
}

const sendDiscoveryRequest = async ({
  url,
  token,
  source,
  destination,
  proxy,
  headers,
  partyId,
  partyType = 'MSISDN',
  ...rest
} = {}) => sendHttpRequest({
  ...rest,
  url: `${url}/parties/${partyType}/${partyId}`,
  headers: dto.discoveryHeadersDto({
    token, source, destination, proxy, headers
  }),
})

const sendQuotesRequests = async ({
  url,
  token,
  source,
  destination,
  proxy,
  quoteId,
  headers,
  ...rest
} = {}) => sendHttpRequest({
  ...rest,
  url: `${url}/quotes/${quoteId}`,
  headers: dto.quotesHeadersDto({
    token, source, destination, proxy, headers
  }),
})

let httpsAgent // global agent

const createHttpsAgent = (tls, useGlobal) => {
  if (useGlobal) {
    if (!httpsAgent) httpsAgent = new Agent(normalizeTls(tls))
    return httpsAgent
  }
  return new Agent(normalizeTls(tls));
};

const normalizeTls = ({ ca, cert, key, rejectUnauthorized } = {}) => Object.freeze({
  ...(ca && { ca: normalizePemValue(ca) }),
  ...(cert && { cert: normalizePemValue(cert) }),
  ...(key && { key: normalizePemValue(key) }),
  ...(typeof rejectUnauthorized === 'boolean' && { rejectUnauthorized }),
});

const normalizePemValue = (value) => {
  if (!value) return;

  return isFilePath(value)
    ? readFileSync(value, 'utf8')
    : value.replace(/\\n/g, '\n')
};

const isFilePath = (value) => {
  if (!value) return false;
  if (value.includes('-----BEGIN')) return false; // PEM content

  const trimmed = value.trim();
  return (
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    /\.(pem|crt|key|cert)$/i.test(trimmed)
  );
};

const padEnd = (str = '', length = 10) => String(str).padEnd(length)

export {
  oidcFlow,
  sendHttpRequest,
  sendDiscoveryRequest,
  sendQuotesRequests,
  padEnd,
};
