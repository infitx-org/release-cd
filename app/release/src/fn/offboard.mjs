import knex from 'knex';
import config from '../config.mjs';
import deleteParticipantByName from './deleteParticipant.mjs';

export default async function offboard(dfsp) {
    const startTime = Date.now();
    const result = [];
    const log = string => {
        console.log(new Date(), '... ' + string);
        result.push(string);
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

    const mojaloop = knex(config.mojaloop.db);
    try {
        log(`Starting offboard of DFSP ${dfsp} within the Mojaloop database`);
        await deleteParticipantByName(mojaloop, dfsp, log);
    } finally {
        await mojaloop.destroy();
    }

    log(`Offboard of DFSP ${dfsp} completed in ${(Date.now() - startTime) / 1000}s`);

    return result.join('\n');
}
