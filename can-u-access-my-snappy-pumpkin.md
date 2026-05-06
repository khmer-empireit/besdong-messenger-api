# 🗺️ Besdong Messenger API — Implementation Plan

> [!NOTE] Context
> Based on the Figma design (Besdong Chat App) which contains ~44 screens covering auth, direct messaging, group chat, stories, calling, settings, and safety features. The backend is a skeleton: Express + PostgreSQL, zero implemented endpoints. Everything follows the existing **Controller → Service → Repository** pattern.

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js (CommonJS) |
| Framework | Express 5.x |
| Database | PostgreSQL (`pg`) |
| Auth | JWT + bcryptjs |
| Real-time | Socket.io |
| Validation | express-validator |

**Packages to add:**
```bash
npm install jsonwebtoken bcryptjs express-validator socket.io
```

---

## 🗃️ Phase 1 — Foundation

> [!IMPORTANT] Do this first — everything depends on it

### Database Schema

- [ ] Create `src/migrations/` directory
- [ ] `001_users.sql`
- [ ] `002_user_identities.sql`
- [ ] `003_auth_tokens.sql`
- [ ] `004_otp_codes.sql`
- [ ] `005_push_tokens.sql`
- [ ] `006_contacts.sql`
- [ ] `007_user_settings.sql`
- [ ] `008_subscriptions.sql`
- [ ] `009_conversations.sql`
- [ ] `010_participants.sql`
- [ ] `011_stories.sql`           ← must be before messages (story_id FK)
- [ ] `012_messages.sql`
- [ ] `013_message_attachments.sql`
- [ ] `014_message_reactions.sql`
- [ ] `015_story_views.sql`
- [ ] `016_blocks.sql`
- [ ] `017_reports.sql`
- [ ] `018_calls.sql`

**Tables:**

> [!TIP] Design principles
> - UUIDs for all primary keys (portable, no sequential guessing)
> - `TIMESTAMPTZ` for all timestamps (timezone-aware)
> - Soft deletes on messages only (`deleted_at`) — hard delete everything else
> - Composite PKs on junction tables (participants, blocks, story_views, reactions)
> - `ON DELETE CASCADE` where child rows are meaningless without parent
> - `ON DELETE SET NULL` where historical record should survive (e.g. a deleted user's messages)

---

#### `users`
```sql
-- Profile only — zero auth-specific fields here
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE,              -- nullable: some OAuth users may not share email
  phone_number  VARCHAR(20),                      -- optional, used for contact matching
  avatar_url    TEXT,
  bio           TEXT,
  dob           DATE,                             -- optional, date of birth
  role          VARCHAR(10)  NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user', 'admin')),
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  is_verified   BOOLEAN      NOT NULL DEFAULT false,
  is_online     BOOLEAN      NOT NULL DEFAULT false,
  last_seen     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email    ON users (email);
CREATE INDEX idx_users_username ON users (username);
```

---

#### `user_identities` *(all auth methods — local + social)*
```sql
-- One row per login method per user.
-- A user can have multiple rows (e.g. local + google + facebook).
CREATE TABLE user_identities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         VARCHAR(20)  NOT NULL
                     CHECK (provider IN ('local', 'google', 'facebook', 'apple')),
  provider_user_id VARCHAR(255) NOT NULL, -- for local: user's email; for OAuth: provider's sub/id
  password_hash    VARCHAR(255),          -- only set when provider = 'local'; NULL for social logins
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)     -- prevents duplicate provider links
);
CREATE INDEX idx_identities_user ON user_identities (user_id);
```

---

#### `auth_tokens` *(refresh token store)*
```sql
CREATE TABLE auth_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  device_info TEXT,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_auth_tokens_user ON auth_tokens (user_id);
```

---

#### `contacts` *(phone book sync + invite tracking)*
```sql
CREATE TABLE contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_user_id  UUID         REFERENCES users(id) ON DELETE SET NULL, -- NULL if not on app yet
  phone_number     TEXT,                           -- from phone book, used for matching & invite
  nickname         TEXT,                           -- custom name override (e.g. "Mum")
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('registered', 'invited', 'pending')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, phone_number)                  -- no duplicate phone entries per user
);
CREATE INDEX idx_contacts_user         ON contacts (user_id);
CREATE INDEX idx_contacts_contact_user ON contacts (contact_user_id);
```

---

#### `push_tokens` *(device tokens for FCM / APNS notifications)*
```sql
CREATE TABLE push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,
  platform   VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_push_tokens_user ON push_tokens (user_id);
```

---

#### `otp_codes` *(password reset / email verification)*
```sql
CREATE TABLE otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code       VARCHAR(255) NOT NULL,  -- stored as SHA-256 hash, not plain 6-digit code
  purpose    VARCHAR(30) NOT NULL CHECK (purpose IN ('reset_password', 'verify_email')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### `user_settings` *(1-to-1 with users)*
```sql
CREATE TABLE user_settings (
  user_id                   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Privacy & Security
  last_seen_visibility      VARCHAR(20) NOT NULL DEFAULT 'everyone'
                              CHECK (last_seen_visibility IN ('everyone', 'contacts', 'nobody')),
  profile_photo_visibility  VARCHAR(20) NOT NULL DEFAULT 'everyone'
                              CHECK (profile_photo_visibility IN ('everyone', 'contacts', 'nobody')),
  phone_number_visibility   VARCHAR(20) NOT NULL DEFAULT 'contacts'
                              CHECK (phone_number_visibility IN ('everyone', 'contacts', 'nobody')),
  groups_add_permission     VARCHAR(20) NOT NULL DEFAULT 'everyone'
                              CHECK (groups_add_permission IN ('everyone', 'contacts', 'nobody')),
  read_receipts_enabled     BOOLEAN     NOT NULL DEFAULT true,

  -- Appearance
  theme                     VARCHAR(20) NOT NULL DEFAULT 'system'
                              CHECK (theme IN ('system', 'light', 'dark')),
  chat_wallpaper_type       VARCHAR(20) NOT NULL DEFAULT 'none'
                              CHECK (chat_wallpaper_type IN ('none', 'gallery', 'color')),
  chat_wallpaper_value      TEXT,        -- storage URL (gallery) or hex code (color)
  font_size                 VARCHAR(15) NOT NULL DEFAULT 'medium'
                              CHECK (font_size IN ('small', 'medium', 'large', 'extra_large')),

  -- Notifications
  notify_messages           BOOLEAN     NOT NULL DEFAULT true,
  notify_groups             BOOLEAN     NOT NULL DEFAULT true,
  notify_calls              BOOLEAN     NOT NULL DEFAULT true,
  do_not_disturb            BOOLEAN     NOT NULL DEFAULT false,

  -- General
  language                  VARCHAR(10) NOT NULL DEFAULT 'en',
  auto_download_wifi        BOOLEAN     NOT NULL DEFAULT true,
  auto_download_cellular    BOOLEAN     NOT NULL DEFAULT false,

  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### `subscriptions` *(future: paid plans)*
```sql
CREATE TABLE subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        VARCHAR(20) NOT NULL DEFAULT 'free'
                CHECK (plan IN ('free', 'premium', 'enterprise')),
  status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'trial', 'cancelled', 'expired')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  payment_ref TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_user ON subscriptions (user_id);
```

---

#### `conversations`
```sql
CREATE TABLE conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group')),
  name        VARCHAR(100),           -- groups only
  description TEXT,                   -- groups only
  avatar_url  TEXT,                   -- groups only
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### `participants`
```sql
CREATE TABLE participants (
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  role            VARCHAR(10) NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'admin', 'member')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  muted_until     TIMESTAMPTZ,         -- NULL = not muted
  last_read_at    TIMESTAMPTZ,         -- drives unread count
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX idx_participants_user ON participants (user_id);
```

---

#### `messages`
```sql
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        REFERENCES users(id) ON DELETE SET NULL,
  content         TEXT,
  type            VARCHAR(20) NOT NULL DEFAULT 'text'
                    CHECK (type IN ('text', 'image', 'file', 'audio', 'call_log', 'system')),
  reply_to_id     UUID        REFERENCES messages(id) ON DELETE SET NULL,
  story_id        UUID        REFERENCES stories(id)  ON DELETE SET NULL,  -- set when replying to a story
  is_edited       BOOLEAN     NOT NULL DEFAULT false,
  edited_at       TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,         -- soft delete; NULL = visible
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender       ON messages (sender_id);
```

---

#### `message_attachments`
```sql
CREATE TABLE message_attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID         NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  url        TEXT         NOT NULL,
  type       VARCHAR(20)  NOT NULL CHECK (type IN ('image', 'video', 'audio', 'file')),
  filename   TEXT,
  file_size  INTEGER,
  mime_type  VARCHAR(100),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attachments_message ON message_attachments (message_id);
```

---

#### `message_reactions`
```sql
CREATE TABLE message_reactions (
  message_id UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  emoji      VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);
```

---

#### `stories`
```sql
CREATE TABLE stories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url  TEXT        NOT NULL,
  media_type VARCHAR(10) NOT NULL DEFAULT 'image'
               CHECK (media_type IN ('image', 'video')),
  caption    TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_stories_user       ON stories (user_id);
CREATE INDEX idx_stories_expires_at ON stories (expires_at);
```

---

#### `story_views`
```sql
CREATE TABLE story_views (
  story_id  UUID        NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (story_id, viewer_id)
);
```

---

#### `blocks`
```sql
CREATE TABLE blocks (
  blocker_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);
CREATE INDEX idx_blocks_blocker ON blocks (blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks (blocked_id);
```

---

#### `reports`
```sql
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('conversation', 'story')),
  target_id   UUID        NOT NULL,   -- points to conversations.id or stories.id
  reason      VARCHAR(50) NOT NULL
                CHECK (reason IN ('harassment', 'spam', 'inappropriate_content',
                                  'violence', 'hate_speech', 'other')),
  description TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID        REFERENCES users(id) ON DELETE SET NULL,  -- admin/moderator
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reports_status      ON reports (status);
CREATE INDEX idx_reports_reporter    ON reports (reporter_id);
CREATE INDEX idx_reports_target      ON reports (target_type, target_id);
-- Note: target_type IN ('conversation','story') — no per-message reporting by design
```

---

#### `calls`
```sql
CREATE TABLE calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  initiator_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  type            VARCHAR(10) NOT NULL CHECK (type IN ('voice', 'video')),
  status          VARCHAR(10) NOT NULL DEFAULT 'ringing'
                    CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined')),
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_calls_conversation ON calls (conversation_id);
```

---

#### Entity Relationships Summary

```
users ──< user_identities         (one user, many login methods: local/google/facebook/apple)
users ──< contacts                (one user, their phone book — registered or invited)
users ──< push_tokens             (one user, many devices)
users ──< auth_tokens             (one user, many sessions)
users ──< otp_codes               (one user, many OTP requests)
users ──1 user_settings           (one user, one settings row)
users ──< subscriptions           (one user, plan history)
users ──< participants >── conversations
conversations ──< messages ──< message_attachments
                           ──< message_reactions
messages ──0..1── messages        (reply_to_id self-reference)
messages ──0..1── stories         (story_id: story reply context)
users ──< stories ──< story_views
users ──< blocks
users ──< reports
conversations ──< calls
```

### Middleware

- [ ] `src/middleware/auth.js` — JWT verification
- [ ] `src/middleware/validate.js` — request validation wrapper

---

## 👤 Phase 2 — Auth & User Module

> [!TIP] Screens covered: Onboard, Sign In (light/dark/error), Fill in Info, Language Selection, Reset Password, Loading

**Files:** `src/modules/user/`

### Endpoints

- [ ] `POST   /api/auth/register`        — email + password + display_name
- [ ] `POST   /api/auth/login`           — returns JWT + user profile
- [ ] `POST   /api/auth/logout`
- [ ] `POST   /api/auth/oauth`           — Google / Facebook / Apple login (verifies provider token, matches on google_id / facebook_id / apple_id, creates account if new)
- [ ] `POST   /api/auth/forgot-password` — send OTP
- [ ] `POST   /api/auth/reset-password`  — verify OTP + set new password
- [ ] `POST   /api/auth/push-token`      — register device push token (FCM/APNS)
- [ ] `DELETE /api/auth/push-token`      — remove push token on logout
- [ ] `GET  /api/users/me` — own profile *(auth required)*
- [ ] `PUT  /api/users/me` — edit profile (name, bio, avatar, language, theme)
- [ ] `GET  /api/users/:id` — view another user's profile
- [ ] `GET  /api/users/search?q=` — search users by name/username

---

## 💬 Phase 3 — Conversations & Direct Messaging

> [!TIP] Screens covered: Home/Chat List, Chat Screen (light/dark), Message context menu, 3-dot actions

**Files:** `src/modules/conversation/`, `src/modules/message/`

### Endpoints

- [ ] `GET    /api/conversations` — list all conversations for current user
- [ ] `POST   /api/conversations` — create direct conversation (returns existing if already exists)
- [ ] `GET    /api/conversations/:id` — get conversation info
- [ ] `GET    /api/conversations/:id/messages` — paginated message history
- [ ] `POST   /api/conversations/:id/messages` — send message
- [ ] `PUT    /api/conversations/:id/messages/:msgId` — edit message
- [ ] `DELETE /api/conversations/:id/messages/:msgId` — soft-delete message
- [ ] `POST   /api/conversations/:id/mute` — mute (30min / 60min / forever)
- [ ] `DELETE /api/conversations/:id/mute` — unmute

---

## 👥 Phase 4 — Group Chat

> [!TIP] Screens covered: Create New Group, Group Profile, Add Member, Group Chat

**Files:** Extend `src/modules/conversation/` (type = group)

### Endpoints

- [ ] `POST   /api/conversations/group` — create group (name, avatar, member_ids)
- [ ] `GET    /api/conversations/:id/members` — list group members
- [ ] `POST   /api/conversations/:id/members` — add member(s)
- [ ] `DELETE /api/conversations/:id/members/:userId` — remove member
- [ ] `PUT    /api/conversations/:id` — update group name/avatar *(admin only)*

---

## ⚡ Phase 9 — Real-time (Socket.io)

> [!WARNING] Pair this with Phase 3 & 4 — implement together for best result

**Files:** `src/server.js` (add Socket.io), `src/sockets/index.js`

### Events

- [ ] `connect / disconnect` — track online status
- [ ] `join_conversation` — subscribe to conversation room
- [ ] `send_message` — broadcast new message to all participants
- [ ] `typing_start / typing_stop` — broadcast typing state
- [ ] `message_read` — mark messages read + broadcast receipts
- [ ] `call_ring / call_answer / call_end` — call signaling

---

## 📖 Phase 5 — Stories / Status

> [!TIP] Screens covered: Story Screen, View Story, Add Status/Story

**Files:** `src/modules/story/`

### Endpoints

- [ ] `POST   /api/stories` — create story (media_url, caption)
- [ ] `GET    /api/stories` — get stories from contacts (not yet expired)
- [ ] `GET    /api/stories/:id` — view single story
- [ ] `DELETE /api/stories/:id` — delete own story
- [ ] `POST   /api/stories/:id/view` — mark story as viewed
- [ ] `POST   /api/stories/:id/reply` — reply to story (sends a message)

---

## 📞 Phase 6 — Calling

> [!TIP] Screens covered: Incoming Call, Active Voice Call, Active Video Call

**Files:** `src/modules/call/`

### Endpoints

- [ ] `POST /api/calls` — initiate call (conversation_id, type: voice | video)
- [ ] `PUT  /api/calls/:id/answer` — accept call
- [ ] `PUT  /api/calls/:id/end` — end / decline call
- [ ] `GET  /api/calls/:id` — get call status

> [!NOTE]
> Real-time signaling goes through WebSocket (Phase 9). REST here is only for persisting call records.

---

## 🖼️ Phase 7 — Profile, Shared Media & Contacts

> [!TIP] Screens covered: View Profile, Shared Media tabs, Contacts

### Endpoints

- [ ] `GET /api/users/:id/media` — shared media between current user and target
- [ ] `GET    /api/contacts`                    — list contacts (registered + invited)
- [ ] `POST   /api/contacts/sync`              — upload phone numbers from phone book, server returns matched users + marks unmatched as invited
- [ ] `DELETE /api/contacts/:id`               — remove a contact
- [ ] `GET /api/conversations/:id/shared-media` — media messages in a conversation

---

## 🛡️ Phase 8 — Safety: Block & Report

> [!TIP] Screens covered: Blocked Contacts, Add Block User, Unblock, Report User/Chat

**Files:** `src/modules/safety/`

### Endpoints

- [ ] `POST   /api/blocks` — block a user
- [ ] `DELETE /api/blocks/:userId` — unblock a user
- [ ] `GET    /api/blocks` — list blocked users
- [ ] `POST   /api/reports` — report a conversation or story (reason + description)

---

## ⚙️ Phase 10 — Settings & Preferences

> [!TIP] Screens covered: Settings, Privacy Settings, Theme Selection

**Files:** Extend `src/modules/user/`

### Endpoints

- [ ] `GET /api/settings` — get user settings (privacy, theme, notifications)
- [ ] `PUT /api/settings` — update settings
- [ ] `PUT /api/settings/privacy` — update privacy toggles (last seen visibility, etc.)
- [ ] `PUT /api/settings/theme` — update theme preference

---

## 🔁 Utilities to Reuse (already exist)

| Utility | Location |
|---------|----------|
| `successResponse(res, data, statusCode)` | `src/shared/utils.js` |
| `errorResponse(res, message, statusCode)` | `src/shared/utils.js` |
| `db` pool | `src/config/db.js` |

---

## ✅ Verification Steps (after each phase)

- [ ] `npm run dev` — server starts without errors
- [ ] Hit endpoints with curl/Postman — check `{ success: true, data: {...} }` shape
- [ ] Query PostgreSQL to confirm data persisted correctly
- [ ] For WebSocket: test with Socket.io browser client or Postman WebSocket tab

---

## 🗓️ Recommended Implementation Order

```
Phase 1  →  Foundation (schema + auth middleware)
Phase 2  →  Auth & User (register / login / profile)
Phase 3  →  Conversations & Messaging  ← core feature
Phase 4  →  Group Chat
Phase 9  →  Real-time Socket.io  ← pair with 3 & 4
Phase 5  →  Stories
Phase 6  →  Calling
Phase 7  →  Shared Media & Contacts
Phase 8  →  Block & Report
Phase 10 →  Settings
```

---

#besdong #messenger #api #planning
