import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 50).notNullable().unique();
    table.string('display_name', 100).notNullable();
    table.string('phone', 20).nullable().unique();
    table.string('avatar_url', 500).nullable();
    table.boolean('is_online').notNullable().defaultTo(false);
    table.timestamp('last_seen_at').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
