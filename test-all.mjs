import { io } from 'socket.io-client';

const BASE = 'http://localhost:3000/api/v1';
let passed = 0;
let failed = 0;

function ok(label) { console.log(`  ✓ ${label}`); passed++; }
function fail(label, err) { console.log(`  ✗ ${label}: ${err}`); failed++; }

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

// ── Auth ────────────────────────────────────────────────────────────────────

async function setupUsers() {
  const email1 = `user1_${Date.now()}@test.com`;
  const email2 = `user2_${Date.now()}@test.com`;

  const r1 = await req('POST', '/auth/register', { email: email1, password: 'password123', display_name: 'Test User One' });
  const r2 = await req('POST', '/auth/register', { email: email2, password: 'password123', display_name: 'Test User Two' });

  if (r1.status !== 201 || !r1.body.data?.access_token) throw new Error('User 1 register failed: ' + JSON.stringify(r1.body));
  if (r2.status !== 201 || !r2.body.data?.access_token) throw new Error('User 2 register failed: ' + JSON.stringify(r2.body));

  return {
    token1: r1.body.data.access_token,
    token2: r2.body.data.access_token,
  };
}

// ── User domain ──────────────────────────────────────────────────────────────

async function testUserDomain(token1) {
  console.log('\n── User domain ─────────────────────────────');

  // GET /users/me
  const me = await req('GET', '/users/me', null, token1);
  me.status === 200 && me.body.data?.id
    ? ok('GET /users/me')
    : fail('GET /users/me', JSON.stringify(me.body));

  // PATCH /users/me
  const patch = await req('PATCH', '/users/me', { display_name: 'Updated Name' }, token1);
  patch.status === 200 && patch.body.data?.display_name === 'Updated Name'
    ? ok('PATCH /users/me')
    : fail('PATCH /users/me', JSON.stringify(patch.body));

  // GET /users/me/settings
  const settings = await req('GET', '/users/me/settings', null, token1);
  settings.status === 200 && settings.body.data?.theme
    ? ok('GET /users/me/settings')
    : fail('GET /users/me/settings', JSON.stringify(settings.body));

  // PATCH /users/me/settings
  const patchSettings = await req('PATCH', '/users/me/settings', { theme: 'dark', language: 'km' }, token1);
  patchSettings.status === 200 && patchSettings.body.data?.theme === 'dark'
    ? ok('PATCH /users/me/settings')
    : fail('PATCH /users/me/settings', JSON.stringify(patchSettings.body));

  // GET /users/search
  const search = await req('GET', '/users/search?q=Updated', null, token1);
  search.status === 200 && Array.isArray(search.body.data)
    ? ok('GET /users/search')
    : fail('GET /users/search', JSON.stringify(search.body));

  // GET /users/:id
  const userId = me.body.data?.id;
  const profile = await req('GET', `/users/${userId}`, null, token1);
  profile.status === 200 && profile.body.data?.id === userId
    ? ok('GET /users/:id')
    : fail('GET /users/:id', JSON.stringify(profile.body));

  return me.body.data?.id;
}

// ── Conversation domain ───────────────────────────────────────────────────────

async function testConversationDomain(token1, token2) {
  console.log('\n── Conversation domain ─────────────────────');

  // Get user2 id
  const me2 = await req('GET', '/users/me', null, token2);
  const user2Id = me2.body.data?.id;

  // POST /conversations (direct)
  const create = await req('POST', '/conversations', { type: 'direct', member_ids: [user2Id] }, token1);
  create.status === 201 && create.body.data?.type === 'direct'
    ? ok('POST /conversations (direct)')
    : fail('POST /conversations (direct)', JSON.stringify(create.body));
  const convId = create.body.data?.id;

  // POST /conversations again (should return existing)
  const createAgain = await req('POST', '/conversations', { type: 'direct', member_ids: [user2Id] }, token1);
  createAgain.status === 201 && createAgain.body.data?.id === convId
    ? ok('POST /conversations (returns existing direct)')
    : fail('POST /conversations (returns existing direct)', JSON.stringify(createAgain.body));

  // POST /conversations (group)
  const group = await req('POST', '/conversations', { type: 'group', name: 'Test Group', member_ids: [user2Id] }, token1);
  group.status === 201 && group.body.data?.type === 'group'
    ? ok('POST /conversations (group)')
    : fail('POST /conversations (group)', JSON.stringify(group.body));
  const groupId = group.body.data?.id;

  // GET /conversations
  const list = await req('GET', '/conversations', null, token1);
  list.status === 200 && Array.isArray(list.body.data)
    ? ok('GET /conversations')
    : fail('GET /conversations', JSON.stringify(list.body));

  // GET /conversations/:id
  const detail = await req('GET', `/conversations/${convId}`, null, token1);
  detail.status === 200 && detail.body.data?.participants?.length === 2
    ? ok('GET /conversations/:id (with participants)')
    : fail('GET /conversations/:id', JSON.stringify(detail.body));

  // PATCH /conversations/:id (group only)
  const update = await req('PATCH', `/conversations/${groupId}`, { name: 'Renamed Group' }, token1);
  update.status === 200 && update.body.data?.name === 'Renamed Group'
    ? ok('PATCH /conversations/:id (rename group)')
    : fail('PATCH /conversations/:id', JSON.stringify(update.body));

  // POST /conversations/:id/mute
  const mute = await req('POST', `/conversations/${convId}/mute`, { duration: '1h' }, token1);
  mute.status === 200
    ? ok('POST /conversations/:id/mute')
    : fail('POST /conversations/:id/mute', JSON.stringify(mute.body));

  // DELETE /conversations/:id/mute
  const unmute = await req('DELETE', `/conversations/${convId}/mute`, null, token1);
  unmute.status === 200
    ? ok('DELETE /conversations/:id/mute')
    : fail('DELETE /conversations/:id/mute', JSON.stringify(unmute.body));

  return { convId, groupId, user2Id };
}

// ── Message domain ────────────────────────────────────────────────────────────

async function testMessageDomain(token1, token2, convId) {
  console.log('\n── Message domain ──────────────────────────');

  // POST /conversations/:id/messages
  const send = await req('POST', `/conversations/${convId}/messages`, { content: 'Hello from test!' }, token1);
  send.status === 201 && send.body.data?.content === 'Hello from test!'
    ? ok('POST /conversations/:id/messages (send)')
    : fail('POST /conversations/:id/messages', JSON.stringify(send.body));
  const msgId = send.body.data?.id;

  // Send a reply
  const reply = await req('POST', `/conversations/${convId}/messages`, { content: 'This is a reply', reply_to_id: msgId }, token1);
  reply.status === 201 && reply.body.data?.reply_to_id === msgId
    ? ok('POST /conversations/:id/messages (reply)')
    : fail('POST /conversations/:id/messages (reply)', JSON.stringify(reply.body));

  // GET /conversations/:id/messages
  const list = await req('GET', `/conversations/${convId}/messages`, null, token1);
  list.status === 200 && Array.isArray(list.body.data) && list.body.data.length >= 2
    ? ok('GET /conversations/:id/messages')
    : fail('GET /conversations/:id/messages', JSON.stringify(list.body));

  // GET with cursor pagination
  const cursor = await req('GET', `/conversations/${convId}/messages?cursor=${list.body.data[0]?.id}`, null, token1);
  cursor.status === 200 && Array.isArray(cursor.body.data)
    ? ok('GET /conversations/:id/messages?cursor (pagination)')
    : fail('GET /conversations/:id/messages?cursor', JSON.stringify(cursor.body));

  // PATCH /conversations/:id/messages/:msgId (edit)
  const edit = await req('PATCH', `/conversations/${convId}/messages/${msgId}`, { content: 'Edited message' }, token1);
  edit.status === 200 && edit.body.data?.is_edited === true && edit.body.data?.content === 'Edited message'
    ? ok('PATCH /conversations/:id/messages/:msgId (edit)')
    : fail('PATCH /conversations/:id/messages/:msgId', JSON.stringify(edit.body));

  // PATCH /conversations/:id/read
  const read = await req('PATCH', `/conversations/${convId}/read`, null, token2);
  read.status === 200
    ? ok('PATCH /conversations/:id/read (mark as read)')
    : fail('PATCH /conversations/:id/read', JSON.stringify(read.body));

  // DELETE /conversations/:id/messages/:msgId
  const del = await req('DELETE', `/conversations/${convId}/messages/${msgId}`, null, token1);
  del.status === 200
    ? ok('DELETE /conversations/:id/messages/:msgId (soft delete)')
    : fail('DELETE /conversations/:id/messages/:msgId', JSON.stringify(del.body));

  return msgId;
}

// ── WebSocket ────────────────────────────────────────────────────────────────

async function testWebSocket(token1, token2, convId) {
  console.log('\n── WebSocket / Real-time ───────────────────');

  return new Promise((resolve) => {
    const WS_URL = 'http://localhost:3000';
    const results = {};

    const client1 = io(`${WS_URL}/ws`, { auth: { token: `Bearer ${token1}` }, transports: ['websocket'] });
    const client2 = io(`${WS_URL}/ws`, { auth: { token: `Bearer ${token2}` }, transports: ['websocket'] });

    let c1Connected = false;
    let c2Connected = false;

    function tryJoin() {
      if (!c1Connected || !c2Connected) return;
      // Both connected — join conversation room
      client1.emit('conversation:join', { conversation_id: convId });
      client2.emit('conversation:join', { conversation_id: convId });

      // Give a tick for join to process
      setTimeout(runTests, 100);
    }

    client1.on('connect', () => { c1Connected = true; ok('Client 1 connected'); tryJoin(); });
    client2.on('connect', () => { c2Connected = true; ok('Client 2 connected'); tryJoin(); });
    client1.on('connect_error', (e) => fail('Client 1 connect', e.message));
    client2.on('connect_error', (e) => fail('Client 2 connect', e.message));

    // Client 2 listens for events from client 1
    client2.on('message:new', (msg) => {
      if (!results.messageNew) {
        results.messageNew = true;
        ok('message:new received on client 2');
      }
    });

    client2.on('message:read_receipt', (data) => {
      if (!results.readReceipt) {
        results.readReceipt = true;
        ok('message:read_receipt received on client 2');
      }
    });

    client2.on('typing:indicator', (data) => {
      if (!results.typing) {
        results.typing = true;
        ok(`typing:indicator received (is_typing: ${data.is_typing})`);
      }
    });

    client1.on('user:status', (data) => {
      if (!results.userStatus) {
        results.userStatus = true;
        ok(`user:status received (is_online: ${data.is_online})`);
      }
    });

    function runTests() {
      // Test typing indicator
      client1.emit('typing:start', { conversation_id: convId });

      // Test message:send via socket
      client1.emit('message:send', { conversation_id: convId, content: 'Hello via socket!' });

      // Test read receipt
      setTimeout(() => {
        client2.emit('message:read', { conversation_id: convId });
      }, 200);

      // Disconnect client2 to trigger user:status offline on client1
      setTimeout(() => {
        client2.disconnect();
      }, 400);

      // Wrap up after giving events time to arrive
      setTimeout(() => {
        if (!results.messageNew) fail('message:new', 'not received within timeout');
        if (!results.readReceipt) fail('message:read_receipt', 'not received within timeout');
        if (!results.typing) fail('typing:indicator', 'not received within timeout');
        if (!results.userStatus) fail('user:status (offline)', 'not received within timeout');
        client1.disconnect();
        resolve();
      }, 1500);
    }
  });
}

// ── Auth edge cases ───────────────────────────────────────────────────────────

async function testAuthEdgeCases() {
  console.log('\n── Auth edge cases ─────────────────────────');

  // 403 — non-member accessing conversation
  const stranger = await req('POST', '/auth/register', {
    email: `stranger_${Date.now()}@test.com`,
    password: 'password123',
    display_name: 'Stranger',
  });
  const strangerToken = stranger.body.data?.access_token;

  const fakeConvId = '00000000-0000-0000-0000-000000000000';
  const forbidden = await req('GET', `/conversations/${fakeConvId}`, null, strangerToken);
  forbidden.status === 403 || forbidden.status === 404
    ? ok('Non-member gets 403/404 on conversation')
    : fail('Non-member access check', `got ${forbidden.status}`);

  // 401 — no token
  const unauth = await req('GET', '/users/me', null, null);
  unauth.status === 401
    ? ok('No token returns 401')
    : fail('No token check', `got ${unauth.status}`);
}

// ── Run all ────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting full API + WebSocket test suite...\n');

  try {
    const { token1, token2 } = await setupUsers();
    ok('Two test users registered');

    const user1Id = await testUserDomain(token1);
    const { convId, groupId } = await testConversationDomain(token1, token2);
    await testMessageDomain(token1, token2, convId);
    await testWebSocket(token1, token2, convId);
    await testAuthEdgeCases();

  } catch (err) {
    fail('Test suite setup', err.message);
  }

  console.log(`\n${'─'.repeat(44)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${'─'.repeat(44)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
