import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.uuid('sender_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('content').notNullable();
    table.enum('type', ['text']).notNullable().defaultTo('text');
    table.uuid('reply_to_id').nullable().references('id').inTable('messages').onDelete('SET NULL');
    table.boolean('is_edited').notNullable().defaultTo(false);
    table.timestamp('edited_at', { useTz: true }).nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['conversation_id', 'created_at']);
    table.index('sender_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('messages');
}
