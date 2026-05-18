import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check`);
  await knex.raw(`
    ALTER TABLE messages ADD CONSTRAINT messages_type_check
    CHECK (type IN ('text', 'image', 'file', 'audio', 'sticker', 'call_log', 'system'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check`);
  await knex.raw(`
    ALTER TABLE messages ADD CONSTRAINT messages_type_check
    CHECK (type IN ('text', 'image', 'file', 'audio', 'call_log', 'system'))
  `);
}
