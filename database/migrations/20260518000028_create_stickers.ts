import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stickers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('pack_id').notNullable().references('id').inTable('sticker_packs').onDelete('CASCADE');
    t.string('name', 100).notNullable();
    t.text('media_url').notNullable();
    t.text('media_key').notNullable();
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('stickers', (t) => {
    t.index('pack_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('stickers');
}
