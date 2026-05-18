import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('story_views', (t) => {
    t.uuid('story_id').notNullable().references('id').inTable('stories').onDelete('CASCADE');
    t.uuid('viewer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('viewed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['story_id', 'viewer_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('story_views');
}
