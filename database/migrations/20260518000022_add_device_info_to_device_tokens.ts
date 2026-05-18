import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('device_tokens', (t) => {
    t.string('device_name', 255).nullable();
    t.string('os_version', 100).nullable();
    t.string('app_version', 50).nullable();
    t.string('address', 500).nullable();
    t.timestamp('last_login_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('device_tokens', (t) => {
    t.dropColumn('device_name');
    t.dropColumn('os_version');
    t.dropColumn('app_version');
    t.dropColumn('address');
    t.dropColumn('last_login_at');
  });
}
