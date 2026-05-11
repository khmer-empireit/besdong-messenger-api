import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('email', 255).nullable().unique();
    table.text('bio').nullable();
    table.date('dob').nullable();
    table.enum('role', ['user', 'admin']).notNullable().defaultTo('user');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_verified').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('email');
    table.dropColumn('bio');
    table.dropColumn('dob');
    table.dropColumn('role');
    table.dropColumn('is_active');
    table.dropColumn('is_verified');
  });
}
