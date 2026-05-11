import type { Knex } from 'knex';
import * as bcrypt from 'bcryptjs';

const PASSWORD = 'Test@1234';

const users = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    username: 'sokheng',
    display_name: 'Sokheng Sreng',
    email: 'sokheng@example.com',
    bd_number: '+85510000001',
    avatar_url: 'https://picsum.photos/seed/sokheng/200',
    bio: 'Hey there! I am using Besdong.',
    role: 'admin',
    is_active: true,
    is_verified: true,
    is_online: false,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    username: 'dara_meas',
    display_name: 'Dara Meas',
    email: 'dara@example.com',
    bd_number: '+85510000002',
    avatar_url: 'https://picsum.photos/seed/dara/200',
    bio: 'Living life one chat at a time.',
    role: 'user',
    is_active: true,
    is_verified: true,
    is_online: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    username: 'chanthy_keo',
    display_name: 'Chanthy Keo',
    email: 'chanthy@example.com',
    bd_number: '+85510000003',
    avatar_url: 'https://picsum.photos/seed/chanthy/200',
    bio: 'Coffee lover ☕',
    role: 'user',
    is_active: true,
    is_verified: true,
    is_online: false,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000004',
    username: 'virak_lim',
    display_name: 'Virak Lim',
    email: 'virak@example.com',
    bd_number: '+85510000004',
    avatar_url: 'https://picsum.photos/seed/virak/200',
    bio: 'Developer by day, gamer by night.',
    role: 'user',
    is_active: true,
    is_verified: false,
    is_online: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000005',
    username: 'sreymom_ny',
    display_name: 'Sreymom Ny',
    email: 'sreymom@example.com',
    bd_number: '+85510000005',
    avatar_url: 'https://picsum.photos/seed/sreymom/200',
    bio: 'Spreading good vibes only ✨',
    role: 'user',
    is_active: true,
    is_verified: true,
    is_online: false,
  },
];

export async function seed(knex: Knex): Promise<void> {
  // Clean in reverse FK order
  await knex('messages').whereIn('sender_id', users.map((u) => u.id)).delete();
  await knex('participants').whereIn('user_id', users.map((u) => u.id)).delete();
  await knex('conversations').whereIn('created_by', users.map((u) => u.id)).delete();
  await knex('user_settings').whereIn('user_id', users.map((u) => u.id)).delete();
  await knex('user_identities').whereIn('user_id', users.map((u) => u.id)).delete();
  await knex('users').whereIn('id', users.map((u) => u.id)).delete();

  const passwordHash = bcrypt.hashSync(PASSWORD, 10);

  // Insert users
  await knex('users').insert(users);

  // Insert local identities
  await knex('user_identities').insert(
    users.map((u) => ({
      user_id: u.id,
      provider: 'local',
      email: u.email,
      password_hash: passwordHash,
    })),
  );

  // Insert default settings
  await knex('user_settings').insert(
    users.map((u) => ({ user_id: u.id })),
  );

  // ── Conversations ────────────────────────────────────────────────────────

  const directConvId = 'b2000000-0000-0000-0000-000000000001';
  const groupConvId  = 'b2000000-0000-0000-0000-000000000002';

  await knex('conversations').insert([
    {
      id: directConvId,
      type: 'direct',
      created_by: users[0].id,
    },
    {
      id: groupConvId,
      type: 'group',
      name: 'Besdong Dev Team',
      description: 'Internal dev group chat',
      avatar_url: 'https://picsum.photos/seed/devteam/200',
      created_by: users[0].id,
    },
  ]);

  // ── Participants ─────────────────────────────────────────────────────────

  await knex('participants').insert([
    // Direct: sokheng ↔ dara
    { conversation_id: directConvId, user_id: users[0].id, role: 'member' },
    { conversation_id: directConvId, user_id: users[1].id, role: 'member' },
    // Group: all 5 users, sokheng is owner
    { conversation_id: groupConvId, user_id: users[0].id, role: 'owner' },
    { conversation_id: groupConvId, user_id: users[1].id, role: 'admin' },
    { conversation_id: groupConvId, user_id: users[2].id, role: 'member' },
    { conversation_id: groupConvId, user_id: users[3].id, role: 'member' },
    { conversation_id: groupConvId, user_id: users[4].id, role: 'member' },
  ]);

  // ── Messages ─────────────────────────────────────────────────────────────

  await knex('messages').insert([
    // Direct conversation
    {
      conversation_id: directConvId,
      sender_id: users[0].id,
      content: 'Hey Dara! How are you?',
      type: 'text',
    },
    {
      conversation_id: directConvId,
      sender_id: users[1].id,
      content: 'I am good, thanks! What about you?',
      type: 'text',
    },
    {
      conversation_id: directConvId,
      sender_id: users[0].id,
      content: 'Doing great! Just testing our new messenger 😄',
      type: 'text',
    },
    // Group conversation
    {
      conversation_id: groupConvId,
      sender_id: users[0].id,
      content: 'Welcome everyone to the dev team group!',
      type: 'text',
    },
    {
      conversation_id: groupConvId,
      sender_id: users[1].id,
      content: 'Thanks for adding us 🙌',
      type: 'text',
    },
    {
      conversation_id: groupConvId,
      sender_id: users[2].id,
      content: 'Excited to be here!',
      type: 'text',
    },
    {
      conversation_id: groupConvId,
      sender_id: users[3].id,
      content: 'Let\'s ship something great 🚀',
      type: 'text',
    },
  ]);

  console.log(`✓ Seeded ${users.length} users — password for all: ${PASSWORD}`);
  console.log('✓ Seeded 2 conversations (1 direct, 1 group) with messages');
}
