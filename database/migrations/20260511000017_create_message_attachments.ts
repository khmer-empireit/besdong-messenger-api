import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('message_attachments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    table.text('url').notNullable();
    table.text('key').notNullable();
    table.enum('type', ['image', 'file', 'audio', 'video']).notNullable();
    table.string('mime_type', 100).notNullable();
    table.integer('size').notNullable();
    table.integer('width').nullable();
    table.integer('height').nullable();
    table.string('file_name', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['message_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('message_attachments');
}
