const baseHeadersDto = ({
  accept,
  contentType,
  source,
  destination = '',
  proxy = '',
  headers = {},
  date = 'Thu, 22 Jan 2026 11:25:02 GMT',
  token
} = {}) => ({
  accept,
  'content-type':  contentType,
  date,
  ...headers,
  ...(source && { 'fspiop-source': source }),
  ...(destination && { 'fspiop-destination': destination }),
  ...(proxy && { 'fspiop-proxy': proxy }),
  ...(token && { authorization: `Bearer ${token}` }),
})

const discoveryHeadersDto = ({
  token,
  source,
  proxy = '',
  accept = 'application/vnd.interoperability.iso20022.parties+json;version=2.0',
  contentType = accept,
  ...rest
} = {}) => baseHeadersDto({
  ...rest,
  token,
  source,
  proxy,
  accept,
  contentType,
})

module.exports = {
  baseHeadersDto,
  discoveryHeadersDto
}
