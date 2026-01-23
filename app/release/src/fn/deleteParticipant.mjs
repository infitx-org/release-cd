/**
 * Delete all records related to a participant by name
 *
 * This function removes all data associated with a participant across all related tables,
 * respecting foreign key constraints by deleting in the correct order (child tables first).
 *
 * @param {Object} knex - Knex instance for database operations
 * @param {string} name - The participant name to delete
 * @returns {Promise<Object>} - Object containing deletion statistics for each table
 */
export default async function deleteParticipantByName(knex, name, log) {
  const deletionStats = {};

  // Helper function to delete from a table with specified conditions
  const deleteFromTable = async (trx, tableName, whereClause) => {
    const query = trx(tableName);

    if (whereClause.whereIn) {
      const { column, values } = whereClause.whereIn;
      if (values.length === 0) {
        deletionStats[tableName] = 0;
        return 0;
      }
      query.whereIn(column, values);
    } else if (whereClause.where) {
      query.where(whereClause.where);
    }

    const count = await query.del();
    deletionStats[tableName] = count;
    log(`Deleted ${count} ${tableName} records`);
    return count;
  };

  // Start a transaction to ensure all deletions succeed or all fail
  await knex.transaction(async (trx) => {
    // Step 1: Get the participantId from the participant name
    const participant = await trx('participant')
      .where({ name })

      .first();

    if (!participant) {
      log(`Participant with name ${name} not found`);
      return;
    }

    const participantId = participant.participantId;
    log(`Found participant: ${name} with ID: ${participantId}`);

    // Step 2: Get all participantCurrencyIds for this participant
    const participantCurrencies = await trx('participantCurrency')
      .where({ participantId })
      .select('participantCurrencyId');

    const participantCurrencyIds = participantCurrencies.map(pc => pc.participantCurrencyId);
    log(`Found ${participantCurrencyIds.length} currency records for this participant`);

    // Step 3: Get all participantPositionIds for these currencies
    let participantPositionIds = [];
    if (participantCurrencyIds.length > 0) {
      const participantPositions = await trx('participantPosition')
        .whereIn('participantCurrencyId', participantCurrencyIds)
        .select('participantPositionId');

      participantPositionIds = participantPositions.map(pp => pp.participantPositionId);
      log(`Found ${participantPositionIds.length} position records`);
    }

    // Step 4: Delete in reverse dependency order (deepest children first)

    // Level 4: Delete records related to participantPositionId
    const level4Tables = [
      { name: 'participantPositionChange', column: 'participantPositionId', ids: participantPositionIds }
    ];

    for (const table of level4Tables) {
      await deleteFromTable(trx, table.name, {
        whereIn: { column: table.column, values: table.ids }
      });
    }

    // Level 3: Delete records related to participantCurrencyId
    const level3Tables = [
      'participantPosition',
      'participantLimit',
      'transferParticipant',
      'fxTransferParticipant',
      'settlementParticipantCurrency',
      'settlementTransferParticipant',
      'settlementContentAggregation'
    ];

    for (const tableName of level3Tables) {
      await deleteFromTable(trx, tableName, {
        whereIn: { column: 'participantCurrencyId', values: participantCurrencyIds }
      });
    }

    // Level 2: Delete direct children of participant
    const level2Tables = [
      'participantCurrency',
      'participantContact',
      'participantEndpoint',
      'participantParty',
      'token',
      'quoteParty'
    ];

    for (const tableName of level2Tables) {
      await deleteFromTable(trx, tableName, {
        where: { participantId }
      });
    }

    // Level 1: Delete the participant record itself
    await deleteFromTable(trx, 'participant', {
      where: { participantId }
    });

    log('\nDeletion completed successfully!');
  });

  return {
    success: true,
    message: `Successfully deleted participant '${name}' and all related records`,
    stats: deletionStats
  };
}
