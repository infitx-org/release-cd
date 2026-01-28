import { sendHttpRequest } from '../report/test.utils.js'

const MAN_API_TEST_SERVER_PORT = 9050;

const NAMESPACE_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
// K8s namespace naming: RFC 1123 DNS label

export default async function getDfspState(dfspId) {
  let state = null;

  try {
    if (!dfspId || !NAMESPACE_REGEX.test(dfspId)) {
      throw new Error(`Invalid K8s namespace format: ${dfspId}`);
    } // Defense-in-depth

    const url = `http://${dfspId}-management-api.${dfspId}.svc.cluster.local:${MAN_API_TEST_SERVER_PORT}/state`
    // const url = `http://localhost:${MAN_API_TEST_SERVER_PORT}/state`
    const { status, data } = await sendHttpRequest({ url });

    if (status !== 200) throw new Error(`Failed to get state from management API: ${status}`);

    const tlsCreds = data?.connectorConfig?.outbound?.tls?.creds;
    if (!tlsCreds) throw new Error('TLS credentials not found in state');

    state = {
      outboundTLS: {
        ca: tlsCreds.ca,
        cert: tlsCreds.cert,
        key: tlsCreds.key?.replace(/\r/g, '')
      }
    };
  } catch (error) {
    console.error(`error in getDfspState: ${error?.stack}`);
  }

  return { dfspId, state };
}
