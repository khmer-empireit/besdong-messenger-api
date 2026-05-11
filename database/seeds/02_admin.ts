import type { Knex } from 'knex';
import * as bcrypt from 'bcryptjs';

const ADMIN_ID = 'a0000000-0000-0000-0000-000000000001';
const PASSWORD = 'Admin@Besdong2026!';

const admin = {
  id: ADMIN_ID,
  username: 'besdong_admin',
  display_name: 'Besdong Administrator',
  email: 'admin@besdong.com',
  bd_number: null,
  avatar_url: null,
  bio: 'System administrator account.',
  role: 'admin',
  is_active: true,
  is_verified: true,
  is_online: false,
};

export async function seed(knex: Knex): Promise<void> {
  await knex('user_settings').where({ user_id: ADMIN_ID }).delete();
  await knex('user_identities').where({ user_id: ADMIN_ID }).delete();
  await knex('users').where({ id: ADMIN_ID }).delete();

  const passwordHash = bcrypt.hashSync(PASSWORD, 12);

  await knex('users').insert(admin);

  await knex('user_identities').insert({
    user_id: ADMIN_ID,
    provider: 'local',
    email: admin.email,
    password_hash: passwordHash,
  });

  await knex('user_settings').insert({ user_id: ADMIN_ID });

  console.log(`✓ Admin user seeded`);
  console.log(`  email:    ${admin.email}`);
  console.log(`  password: ${PASSWORD}`);
}
