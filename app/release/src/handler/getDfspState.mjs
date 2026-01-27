import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { k8sApi } from '../k8s.mjs';

const execAsync = promisify(exec);

const MAN_API_TEST_SERVER_PORT = 9050
const KUBECTL_TIMEOUT_MS = 20_000

const checkNamespace = async (name) => {
  try {
    return await k8sApi.readNamespace({ name });
  } catch (err) {
    console.error(`failed readNamespace: ${err?.message}`);
    return null
  }
}

export default async function getDfspState(dfspId) {
  let state = null

  try {
    const ns = await checkNamespace(dfspId);
    if (!ns) throw new Error(`${dfspId} not found`);

    const cmd = `kubectl exec -n "${dfspId}" deploy/"${dfspId}"-management-api -- wget -qO- http://localhost:${MAN_API_TEST_SERVER_PORT}/state`;
    const { stdout } = await execAsync(cmd, { timeout: KUBECTL_TIMEOUT_MS });
    const json = JSON.parse(stdout);

    const tlsCreds = json?.connectorConfig?.outbound?.tls?.creds;
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

  return { dfspId, state }
}
