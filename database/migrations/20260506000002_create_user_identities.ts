import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_identities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .enum('provider', ['local', 'google', 'facebook', 'apple'])
      .notNullable();
    table.string('provider_user_id', 255).nullable();
    table.string('email', 255).notNullable();
    table.string('password_hash', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['provider', 'email']);
    table.index('user_id');
    table.index('email');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_identities');
}
