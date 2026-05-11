import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('contacts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('contact_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['owner_id', 'contact_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('contacts');
}
