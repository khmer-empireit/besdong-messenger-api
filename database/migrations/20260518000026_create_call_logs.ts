import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('call_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    t.uuid('caller_id').notNullable().references('id').inTable('users');
    t.uuid('callee_id').notNullable().references('id').inTable('users');
    t.string('call_type', 10).notNullable();
    t.string('status', 20).notNullable();
    t.integer('duration').nullable();
    t.timestamp('started_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('ended_at', { useTz: true }).nullable();
  });

  await knex.schema.raw('CREATE INDEX call_logs_caller_id_idx ON call_logs(caller_id)');
  await knex.schema.raw('CREATE INDEX call_logs_callee_id_idx ON call_logs(callee_id)');
  await knex.schema.raw('CREATE INDEX call_logs_started_at_idx ON call_logs(started_at DESC)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('call_logs');
}
