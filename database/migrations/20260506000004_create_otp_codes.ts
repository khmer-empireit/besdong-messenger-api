import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('otp_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('code_hash', 64).notNullable();
    table
      .enum('purpose', ['reset_password', 'verify_email'])
      .notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'purpose']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('otp_codes');
}
