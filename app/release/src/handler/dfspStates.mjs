import { boomify } from '@hapi/boom';
import axios from 'axios';

import config from '../config.mjs';

// Maps the integer value from mcm_api_dfsp_status_state to a human-readable label
const STATE_LABELS = {
    0: 'SUCCESS',
    1: 'NOT REACHABLE',
    2: 'JWS FAILED',
    3: 'TIMED OUT',
    4: 'PING ERROR',
};

export default async function dfspStatesHandler(request, h) {
    const prometheusUrl = config.prometheus.url;
    if (!prometheusUrl) {
        throw boomify(new Error('PROMETHEUS_URL not set'), { statusCode: 500 });
    }

    const env = request.query.env;
    const configuredDfsps = config.rule.environments[env]?.dfsps ?? [];

    try {
        const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
            params: { query: 'mcm_api_dfsp_status_state' },
        });

        if (response.data.status !== 'success') {
            throw new Error('Prometheus query failed');
        }

        // Build a map of dfsp -> stateValue from Prometheus results
        const prometheusStates = {};
        for (const result of response.data.data.result) {
            const dfsp = result.metric.dfsp;
            if (dfsp) {
                prometheusStates[dfsp] = parseInt(result.value[1], 10);
            }
        }

        // Return state for each configured DFSP (null if not found in Prometheus)
        const states = {};
        for (const dfsp of configuredDfsps) {
            const stateValue = prometheusStates[dfsp] ?? null;
            states[dfsp] = {
                stateValue,
                stateLabel: stateValue !== null ? (STATE_LABELS[stateValue] ?? `UNKNOWN(${stateValue})`) : null,
                isSuccess: stateValue === 0,
            };
        }

        return h.response(states).code(200);
    } catch (err) {
        throw boomify(err, { statusCode: 500 });
    }
}
