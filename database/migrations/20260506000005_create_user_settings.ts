import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Appearance
    table.enum('theme', ['light', 'dark', 'system']).notNullable().defaultTo('system');
    table.string('language', 10).notNullable().defaultTo('en');

    // Privacy
    table
      .enum('last_seen_visibility', ['everyone', 'contacts', 'nobody'])
      .notNullable()
      .defaultTo('everyone');
    table.boolean('read_receipts_enabled').notNullable().defaultTo(true);
    table.boolean('online_status_visible').notNullable().defaultTo(true);
    table
      .enum('profile_photo_visibility', ['everyone', 'contacts', 'nobody'])
      .notNullable()
      .defaultTo('everyone');

    // Notifications
    table.boolean('notifications_enabled').notNullable().defaultTo(true);
    table.boolean('message_previews_enabled').notNullable().defaultTo(true);

    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_settings');
}
