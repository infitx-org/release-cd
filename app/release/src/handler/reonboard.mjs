import { boomify } from '@hapi/boom';
import axios from 'axios';

import config from '../config.mjs';

export default async function reonboard(request, h) {
    if (config.server?.auth) {
        const authHeader = request.headers['authorization'];
        if (authHeader !== config.server.auth) return h.response({ message: 'Unauthorized' }).code(401);
    }
    const pm = request.query.pm || '';
    return Promise.all(pm.split(',').map(name =>
        axios.post(`http://${name}.svc.cluster.local/reonboard`, {
            reason: 'release-cd-triggered reonboard'
        }).then(response => ({
            pm: name,
            ...response.data
        })).catch(error => boomify(error, {
            message: `Error re-onboarding PM ${name}`,
            data: error.response?.data
        }))
    ))
}
