import { boomify } from '@hapi/boom';
import axios from 'axios';

import config from '../config.mjs';
const hours = 24;

export default async function reonboard(request, h) {
    const prometheusUrl = config.prometheus.url;
    if (!prometheusUrl) {
        throw boomify(new Error('PROMETHEUS_URL not set'), { statusCode: 500 });
    }

    const query = 'max by (name,health_status) (max_over_time(argocd_app_info[1h]))';

    const now = Math.floor(Date.now() / 1000);
    const start = now - hours * 3600;
    const step = 3600;

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

        // Aggregate worst health per app per hour
        const apps = {};
        const maxTimestamp = response.data.data.result.reduce((max, r) => {
            const lastValue = r.values[r.values.length - 1][0];
            return lastValue > max ? lastValue : max;
        }, 0);
        const healthStatuses = ['Healthy', 'Progressing', 'Degraded', 'Missing', 'Unknown']; // Ordered by severity
        for (const r of response.data.data.result) {
            const app = r.metric.name;
            const health = healthStatuses.indexOf(r.metric.health_status);
            r.values.forEach(([timestamp]) => {
                if (!apps[app]) apps[app] = { health: Array(hours).fill(null), last: { timestamp: 0, healthIdx: -1 } };

                const hoursBefore = Math.floor((maxTimestamp - timestamp) / 3600);
                // Store last known health status
                if (timestamp >= apps[app].last.timestamp && hoursBefore === 0) {
                    apps[app].last = { timestamp, health };
                }

                if (hoursBefore >= 0 && hoursBefore < hours) {
                    const existing = apps[app].health[hoursBefore];
                    if (existing === null) {
                        apps[app].health[hoursBefore] = health;
                    } else {
                        const existingIdx = healthStatuses.indexOf(existing);
                        if (health > existingIdx) {
                            apps[app].health[hoursBefore] = health;
                        }
                    }
                }
            });
        }

        return h.response(apps).code(200);
    } catch (err) {
        throw boomify(err, { statusCode: 500 });
    }
}