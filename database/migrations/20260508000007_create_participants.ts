import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('participants', (table) => {
    table.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['owner', 'admin', 'member']).notNullable().defaultTo('member');
    table.timestamp('joined_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('muted_until', { useTz: true }).nullable();
    table.timestamp('last_read_at', { useTz: true }).nullable();

    table.primary(['conversation_id', 'user_id']);
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('participants');
}
