import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('messages', (t) => {
    t.uuid('forwarded_from_id').nullable().references('id').inTable('messages').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('messages', (t) => {
    t.dropColumn('forwarded_from_id');
  });
}
