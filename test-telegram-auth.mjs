/**
 * Generates a valid Telegram auth payload (correct HMAC) and hits POST /v1/auth/telegram.
 * Usage: node test-telegram-auth.mjs <bot_token> [base_url]
 *
 * Example:
 *   node test-telegram-auth.mjs 7654321:ABCdef123... http://localhost:3000
 */

import crypto from 'crypto';

const botToken = process.argv[2];
const baseUrl = process.argv[3] ?? 'http://localhost:3000';

if (!botToken) {
  console.error('Usage: node test-telegram-auth.mjs <bot_token> [base_url]');
  process.exit(1);
}

// Build a fake-but-realistic Telegram user payload
const fields = {
  id: 123456789,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
  photo_url: 'https://t.me/i/userpic/320/testuser.jpg',
  auth_date: Math.floor(Date.now() / 1000),
};

// Compute hash exactly as Telegram specifies
const dataCheckString = Object.keys(fields)
  .sort()
  .map((k) => `${k}=${fields[k]}`)
  .join('\n');

const secretKey = crypto.createHash('sha256').update(botToken).digest();
const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

const payload = { ...fields, hash };

console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('\nPOST', `${baseUrl}/api/v1/auth/telegram`);

const res = await fetch(`${baseUrl}/api/v1/auth/telegram`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const body = await res.json();
console.log('\nStatus:', res.status);
console.log('Response:', JSON.stringify(body, null, 2));

// Second call — should return tokens for the same existing user (no duplicate)
console.log('\n--- Second call (same user, should reuse) ---');
const res2 = await fetch(`${baseUrl}/api/v1/auth/telegram`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const body2 = await res2.json();
console.log('Status:', res2.status);
console.log('Response:', JSON.stringify(body2, null, 2));

// Third call — tampered hash, should 401
console.log('\n--- Third call (bad hash, should 401) ---');
const res3 = await fetch(`${baseUrl}/api/v1/auth/telegram`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...payload, hash: 'deadbeef' }),
});
const body3 = await res3.json();
console.log('Status:', res3.status);
console.log('Response:', JSON.stringify(body3, null, 2));
