import decision from '@infitx/decision';
import axios from 'axios';
import { existsSync } from 'fs';

import config from './config.mjs';

const triggerConfig = 'decision.yaml'
const decide = existsSync(triggerConfig) && decision(triggerConfig);

export default function trigger(request, fact) {
    if (!decide) return;
    return Promise.all([...decide(fact)].map(async ({ id, action, params }) => {
        if (!['keyRotate'].includes(action)) throw new Error(`Unknown action: ${action}`);
        if (fact.revisions[params.env]?.actions?.[id]) return; // Action already in progress
        await request.app.db.collection(`revision/${params.env}`).updateMany(
            { _id: fact.revisions[params.env] },
            {
                $currentDate: { lastModified: true },
                $set: { actions: { [id]: Date.now() } }
            },
            { upsert: true }
        );
        try {
            switch (action) {
                case 'keyRotate': {
                    const baseUrl = config.env[params.env];
                    if (!baseUrl) throw new Error(`No server URL configured for environment ${params.env}`);
                    if (!params.key) throw new Error('No key specified for rotation');
                    const url = new URL('/keyRotate/' + params.key, baseUrl).toString();
                    const headers = config.auth ? { 'Authorization': config.auth } : {};
                    const rotateResult = await axios.get(url, { headers, timeout: 300000 });
                    console.log(`Key ${params.key} rotated for ${params.env} (${url}):`, rotateResult.data);
                    return id;
                }
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } finally {
            await request.app.db.collection(`revision/${params.env}`).updateMany(
                { _id: fact.revisions[params.env] },
                {
                    $currentDate: { lastModified: true },
                    $set: { actions: { [id]: null } }
                },
                { upsert: true }
            );
        }
    }));
}