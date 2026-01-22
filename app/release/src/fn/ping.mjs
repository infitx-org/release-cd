import Boom from '@hapi/boom';
import axios from 'axios';
import { monotonicFactory } from "ulidx";

import config from '../config.mjs';

const ulid = monotonicFactory();

export default async function pingDFSP(dfsp, timeout) {
    const now = Date.now();
    const endTime = now + timeout * 1000;
    let lastError = null;
    let retries = 1;
    while (true) {
        try {
            const status = await sendPingRequest(dfsp);
            if (status === 'SUCCESS') {
                return `Ping ${status} after ${(Date.now() - now) / 1000} seconds, on try ${retries})`;
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

    throw Boom.clientTimeout(`Ping to DFSP ${dfsp} failed after ${(Date.now() - now) / 1000} seconds. Last error: ${lastError}`);
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
