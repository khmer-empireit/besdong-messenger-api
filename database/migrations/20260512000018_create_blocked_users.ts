import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('blocked_users', (t) => {
    t.uuid('blocker_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('blocked_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['blocker_id', 'blocked_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('blocked_users');
}
