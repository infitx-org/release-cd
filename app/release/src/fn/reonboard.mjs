import { boomify } from '@hapi/boom';
import axios from 'axios';
import notifyRelease from '../release.mjs';

export default async function reonboardDfsps(dfsps, key) {
    const startTime = Date.now();
    let result
    try {
        result = await Promise.all(dfsps.map(name =>
            axios.post(`http://${name}.svc.cluster.local/reonboard`, {
                reason: 'release-cd-triggered reonboard'
            }).then(response => ({
                pm: name,
                ...response.data
            }))))
    } catch (err) {
        throw boomify(err, { message: `Reonboard failed after ${(Date.now() - startTime) / 1000} seconds` });
    }

    if (key) {
        notifyRelease({
            reportId: `reonboard-${key}`,
            totalAssertions: result.length,
            totalPassedAssertions: result.length,
            isPassed: true,
            duration: Date.now() - startTime,
            reonboard: result,
            report: {
                body: JSON.stringify(result, null, 2),
                contentType: 'application/json'
            }
        }).catch(err => {
            console.error('Error notifying release:', err);
        });
    }

    return result;
}
