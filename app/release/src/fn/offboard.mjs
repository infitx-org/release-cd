import knex from 'knex';
import config from '../config.mjs';
import { k8sApi } from '../k8s.mjs';
import notifyRelease from '../release.mjs';
import deleteParticipantByName from './deleteParticipant.mjs';

export default async function offboard(dfsp) {
    const startTime = Date.now();
    const result = [];
    const log = string => {
        console.log(new Date(), '... ' + string);
        result.push(string);
    }
    try {
        if (!config.mcm?.db?.connection?.password) {
            config.mcm.db.connection.password = Buffer.from((await k8sApi.readNamespacedSecret({
                name: 'mcm-db-secret',
                namespace: 'mcm'
            })).data['mysql-password'], 'base64').toString('utf8');
        }
        const mcm = knex(config.mcm.db);
        try {
            log(`Starting offboard of DFSP ${dfsp} within the MCM database`);
            for (const table of ['inbound_enrollments', 'outbound_enrollments', 'dfsp_endpoint_items', 'dfsp_cas', 'dfsp_server_certs', 'dfsp_endpoint']) {
                const result = await mcm(table)
                    .join('dfsps', `${table}.dfsp_id`, 'dfsps.id')
                    .where('dfsps.name', dfsp)
                    .del();
                log(`Deleted ${result} rows from ${table}`);
            }
            log(`Offboard completed in ${Date.now() - startTime}ms`);
        } finally {
            await mcm.destroy();
        }

        if (!config.mojaloop?.db?.connection?.password) {
            config.mojaloop.db.connection.password = Buffer.from((await k8sApi.readNamespacedSecret({
                name: 'central-ledger-db-secret',
                namespace: 'mojaloop'
            })).data['mysql-password'], 'base64').toString('utf8');
        }
        const mojaloop = knex(config.mojaloop.db);
        try {
            log(`Starting offboard of DFSP ${dfsp} within the Mojaloop database`);
            await deleteParticipantByName(mojaloop, dfsp, log);
        } finally {
            await mojaloop.destroy();
        }

        log(`Offboard of DFSP ${dfsp} completed in ${(Date.now() - startTime) / 1000}s`);

        notifyRelease({
            reportId: `offboard-${dfsp}`,
            totalAssertions: 1,
            totalPassedAssertions: 1,
            isPassed: true,
            duration: Date.now() - startTime,
            report: {
                body: result.join('\n'),
                contentType: 'text/plain'
            }
        }).catch(err => {
            console.error(new Date(), 'Error notifying release:', err);
        });

        return result.join('\n');
    } catch (error) {
        console.error(new Date(), 'Offboarding error:', error);
        log(`Offboarding of ${dfsp} failed: ${error.message}`);
        notifyRelease({
            reportId: `offboard-${dfsp}`,
            totalAssertions: 1,
            totalPassedAssertions: 0,
            isPassed: false,
            duration: Date.now() - startTime,
            report: {
                body: result.join('\n') + '\n==============\nError: ' + error.message + '\n\n' + error.stack,
                contentType: 'text/plain'
            }
        }).catch(err => {
            console.error(new Date(), 'Error notifying release of offboarding failure:', err);
        });
        throw error;
    }
}
