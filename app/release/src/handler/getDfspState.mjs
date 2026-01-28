import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { k8sApi } from '../k8s.mjs';

const execFileAsync = promisify(execFile);

const MAN_API_TEST_SERVER_PORT = 9050;
const KUBECTL_TIMEOUT_MS = 20_000;

/** @returns {Promise<String>} */
const execKubectl = async (args = [], options = { timeout: KUBECTL_TIMEOUT_MS }) => {
  if (Array.isArray(args) && args.length > 0) {
    const { stdout } = await execFileAsync('kubectl', args, options);
    return stdout;
  }
  console.log('No kubectl args found');
  return ''
}

const NAMESPACE_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
// K8s namespace naming: RFC 1123 DNS label

const checkNamespace = async (name) => {
  try {
    if (!name || !NAMESPACE_REGEX.test(name)) {
      throw new Error(`Invalid K8s namespace format: ${name}`);
    } // Defense-in-depth
    return await k8sApi.readNamespace({ name });
  } catch (err) {
    console.error(`failed readNamespace: ${err?.message}`);
    return null;
  }
};

export default async function getDfspState(dfspId) {
  let state = null;

  try {
    const ns = await checkNamespace(dfspId);
    if (!ns) throw new Error(`${dfspId} not found`);

    const stdout = await execKubectl([
      'exec', '-n', dfspId,
      `deploy/${dfspId}-management-api`,
      '--', 'wget', '-qO-',
      `http://localhost:${MAN_API_TEST_SERVER_PORT}/state`
    ]);

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

  return { dfspId, state };
}
