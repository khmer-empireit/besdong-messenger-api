import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('participants', (t) => {
    t.boolean('is_pinned').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('participants', (t) => {
    t.dropColumn('is_pinned');
  });
}
