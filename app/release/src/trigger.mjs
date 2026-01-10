import decision from '@infitx/decision';
import axios from 'axios';
import { existsSync } from 'fs';

import config from './config.mjs';

const triggerConfig = 'decision.yaml'
const { decide } = existsSync(triggerConfig) ? decision(triggerConfig) : {};

export default async function trigger(request, fact) {
    if (!decide) return;
    const decisions = [].concat(decide(fact, true)).filter(Boolean);
    if (decisions.length) console.log('Trigger decisions:', decisions);
    return Promise.allSettled(decisions.map(async ({ rule, decision, action, params: { env, namespace, job, key, args } = {}, params }) => {
        if (!['keyRotate', 'triggerJob'].includes(action)) throw new Error(`Unknown action: ${action}`);

        const revisionColl = request.server.app.db.collection(`revision/${env}`);
        const revisionId = fact.revisions[env];
        const staleThreshold = Date.now() - (35 * 60 * 1000); // 35 minutes

        try {
            // Atomically claim the action slot - only update if action is not running or is stale
            const claimResult = await revisionColl.updateOne(
                {
                    _id: revisionId,
                    $or: [
                        { [`actions.${rule}`]: { $exists: false } },
                        { [`actions.${rule}`]: false },
                        { [`actions.${rule}`]: { $lt: staleThreshold } }
                    ]
                },
                {
                    $currentDate: { lastModified: true },
                    $set: { [`actions.${rule}`]: Date.now() }
                },
                { upsert: true }
            );

            // If we didn't modify the document, another request is already running this action
            if (claimResult.modifiedCount === 0 && claimResult.upsertedCount === 0) {
                console.log(`Action ${rule} already running for ${env}, skipping`);
                return;
            }

            try {
                const baseUrl = config.env[env];
                if (!env) throw new Error('No environment specified');
                if (!baseUrl) throw new Error(`No server URL configured for environment ${env}`);
                const headers = config.server?.auth ? { Authorization: config.server.auth } : {};

                switch (action) {
                    case 'keyRotate': {
                        if (!key) throw new Error('No key specified for rotation');
                        const url = new URL('/keyRotate/' + key, baseUrl).toString();
                        const result = await axios.post(url, null, { headers, timeout: 300000 });
                        console.log(`Key ${key} rotated for ${env} (${url}):`, result.data);
                        return { rule, decision, result: result.data };
                    }
                    case 'triggerJob': {
                        if (!job) throw new Error('No job specified for job trigger');
                        if (!namespace) throw new Error('No namespace specified for job trigger');
                        const url = new URL('/triggerCronJob/' + namespace + '/' + job, baseUrl).toString();
                        const result = await axios.post(url, args ? { args } : null, { headers });
                        console.log(`job ${namespace}/${job} triggered for ${env} (${url}):`, result.data);
                        return { rule, decision, result: result.data };
                    }
                }
            } finally {
                // Release the action slot
                await revisionColl.updateOne(
                    { _id: revisionId },
                    {
                        $currentDate: { lastModified: true },
                        $set: { [`actions.${rule}`]: false }
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
            console.error(err);
            delete err.stack;
            throw err;
        }
    }));
}
