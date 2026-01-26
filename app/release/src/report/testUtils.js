const axios = require('axios');

async function oidcFlow(portal, creds) {
  try {
    const response = await axios.post(
      portal.loginUrl,
      {
        grant_type: 'client_credentials',
        client_id: creds.username,
        client_secret: creds.password
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    )

    return response.data?.access_token
  } catch (error) {
    throw new Error(`OIDC authentication failed: ${error.message}`);
  }
}

const sendHttpRequest = async ({
  url,
  method = 'GET',
  headers = {},
  timeout = 10_000
} = {}) => axios.request({
  url,
  method,
  headers,
  timeout
}).catch(err => {
  console.error('failed to send http request: ', err);
  return err.response ?? { status: err.message }
})

const sendDiscoveryRequest = async ({
  extApiUrl,
  token,
  source,
  destination,
  proxy,
  partyType = 'MSISDN',
  partyId = 'XXX',
  headers,
  ...rest
} = {}) => sendHttpRequest({
  ...rest,
  url: `${extApiUrl}/parties/${partyType}/${partyId}`,
  headers: discoveryHeadersDto({ token, source, destination, proxy, partyType, headers }),
})

const discoveryHeadersDto = ({
   token,
   source,
   destination,
   proxy,
   headers = {}
} = {}) => ({
  accept: 'application/vnd.interoperability.iso20022.parties+json;version=2.0',
  'content-type': 'application/vnd.interoperability.iso20022.parties+json;version=2.0',
  date: 'Thu, 22 Jan 2026 11:25:02 GMT',
  ...headers,
  ...(token && { authorization: `Bearer ${token}` }),
  ...(source && { 'fspiop-source': source }),
  ...(destination && { 'fspiop-destination': destination }),
  ...(proxy && { 'fspiop-proxy': proxy }),
})

module.exports = {
  oidcFlow,
  sendHttpRequest,
  sendDiscoveryRequest,
}
