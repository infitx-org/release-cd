import decision from '@infitx/decision';
import axios from 'axios';
import { existsSync } from 'fs';

import config from './config.mjs';

const triggerConfig = 'decision.yaml'
const { decide } = existsSync(triggerConfig) ? decision(triggerConfig) : {};

async function trigger(request, fact, decisions) {
    if (decisions.length) console.log('Trigger decisions:', decisions);
    return Promise.allSettled(decisions.map(async ({ rule, decision, action, params: { env, namespace, job, key, dfsp, timeout, vm, body } = {}, params }) => {
        if (!['keyRotate', 'keyRotateDFSP', 'triggerJob', 'onboard', 'offboard', 'ping', 'reonboard', 'reboot'].includes(action)) throw new Error(`Unknown action: ${action}`);

        const revisionColl = request.server.app.db.collection(`revision/${env}`);
        const revisionId = fact.revisions[env];
        const staleThreshold = Date.now() - (35 * 60 * 1000); // 35 minutes

        try {
            // Atomically claim the action slot - only update if action is not running or is stale
            const claimResult = await revisionColl.updateOne(
                {
                    _id: revisionId,
                    $or: [
                        { [`running.${rule}`]: { $exists: false } },
                        { [`running.${rule}`]: false },
                        { [`running.${rule}`]: { $lt: staleThreshold } }
                    ]
                },
                {
                    $currentDate: {
                        lastModified: true,
                        [`running.${rule}`]: true,
                        [`actions.${rule}`]: true
                    }
                }
            );

            // If we didn't modify the document, another request is already running this action
            if (claimResult.modifiedCount <= 0) {
                console.log(new Date(), `... Action ${rule} already running for ${env}, skipping`);
                return;
            }

            try {
                const baseUrl = config.env[env];
                if (!env) throw new Error('No environment specified');
                if (!baseUrl) throw new Error(`No server URL configured for environment ${env}`);
                const headers = config.server?.auth ? { Authorization: config.server.auth } : {};

                switch (action) {
                    case 'keyRotate':
                    case 'keyRotateDFSP': {
                        if (!key) throw new Error('No key specified for rotation');
                        const url = new URL(`/${action}/` + key, baseUrl).toString();
                        const result = await axios.post(url, body, { headers, timeout: 300000 });
                        console.log(new Date(), `... Key ${key} rotated for ${env} (${url}):`, result.data);
                        return { rule, decision, result: result.data };
                    }
                    case 'triggerJob': {
                        if (!job) throw new Error('No job specified for job trigger');
                        if (!namespace) throw new Error('No namespace specified for job trigger');
                        const url = new URL('/triggerCronJob/' + namespace + '/' + job, baseUrl).toString();
                        const result = await axios.post(url, body, { headers });
                        console.log(new Date(), `... Job ${namespace}/${job} triggered for ${env} (${url}):`, result.data);
                        return { rule, decision, result: result.data };
                    }
                    case 'ping':
                    case 'onboard':
                    case 'offboard': {
                        if (!dfsp) throw new Error(`No dfsp specified for ${action}`);
                        const url = new URL(`/${action}/${dfsp}?timeout=${timeout || 45}`, baseUrl).toString();
                        const result = await axios.post(url, body, { headers, timeout: timeout ? (timeout + 15) * 1000 : 60000 });
                        console.log(new Date(), `... DFSP ${dfsp} ${action}ed for ${env} (${url}):`, result.data);
                        return { rule, decision, result: result.data };
                    }
                    case 'reonboard': {
                        if (!dfsp) throw new Error(`No dfsp specified for ${action}`);
                        if (!key) throw new Error(`No key specified for ${action}`);
                        const url = new URL(`/reonboard/${key}?pm=${dfsp}`, baseUrl).toString();
                        const result = await axios.post(url, body, { headers, timeout: 60000 });
                        console.log(new Date(), `... DFSP ${dfsp} re-onboarded for ${env} (${url}):`, result.data);
                        return { rule, decision, result: result.data };
                    }
                    case 'reboot': {
                        if (!vm) throw new Error('No VM specified for restart');
                        const url = new URL(`/reboot/${vm}`, baseUrl).toString();
                        const result = await axios.post(url, body, { headers });
                        console.log(new Date(), `... VM ${vm} restart initiated (${url}):`, result.data);
                        return { rule, decision, result: result.data };
                    }
                }
            } finally {
                // Release the action slot
                await revisionColl.updateOne(
                    { _id: revisionId },
                    {
                        $currentDate: { lastModified: true },
                        $set: { [`running.${rule}`]: false }
                    }
                );
            };
        } catch (err) {
            err.config = {
                rule,
                decision,
                response: err.response?.data,
                action: {
                    url: err.config?.url,
                    method: err.config?.method,
                    action,
                    params
                }
            }
            delete err.request;
            delete err.response;
            console.error(new Date(), err);
            delete err.stack;
            throw err;
        }
    }));
}

export async function triggerDecision(request, fact) {
    if (!decide) return;
    const decisions = [].concat(decide(fact, true)).filter(Boolean);
    return await trigger(request, fact, decisions);
}

export async function triggerRule(request, ruleName) {
    if (!decide) return;
    const decisions = [].concat(decide(ruleName, true)).filter(Boolean);
    const fact = { revisions: {} };
    for (const { params: { env } = {} } of decisions) {
        if (!env) throw new Error('No environment specified in decision for rule ' + ruleName);
        fact.revisions[env] ||= (await request.server.app.db.collection(`revision/${env}`).findOne({}, { sort: { $natural: -1 } }))._id;
    }
    return await trigger(request, fact, decisions);
}
