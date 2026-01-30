import Boom from '@hapi/boom';
import axios from 'axios';
import { monotonicFactory } from "ulidx";
import notifyRelease from '../release.mjs';

import config from '../config.mjs';

const ulid = monotonicFactory();

export default async function pingDFSP(dfsp, timeout) {
    const startTime = Date.now();
    const endTime = startTime + timeout * 1000;
    let lastError = null;
    let retries = 1;
    try {
        while (true) {
            try {
                const status = await sendPingRequest(dfsp);
                if (status === 'SUCCESS') {
                    const body = `Ping to DFSP ${dfsp} ${status} after ${(Date.now() - startTime) / 1000} seconds, on try ${retries}`;
                    notifyRelease({
                        reportId: 'ping-' + dfsp,
                        totalAssertions: 1,
                        totalPassedAssertions: 1,
                        isPassed: true,
                        duration: Date.now() - startTime,
                        report: {
                            body,
                            contentType: 'text/plain'
                        }
                    }).catch(err => {
                        console.error(new Date(), 'Error notifying release:', err);
                    });
                    return body;
                } else {
                    lastError = `Unexpected ping status: ${status}`;
                }
                retries++;
            } catch (err) {
                lastError = err.message || String(err);
            }
            if (isFinite(timeout) && Date.now() >= endTime) break;
            await new Promise(res => setTimeout(res, 1000));
        }

        throw Boom.clientTimeout(`Ping to DFSP ${dfsp} failed after ${(Date.now() - startTime) / 1000} seconds. Last error: ${lastError}`);
    } catch (error) {
        notifyRelease({
            reportId: 'ping-' + dfsp,
            totalAssertions: 1,
            totalPassedAssertions: 0,
            isPassed: false,
            duration: Date.now() - startTime,
            report: {
                body: error.message + '\n\n' + error.stack,
                contentType: 'text/plain'
            }
        }).catch(err => {
            console.error(new Date(), 'Error notifying release:', err);
        });
        throw error;
    }
}

async function sendPingRequest(dfsp) {
    return (await axios.post(config.service.ping, {
        requestId: ulid()
    }, {
        headers: {
            'fspiop-destination': dfsp,
        }
    })).data?.pingStatus;
}
