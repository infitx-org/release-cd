import { exec } from 'child_process';

export default async function triggerCronJob(request, h) {
    const command = request.body?.args
        ? `kubectl -n ${request.params.namespace} create job --from=cronjob/${request.params.job} ${request.params.job}-release-cd-$(date +%s) --dry-run=client -o yaml | kubectl patch --dry-run=client -o yaml --type json --patch '[{ "op": "replace", "path": "/spec/template/spec/containers/0/args", "value": ${JSON.stringify(request.body.args)} }]' -f - | kubectl apply -f -`
        : `kubectl -n ${request.params.namespace} create job --from=cronjob/${request.params.job} ${request.params.job}-release-cd-$(date +%s)`
    // use kubectl to trigger the cronjob
    return new Promise((resolve) => {
        exec(command, (error, stdout) => {
            if (error) {
                resolve(h.response(`Error triggering cronjob: ${error.message}`).code(500));
            } else {
                resolve(h.response(`Cronjob triggered successfully: ${stdout}`).code(200));
            }
        });
    });
}
