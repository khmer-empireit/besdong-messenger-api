import type { Knex } from 'knex';

const METHODS = ['local', 'google', 'facebook', 'apple', 'telegram'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('auth_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .enum('method', [...METHODS])
      .notNullable()
      .unique();
    table.boolean('is_enabled').notNullable().defaultTo(true);
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex('auth_config').insert(
    METHODS.map((method) => ({ method, is_enabled: true })),
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('auth_config');
}
