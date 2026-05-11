import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE user_identities
    DROP CONSTRAINT IF EXISTS user_identities_provider_check
  `);

  await knex.raw(`
    ALTER TABLE user_identities
    ADD CONSTRAINT user_identities_provider_check
    CHECK (provider IN ('local', 'google', 'facebook', 'apple', 'telegram'))
  `);

  await knex.schema.alterTable('user_identities', (table) => {
    table.string('email', 255).nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE user_identities
    DROP CONSTRAINT IF EXISTS user_identities_provider_check
  `);

  await knex.raw(`
    ALTER TABLE user_identities
    ADD CONSTRAINT user_identities_provider_check
    CHECK (provider IN ('local', 'google', 'facebook', 'apple'))
  `);

  await knex.schema.alterTable('user_identities', (table) => {
    table.string('email', 255).notNullable().alter();
  });
}
