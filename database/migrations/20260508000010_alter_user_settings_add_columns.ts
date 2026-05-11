import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (table) => {
    table.enum('phone_number_visibility', ['everyone', 'contacts', 'nobody']).notNullable().defaultTo('contacts');
    table.enum('groups_add_permission', ['everyone', 'contacts', 'nobody']).notNullable().defaultTo('everyone');
    table.enum('chat_wallpaper_type', ['none', 'gallery', 'color']).notNullable().defaultTo('none');
    table.text('chat_wallpaper_value').nullable();
    table.enum('font_size', ['small', 'medium', 'large', 'extra_large']).notNullable().defaultTo('medium');
    table.boolean('do_not_disturb').notNullable().defaultTo(false);
    table.boolean('notify_messages').notNullable().defaultTo(true);
    table.boolean('notify_groups').notNullable().defaultTo(true);
    table.boolean('notify_calls').notNullable().defaultTo(true);
    table.boolean('auto_download_wifi').notNullable().defaultTo(true);
    table.boolean('auto_download_cellular').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (table) => {
    table.dropColumn('phone_number_visibility');
    table.dropColumn('groups_add_permission');
    table.dropColumn('chat_wallpaper_type');
    table.dropColumn('chat_wallpaper_value');
    table.dropColumn('font_size');
    table.dropColumn('do_not_disturb');
    table.dropColumn('notify_messages');
    table.dropColumn('notify_groups');
    table.dropColumn('notify_calls');
    table.dropColumn('auto_download_wifi');
    table.dropColumn('auto_download_cellular');
  });
}
