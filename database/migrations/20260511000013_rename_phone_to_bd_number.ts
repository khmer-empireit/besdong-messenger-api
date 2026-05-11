import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE users RENAME COLUMN phone TO bd_number');
  await knex.raw(
    'ALTER TABLE user_settings RENAME COLUMN phone_number_visibility TO bd_number_visibility',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE users RENAME COLUMN bd_number TO phone');
  await knex.raw(
    'ALTER TABLE user_settings RENAME COLUMN bd_number_visibility TO phone_number_visibility',
  );
}
