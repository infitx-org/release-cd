import { boomify } from '@hapi/boom';
import axios from 'axios';

import config from '../config.mjs';
const hours = 24;

export default async function reonboard(request, h) {
    const prometheusUrl = config.prometheus.url;
    if (!prometheusUrl) {
        throw boomify(new Error('PROMETHEUS_URL not set'), { statusCode: 500 });
    }

    // Use changes() to count transitions per app per health status per hour
    const query = 'sum by (name,health_status) (count_over_time(argocd_app_info[1h]))';

    const now = Math.floor(Date.now() / 1000);
    const start = now - hours * 3600;
    const step = 3600; // 1-hour intervals

    try {
        const response = await axios.get(`${prometheusUrl}/api/v1/query_range`, {
            params: {
                query,
                start,
                end: now,
                step,
            },
        });

        if (response.data.status !== 'success') {
            throw new Error('Prometheus query failed');
        }

        const healthStatuses = ['Healthy', 'Progressing', 'Degraded', 'Missing', 'Unknown'];
        const apps = {};

        // Process the changes data - each time series represents changes TO a specific health_status
        for (const timeSeries of response.data.data.result) {
            const appName = timeSeries.metric.name;
            const healthStatus = timeSeries.metric.health_status;

            if (!apps[appName]) {
                apps[appName] = {
                    stateTransitions: {},
                    currentStatus: null,
                    lastTimestamp: 0
                };
                // Initialize transition counters for each state
                for (const state of healthStatuses) {
                    apps[appName].stateTransitions[state] = Array(hours).fill(0);
                }
            }

            // Each value represents the number of changes for this health_status in that hour
            for (let i = 0; i < timeSeries.values.length; i++) {
                const [timestamp, value] = timeSeries.values[i];
                const changeCount = parseFloat(value);

                // Map timestamp to hour index (0 = 24h ago, 23 = current hour)
                const hourIndex = Math.floor((timestamp - start) / 3600);

                if (hourIndex >= 0 && hourIndex < hours && changeCount > 0) {
                    apps[appName].stateTransitions[healthStatus][hourIndex] = Math.round(changeCount);
                }

                // Track most recent status (assume last non-zero is current)
                if (changeCount > 0 && timestamp > apps[appName].lastTimestamp) {
                    apps[appName].lastTimestamp = timestamp;
                    apps[appName].currentStatus = healthStatus;
                }
            }
        }

        // Get current status for each app with a separate instant query
        const currentStatusQuery = 'argocd_app_info';
        const currentResponse = await axios.get(`${prometheusUrl}/api/v1/query`, {
            params: { query: currentStatusQuery },
        });

        if (currentResponse.data.status === 'success') {
            for (const result of currentResponse.data.data.result) {
                const appName = result.metric.name;
                const healthStatus = result.metric.health_status;

                if (apps[appName]) {
                    // Update with actual current status
                    apps[appName].currentStatus = healthStatus;
                }
            }
        }

        // Build enriched response with heatmap data
        const enrichedApps = {};
        for (const [appName, data] of Object.entries(apps)) {
            const statesPresent = new Set();
            let totalTransitions = 0;
            let maxTransitionsPerHour = 0;

            // Determine which states are present and max transitions for normalization
            for (const state of healthStatuses) {
                const transitions = data.stateTransitions[state];
                const hasTransitions = transitions.some(count => count > 0);

                if (hasTransitions) {
                    statesPresent.add(state);
                    totalTransitions += transitions.reduce((sum, count) => sum + count, 0);
                    maxTransitionsPerHour = Math.max(maxTransitionsPerHour, ...transitions);
                }
            }

            enrichedApps[appName] = {
                stateTransitions: data.stateTransitions,
                statesPresent: Array.from(statesPresent),
                currentStatus: data.currentStatus,
                totalTransitions,
                maxTransitionsPerHour,
                isStable: totalTransitions === 0,
                isHealthy: statesPresent.size === 1 && statesPresent.has('Healthy')
            };
        }

        return h.response(enrichedApps).code(200);
    } catch (err) {
        throw boomify(err, { statusCode: 500 });
    }
}