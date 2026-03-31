import { boomify } from '@hapi/boom';
import axios from 'axios';

import config from '../config.mjs';
const hours = 24;

export default async function appHealthHandler(request, h) {
    const prometheusUrl = config.prometheus.url;
    if (!prometheusUrl) {
        throw boomify(new Error('PROMETHEUS_URL not set'), { statusCode: 500 });
    }

    const rangeQuery = 'sum by (name,health_status) (count_over_time(argocd_app_info[1h]))';
    const now = Math.floor(Date.now() / 1000);
    const start = now - hours * 3600;
    const step = 3600; // 1-hour intervals

    try {
        // Run range (heatmap) and instant (current status) queries in parallel
        const [rangeResponse, currentResponse] = await Promise.all([
            axios.get(`${prometheusUrl}/api/v1/query_range`, {
                params: { query: rangeQuery, start, end: now, step },
            }),
            axios.get(`${prometheusUrl}/api/v1/query`, {
                params: { query: 'argocd_app_info' },
            }),
        ]);

        if (rangeResponse.data.status !== 'success') {
            throw new Error('Prometheus range query failed');
        }
        if (currentResponse.data.status !== 'success') {
            throw new Error('Prometheus instant query failed');
        }

        const healthStatuses = ['Healthy', 'Progressing', 'Degraded', 'Missing', 'Unknown'];

        // Build authoritative current-status map from the non-aggregated instant query
        const currentStatuses = {};
        for (const result of currentResponse.data.data.result) {
            const appName = result.metric.name;
            const healthStatus = result.metric.health_status;
            if (appName && healthStatus) {
                currentStatuses[appName] = healthStatus;
            }
        }

        // Process range data for the heatmap — do NOT derive currentStatus from here
        const apps = {};

        const ensureApp = (appName) => {
            if (!apps[appName]) {
                apps[appName] = { stateTransitions: {} };
                for (const state of healthStatuses) {
                    apps[appName].stateTransitions[state] = Array(hours).fill(0);
                }
            }
        };

        for (const timeSeries of rangeResponse.data.data.result) {
            const appName = timeSeries.metric.name;
            const healthStatus = timeSeries.metric.health_status;
            if (!appName || !healthStatus) continue;

            ensureApp(appName);

            for (const [timestamp, value] of timeSeries.values) {
                const changeCount = parseFloat(value);
                const hourIndex = Math.floor((timestamp - start) / 3600);
                if (hourIndex >= 0 && hourIndex < hours && changeCount > 0) {
                    apps[appName].stateTransitions[healthStatus][hourIndex] = Math.round(changeCount);
                }
            }
        }

        // Ensure every app known from the instant query is present (may have no range data)
        for (const appName of Object.keys(currentStatuses)) {
            ensureApp(appName);
        }

        // Build enriched response
        const enrichedApps = {};
        for (const [appName, data] of Object.entries(apps)) {
            const statesPresent = new Set();
            let totalTransitions = 0;
            let maxTransitionsPerHour = 0;

            for (const state of healthStatuses) {
                const transitions = data.stateTransitions[state];
                if (transitions.some(count => count > 0)) {
                    statesPresent.add(state);
                    totalTransitions += transitions.reduce((sum, count) => sum + count, 0);
                    maxTransitionsPerHour = Math.max(maxTransitionsPerHour, ...transitions);
                }
            }

            // currentStatus comes exclusively from the authoritative instant query
            const currentStatus = currentStatuses[appName] ?? null;

            // isHealthy: currently healthy AND no non-healthy transitions in the window
            const isHealthy = currentStatus === 'Healthy' &&
                (statesPresent.size === 0 || (statesPresent.size === 1 && statesPresent.has('Healthy')));

            enrichedApps[appName] = {
                stateTransitions: data.stateTransitions,
                statesPresent: Array.from(statesPresent),
                currentStatus,
                totalTransitions,
                maxTransitionsPerHour,
                isStable: totalTransitions === 0,
                isHealthy,
            };
        }

        return h.response(enrichedApps).code(200);
    } catch (err) {
        throw boomify(err, { statusCode: 500 });
    }
}