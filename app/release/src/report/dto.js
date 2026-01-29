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
  'content-type': contentType,
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
  accept = makeInteropHeader('parties'),
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

const quotesHeadersDto = ({
  token,
  source,
  destination,
  proxy = '',
  accept = makeInteropHeader('quotes'),
  contentType = accept,
  ...rest
} = {}) => baseHeadersDto({
  ...rest,
  token,
  source,
  destination,
  proxy,
  accept,
  contentType,
})

const makeInteropHeader = (resource, version = '2.0') => `application/vnd.interoperability.iso20022.${resource}+json;version=${version}`
// todo: ^^ make iso-part configurable

module.exports = {
  baseHeadersDto,
  discoveryHeadersDto,
  quotesHeadersDto
}
