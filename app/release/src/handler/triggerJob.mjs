import { exec } from 'child_process';
import config from '../config.mjs';

export default async function triggerCronJob(request, h) {
    if (config.server?.auth) {
        const authHeader = request.headers['authorization'];
        if (authHeader !== config.server.auth) return h.response({ message: 'Unauthorized' }).code(401);
    }
    // use kubectl to trigger the cronjob
    return new Promise((resolve) => {
        exec(`kubectl -n ${request.params.namespace} create job --from=cronjob/${request.params.job} ${request.params.job}-release-cd-$(date +%s)`, (error, stdout) => {
            if (error) {
                resolve(h.response(`Error triggering cronjob: ${error.message}`).code(500));
            } else {
                resolve(h.response(`Cronjob triggered successfully: ${stdout}`).code(200));
            }
        });
    });
}
