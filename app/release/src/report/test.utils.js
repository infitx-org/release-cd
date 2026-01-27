const { Agent } = require('node:https');
const { readFileSync } = require('node:fs');
const axios = require('axios');
const allure = require('allure-js-commons')
const dto = require('./dto');


/**
 * @typedef {Object} DfspAccessToken
 * @prop {string} token - OIDC access token
 * @prop {string} id - DFSP identifier
 */

/** @returns Promise<DfspAccessToken>  */
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

    return {
      token: response.data?.access_token,
      id: dfsp.id
    }
  } catch (error) {
    throw new Error(`OIDC authentication failed: ${error.message}`);
  }
}

const sendHttpRequest = async ({
  url,
  method = 'GET',
  headers = {},
  timeout = 10_000,
  tls = null
} = {}) => {
  const config = { url, method, headers, timeout };

  if (tls) {
    config.httpsAgent = createHttpsAgent(tls)
  }

  return axios.request(config).catch(err => {
    const res = err.response ?? { status: err.message }

    const { status, statusText, data } = res;
    console.error(`failed to send http request: ${err.stack}`, {
      status,
      statusText,
      data,
      request: { url, method, headers }
    });

    return res;
  });
}

const sendDiscoveryRequest = async ({
  extApiPortal,
  token,
  source,
  destination,
  proxy,
  partyType = 'MSISDN',
  partyId = 'XXX',
  headers,
  url, // for compatibility with parent (sendHttpRequest)
  ...rest
} = {}) => sendHttpRequest({
  ...rest,
  url: `${extApiPortal.url || url}/parties/${partyType}/${partyId}`,
  tls: extApiPortal.tls,
  headers: dto.discoveryHeadersDto({
    token, source, destination, proxy, headers
  }),
})


const createHttpsAgent = (tls) => new Agent({
  rejectUnauthorized: tls?.rejectUnauthorized ?? true,
  ...(tls?.ca && { ca: readFileSync(tls.ca) }),
  ...(tls?.cert && { cert: readFileSync(tls.cert) }),
  ...(tls?.key && { key: readFileSync(tls.key) }),
});

const padEnd = (str = '', length = 10) => String(str).padEnd(length)

const wrapStep = (keyword, stepFn) => {
  return (stepText, callback) => {
    const stepName = `${keyword} ${stepText}`;
    return stepFn(stepText, async (...args) => {
      return allure.step(stepName, async () => callback(...args));
    });
  };
};

const wrapSteps = ({ given, when, then, and, but } = {}) => ({
  given: wrapStep('Given', given),
  when: wrapStep('When', when),
  then: wrapStep('Then', then),
  and: and ? wrapStep('And', and) : undefined,
  but: but ? wrapStep('But', but) : undefined,
});

const withAllureSteps = (testCallback) => {
  return (jestCucumberContext) => {
    const wrappedContext = wrapSteps(jestCucumberContext);
    return testCallback(wrappedContext);
  };
};

const withAttachmentJSON = (title, json) => allure.attachment(title, JSON.stringify(json, null, 2), 'application/json');

const withAttachmentCSV = (title, rows) => {
  if (!rows?.length) return allure.attachment(title, '', 'text/csv');

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => row[h] ?? '').join(','))
  ].join('\n');

  return allure.attachment(title, csv, 'text/csv');
};

const withTags = (tags = []) => tags.forEach(tag => allure.tag(tag))

module.exports = {
  oidcFlow,
  sendHttpRequest,
  sendDiscoveryRequest,
  padEnd,
  withAllureSteps,
  withAttachmentJSON,
  withAttachmentCSV,
  withTags
}
