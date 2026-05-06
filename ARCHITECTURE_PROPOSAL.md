# Besdong Messenger API — Architecture Proposal

> [!NOTE] Purpose
> This document covers the five foundation pillars required before API development begins: database design, system architecture, tech stack, project structure, and packages. It is based on a full review of the Figma design (44 screens) and the existing skeleton project.

**FigJam Board (diagrams):** https://www.figma.com/board/dtO3wTnZVfXerPSW68Vqk1

---

## 1. Database Design

### Overview

The database is split into two domains:

| Domain | Tables | Purpose |
|--------|--------|---------|
| Auth & User | 8 tables | Identity, authentication, settings, device push tokens, contacts, subscriptions |
| Messaging & Social | 10 tables | Conversations, messages, stories, calls, safety |

**Total: 18 tables.** All primary keys are UUID. Schema is managed through Knex.js versioned migration files — one file per table, each with `up()` and `down()` functions.

---

### Table Inventory

#### Auth & User Domain

| Table | Purpose |
|-------|---------|
| `users` | Core profile: username, display name, email, phone, avatar, online status. No auth fields here — auth lives in `user_identities`. |
| `user_identities` | One row per auth method per user — supports local (email/password) and OAuth (Google, Facebook, Apple) from day one without changing the users table. `password_hash` is nullable and only populated for the `local` provider. |
| `auth_tokens` | Hashed refresh tokens, one row per device. Enables multi-device login like Telegram — revoke a single device without logging out others. |
| `otp_codes` | SHA-256 hashed OTPs for password reset and email verification. Hashed so a DB breach does not expose valid codes. |
| `user_settings` | One-to-one with users. Stores theme, language, and privacy toggles: last seen visibility, read receipts, online status, profile photo visibility, notification preferences. |
| `push_tokens` | FCM/APNS device tokens, one row per device. FCM multicast API sends to all of a user's devices in a single call — no looping in application code. |
| `contacts` | Phone book sync. `contact_user_id` is nullable — NULL means the person is not yet on the app (status = `invited`), filled UUID means they registered (status = `registered`). Includes `nickname` field for custom name overrides (e.g. "Mum"). |
| `subscriptions` | Future paid plans — tracks plan history per user (`free`, `premium`, `enterprise`). Status: `active`, `trial`, `cancelled`, `expired`. Includes `payment_ref` for linking to payment provider records. |

#### Messaging & Social Domain

| Table | Purpose |
|-------|---------|
| `conversations` | Covers both 1-to-1 and group chats via a `type` column (`direct` or `group`). One table avoids duplicating message and participant logic. |
| `participants` | Junction between users and conversations. `role` supports group ownership (`owner`, `admin`, `member`). `last_read_at` drives both the unread count and read receipts — no extra table needed. |
| `messages` | All message types in one table (`text`, `image`, `file`, `audio`, `call_log`, `system`). `reply_to_id` self-references for threaded replies. `story_id` links when a user replies to a story. `deleted_at` is a soft delete so the UI can show "This message was deleted." |
| `message_attachments` | Separate from messages so one message can have multiple files without denormalising the messages table. One row per file — all point to the same `message_id`. |
| `message_reactions` | Composite PK `(message_id, user_id, emoji)` — a user can react with multiple different emojis to the same message, but not the same emoji twice. |
| `stories` | 24-hour expiry (`expires_at = NOW() + 24h`). Indexed on `expires_at` for a cheap background cleanup job. |
| `story_views` | Composite PK `(story_id, viewer_id)` — prevents duplicate view records. Used to show the "seen by" list on a story. |
| `calls` | REST-only record of voice/video calls. Status flow: `ringing → active → ended / missed / declined`. Real-time signaling goes through Socket.io, not this table. |
| `blocks` | Composite PK `(blocker_id, blocked_id)`. A constraint prevents self-blocking. Indexed on both columns so "is this user blocked?" lookups are fast in both directions. |
| `reports` | Reports against **conversations or stories only** (`target_type` is `conversation` or `story` — per-message reporting is intentionally excluded). Includes moderation workflow fields: `status`, `reviewed_by`, `reviewed_at`. |

---

### Key Design Decisions

| Decision | Reason |
|----------|--------|
| UUID primary keys everywhere | No sequential ID leakage, safe to expose in URLs, compatible with future distributed IDs |
| `user_identities` separate from `users` | Users table stays clean; adding a new OAuth provider requires zero schema changes |
| `participants.last_read_at` for unread count | One column replaces both a counter field and a `message_reads` join table; unread = `COUNT(messages WHERE created_at > last_read_at)` using an index |
| Soft delete on messages only | Messages need a "This message was deleted" UI state; all other records are hard-deleted |
| Redis from launch | Socket.io requires a shared pub/sub backend the moment you run more than one server instance. Adding Redis after launch under traffic is painful. Scoped to three things only: Socket.io adapter, online presence TTL keys, auth rate limiting. |
| Knex.js for migrations | One migration file per table with `up()` + `down()` — identical pattern to Laravel. No central schema file. Rollback any migration independently. |

---

## 2. System Architecture

### Layer Overview

```
┌─────────────────────────────────────────────────────┐
│               Client Apps                           │
│        Mobile (iOS / Android)  +  Web App           │
└──────────────┬──────────────────────────────────────┘
               │ HTTPS / REST             │ WebSocket
               ▼                          ▼
┌─────────────────────────────────────────────────────┐
│              NestJS API Server                      │
│  ┌───────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │@Controller│  │Guards / Pipes│  │ @WebSocket  │  │
│  │(per domain│  │Filters/Inter-│  │  Gateway    │  │
│  │  module)  │  │  ceptors     │  │             │  │
│  └─────┬─────┘  └──────────────┘  └──────┬──────┘  │
│        │                                  │         │
│  ┌─────▼──────────────────────────────────▼──────┐  │
│  │              Domain Layer                     │  │
│  │  auth · user · conversation · message         │  │
│  │  story · call · safety · notification         │  │
│  │  Each domain: @Controller →                   │  │
│  │    @Injectable service → @Injectable repo     │  │
│  └────────────────────────┬──────────────────────┘  │
└───────────────────────────┼─────────────────────────┘
                            │ Knex.js
                            ▼
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL                         │
└─────────────────────────────────────────────────────┘
```

### Domain Interaction Map

| Domain | Depends On | Notes |
|--------|------------|-------|
| `auth` | `user` | Reads/creates user records; issues JWT access + refresh tokens |
| `conversation` | `user` | Creates conversations; enforces participant membership checks |
| `message` | `conversation`, `user`, `story` | Sends messages; emits Socket.io event after DB write |
| `story` | `user` | Creates stories; message domain references story for replies |
| `call` | `conversation` | Persists call records; signaling via Socket.io |
| `notification` | all domains | Other domains call `notificationService.create()` after key actions |
| `safety` | `user`, `message`, `story` | Block/report logic; block status checked in message send flow |
| `settings` | `user` | Read/write user_settings; privacy flags consumed by other domains |

### REST vs Real-time Split

| Transport | Used For |
|-----------|----------|
| REST (HTTPS) | All CRUD operations — works identically for mobile and web clients |
| Socket.io | Live events only: `send_message`, `typing_start/stop`, `message_read`, `call_ring/answer/end`, `user_online/offline` |

> [!TIP] Write-then-emit Pattern
> The REST endpoint writes to the database first, then emits the Socket.io event. This ensures the message is persisted before broadcast. If the socket emit fails, the message still exists and will be fetched on the next load.

---

## 3. Tech Stack Finalization

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | 20 LTS | Active LTS |
| Language | TypeScript | 6.0.3 | Strict mode; all source files `.ts`; catches type errors at compile time |
| Framework | NestJS | 11.1.19 | Uses Express adapter under the hood; built-in modules, DI, guards, pipes, interceptors |
| Database | PostgreSQL | 16+ | |
| Migrations + Query Builder | Knex.js | 3.1.0 | Laravel-like: each migration = its own file with `up()` + `down()`; `knex migrate:latest` / `knex migrate:rollback` |
| DB Driver | pg | 8.x | PostgreSQL driver; used by Knex under the hood |
| Auth | @nestjs/jwt | 11.0.2 | JWT module; access token (15 min) + refresh token (30 days, hashed per device) |
| Password | bcryptjs | 3.0.3 | Cost factor 12; pure JS, no native binaries |
| Validation | class-validator + class-transformer | 0.15.1 / 0.5.1 | DTO classes with `@IsEmail()`, `@MinLength()` decorators; validated globally via NestJS `ValidationPipe` — identical for mobile and web (both send JSON) |
| Real-time | socket.io | 4.8.3 | WebSocket with long-poll fallback |
| Socket platform | @nestjs/websockets + @nestjs/platform-socket.io | 11.1.19 / 11.1.18 | `@WebSocketGateway` decorator; JWT verified at connection handshake |
| Redis client | ioredis | 5.10.1 | Better reconnection handling than node-redis; required for Socket.io adapter |
| Socket scaling | @socket.io/redis-adapter | 8.3.0 | Pub/Sub bridge so Socket.io events broadcast across multiple server instances |
| Rate limiting | rate-limiter-flexible | 5.0.5 | Plugs into existing ioredis client; sliding window for login + OTP endpoints |
| Config | @nestjs/config | 4.0.4 | Wraps dotenv; typed env access via `ConfigService`; validates env vars at startup |
| DI plumbing | reflect-metadata + rxjs | 0.2.2 / 7.8.2 | Required by NestJS decorator system |
| Security | helmet | 8.1.0 | Secure HTTP headers (XSS, clickjacking, MIME sniffing) |
| CORS | cors | 2.8.5 | Whitelist allowed origins in production |
| Logging | pino + pino-http | 10.3.1 / 11.0.0 | Structured JSON logs; 10× faster than Winston; Nginx handles reverse-proxy access logs separately |
| Email (OTP) | nodemailer | 7.0.3 | Sends 6-digit OTP codes via Gmail SMTP for password reset and email verification |

---

### Notes on Key Choices

**NestJS (Framework)**

NestJS gives us the DDD structure built into the framework rather than enforced by convention:

- **Modules** = bounded contexts. Each `auth.module.ts` declares exactly what it provides and what it imports — this is the microservice boundary. No module can reach into another module's internals.
- **Guards** replace auth middleware. `@UseGuards(JwtGuard)` on a controller or route is explicit and declarative — you can see authentication requirements at the endpoint level.
- **Pipes + DTOs** replace express-validator. A `RegisterDto` class with `@IsEmail()`, `@MinLength(8)` decorators is validated automatically by the global `ValidationPipe` — no manual validation calls in controllers.
- **Interceptors** handle the `{ success: true, data }` response wrapping globally — no need to call `successResponse()` in every controller method.
- **`@WebSocketGateway`** replaces manual Socket.io server setup — NestJS handles the server lifecycle and attaches it to the HTTP server automatically.

**Knex.js (Migrations + Query Builder)**

Knex.js is the closest equivalent to Laravel's migration system in Node.js:

- `knex migrate:make create_users` → creates `database/migrations/20240101000001_create_users.ts`
- Each file exports `up(knex)` and `down(knex)` — identical to Laravel
- `knex migrate:latest` runs all pending migrations in order
- `knex migrate:rollback` rolls back the last batch
- Knex tracks migration history in a `knex_migrations` table (same concept as Laravel's `migrations` table)
- Each of the 18 tables gets its own dedicated migration file — no central schema file

**JWT for Mobile + Web**

JWT works identically for both clients. The mobile app stores the refresh token in secure device storage (iOS Keychain, Android Keystore). The web app stores it in an HttpOnly cookie. The API validates the token in the `Authorization: Bearer` header — it does not need to know which client is calling.

**Pino vs morgan**

morgan only logs HTTP requests. Pino covers application-level structured logging (errors, business events, debug output) and replaces morgan via `pino-http` for HTTP logs. Pino is 10× faster than Winston and outputs JSON natively, which is required for production log aggregation (Datadog, CloudWatch, Loki).

---

### Packages to Add

```bash
# Production
npm install @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/jwt @nestjs/config @nestjs/websockets @nestjs/platform-socket.io class-validator class-transformer reflect-metadata rxjs knex pg bcryptjs nodemailer socket.io ioredis rate-limiter-flexible @socket.io/redis-adapter cors helmet pino pino-http

# Dev
npm install -D @nestjs/cli typescript ts-node @types/node @types/bcryptjs @types/nodemailer @types/cors
```

---

## 4. Project Structure

The structure follows **Domain-Driven Design (DDD)**. Each folder under `domains/` is a bounded context — self-contained, minimal cross-domain dependencies. When traffic grows and the team splits, each domain folder becomes its own microservice with minimal refactoring.

```
besdong-messenger-api/
│
├── src/
│   ├── main.ts                        # NestJS bootstrap — HTTP server + Socket.io attach
│   ├── app.module.ts                  # Root module — imports all domain modules
│   │
│   ├── infrastructure/               # Technical plumbing — zero business logic
│   │   ├── database/
│   │   │   └── db.service.ts         # Injectable Knex instance (shared across domains)
│   │   ├── cache/
│   │   │   └── redis.service.ts      # Injectable ioredis client — presence, rate limiting
│   │   ├── socket/
│   │   │   └── socket.gateway.ts     # @WebSocketGateway — Socket.io init + JWT auth on connect
│   │   ├── config/
│   │   │   └── env.validation.ts     # class-validator schema — validates env vars at startup
│   │   └── logger/
│   │       └── logger.service.ts     # Injectable Pino logger
│   │
│   ├── shared/                       # Cross-domain utilities — zero business logic
│   │   ├── guards/
│   │   │   └── jwt.guard.ts          # @UseGuards(JwtGuard) — verifies JWT, attaches req.user
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts  # Global error handler — formats all errors consistently
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts   # Wraps all responses in { success: true, data }
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts # @CurrentUser() param decorator → req.user
│   │   └── constants/
│   │       └── index.ts              # Shared enums: roles, message types, report reasons
│   │
│   └── domains/                      # One module = one bounded context = one future microservice
│       │
│       ├── auth/
│       │   ├── auth.module.ts        # Imports: JwtModule, DatabaseModule, UserModule
│       │   ├── auth.controller.ts    # @Controller('auth') — POST /api/auth/*
│       │   ├── auth.service.ts       # @Injectable() — register, login, OTP, token refresh
│       │   ├── auth.repository.ts    # @Injectable() — Knex queries: user_identities, auth_tokens, otp_codes
│       │   └── dto/
│       │       ├── register.dto.ts   # @IsEmail(), @MinLength(8) via class-validator
│       │       └── login.dto.ts
│       │
│       ├── user/
│       │   ├── user.module.ts
│       │   ├── user.controller.ts    # @Controller('users')
│       │   ├── user.service.ts       # Profile management, search
│       │   ├── user.repository.ts    # Knex queries: users, push_tokens, contacts
│       │   └── dto/
│       │
│       ├── conversation/
│       │   ├── conversation.module.ts
│       │   ├── conversation.controller.ts
│       │   ├── conversation.service.ts   # Create direct/group, mute, membership checks
│       │   ├── conversation.repository.ts
│       │   └── dto/
│       │
│       ├── message/
│       │   ├── message.module.ts
│       │   ├── message.controller.ts
│       │   ├── message.service.ts        # Send, edit, delete, react — emits socket event after DB write
│       │   ├── message.repository.ts
│       │   └── dto/
│       │
│       ├── story/
│       ├── call/
│       ├── safety/                       # Bounded context: blocks + reports
│       ├── notification/
│       └── settings/
│
├── database/
│   └── migrations/                   # One file per table — versioned like Laravel
│       ├── 20240101000001_create_users.ts
│       ├── 20240101000002_create_user_identities.ts
│       ├── 20240101000003_create_auth_tokens.ts
│       ├── 20240101000004_create_otp_codes.ts
│       ├── 20240101000005_create_user_settings.ts
│       ├── 20240101000006_create_push_tokens.ts
│       ├── 20240101000007_create_contacts.ts
│       ├── 20240101000008_create_subscriptions.ts
│       ├── 20240101000009_create_conversations.ts
│       ├── 20240101000010_create_participants.ts
│       ├── 20240101000011_create_calls.ts
│       ├── 20240101000012_create_stories.ts        ← must run before messages (story_id FK)
│       ├── 20240101000013_create_messages.ts
│       ├── 20240101000014_create_message_attachments.ts
│       ├── 20240101000015_create_message_reactions.ts
│       ├── 20240101000016_create_story_views.ts
│       ├── 20240101000017_create_blocks.ts
│       └── 20240101000018_create_reports.ts
│
├── knexfile.ts                       # Knex config: DB connection, migrations path, seeds path
├── tsconfig.json                     # TypeScript config — strict mode
├── tsconfig.build.json               # Excludes test files from production build
├── nest-cli.json                     # NestJS CLI config
├── .env
├── .env.example
├── .gitignore
└── package.json
```

### DDD Conventions

| Rule | Reason |
|------|--------|
| A domain never imports another domain's repository directly | Cross-domain data access goes through a service call — this is the boundary that makes microservice extraction clean |
| `infrastructure/` has no business logic | Infrastructure can be swapped (e.g., swap Knex for a different client) without touching any domain |
| `shared/` has no business logic | Shared utilities must be safe to duplicate into any future service |
| Each domain's `*.module.ts` is the public boundary | `app.module.ts` imports modules, never domain internals. Other domains import the module, not individual services directly |
| Socket events are emitted inside domain services, not controllers | Keeps the real-time layer close to the business logic that triggers it |

### Monolith → Microservices Path

When the time comes to split:
1. Copy a `domains/auth` folder into its own NestJS project
2. Copy `infrastructure/` and `shared/` — or extract them into a shared internal package
3. Replace the Knex instance import with the new service's own database connection
4. Replace in-process service calls between domains with HTTP/gRPC calls

No folder renaming, no file moving — the domain folder IS the microservice.

---

## 5. Packages & Libraries

### Production Dependencies

| Package | Version | Purpose | Note |
|---------|---------|---------|------|
| `@nestjs/core` | 11.1.19 | NestJS runtime core | Required for all NestJS apps |
| `@nestjs/common` | 11.1.19 | Decorators, pipes, guards, interceptors | `@Controller`, `@Injectable`, `@UseGuards`, `@Get`, etc. |
| `@nestjs/platform-express` | 11.1.19 | Express adapter | NestJS runs on Express under the hood |
| `@nestjs/jwt` | 11.0.2 | JWT module | Access token (15 min) + refresh token (30 days, hashed per device) |
| `@nestjs/config` | 4.0.4 | Configuration module | Wraps dotenv; typed env access via `ConfigService` |
| `@nestjs/websockets` | 11.1.19 | WebSocket gateway support | `@WebSocketGateway` decorator |
| `@nestjs/platform-socket.io` | 11.1.18 | Socket.io platform adapter | Bridges NestJS gateways with Socket.io |
| `class-validator` | 0.15.1 | DTO validation | `@IsEmail()`, `@MinLength()`, `@IsUUID()` on DTO classes |
| `class-transformer` | 0.5.1 | DTO transformation | Required alongside class-validator |
| `reflect-metadata` | 0.2.2 | Decorator metadata | Required by NestJS DI system |
| `rxjs` | 7.8.2 | Reactive extensions | Required by NestJS internally |
| `knex` | 3.1.0 | Migrations + query builder | Laravel-like versioned migration files; `knex migrate:latest` / rollback |
| `pg` | 8.x | PostgreSQL driver | Used by Knex under the hood |
| `bcryptjs` | 3.0.3 | Password hashing | Cost factor 12; pure JS, no native build required |
| `nodemailer` | 7.0.3 | OTP email delivery | Gmail SMTP for password reset and email verification OTPs |
| `socket.io` | 4.8.3 | Real-time WebSocket events | JWT verified at connection handshake |
| `ioredis` | 5.10.1 | Redis client | Online presence TTL, rate limiting, Socket.io adapter |
| `rate-limiter-flexible` | 5.0.5 | Rate limiting | Uses existing ioredis client; sliding window for login + OTP endpoints |
| `@socket.io/redis-adapter` | 8.3.0 | Socket.io multi-instance pub/sub | Required before horizontal scaling |
| `cors` | 2.8.5 | CORS policy | Restrict to known origins in production |
| `helmet` | 8.1.0 | Secure HTTP headers | XSS, clickjacking, MIME sniffing protection |
| `pino` | 10.3.1 | Structured JSON application logging | 10× faster than Winston; JSON output for Datadog / CloudWatch / Loki |
| `pino-http` | 11.0.0 | HTTP request logging | Replaces morgan; structured JSON, not plain text |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/cli` | 11.0.21 | NestJS CLI — `nest start --watch`, `nest generate`, `nest build` |
| `typescript` | 6.0.3 | TypeScript compiler |
| `ts-node` | 10.9.2 | Run `.ts` files directly — used by Knex CLI for migration files |
| `@types/node` | 25.6.0 | Node.js type definitions |
| `@types/bcryptjs` | 3.0.0 | bcryptjs type definitions |
| `@types/nodemailer` | 8.0.0 | nodemailer type definitions |
| `@types/cors` | 2.8.19 | cors type definitions |

### Deliberately Excluded

| Package | Reason |
|---------|--------|
| `Prisma` | Requires a single central schema file — our approach uses individual versioned migration files (one per table) with `up()` and `down()`, like Laravel |
| `Passport.js` | JWT auth via `@nestjs/jwt` + custom `JwtGuard` is simpler, fewer abstraction layers, easier to debug |
| `Multer` | File uploads use direct cloud storage signed URLs (S3/GCS) — no binary buffering on the API server |
| `morgan` | `pino-http` covers HTTP request logging in structured JSON format |
| `Sequelize / TypeORM` | Knex.js is our chosen migration tool and query builder |

---

## Summary

| # | Pillar | Decision |
|---|--------|---------|
| 1 | Database Design | 18 tables — Auth/User domain (8 tables) + Messaging/Social domain (10 tables); one Knex migration file per table |
| 2 | System Architecture | NestJS modules; REST for CRUD; `@WebSocketGateway` for live events |
| 3 | Tech Stack | Node 20 LTS + TypeScript 6.0.3 + NestJS 11.1.19 + PostgreSQL 16 + Knex.js 3.1.0 + Socket.io 4.8.3 + Redis (ioredis 5.10.1) |
| 4 | Project Structure | DDD monolith — each `domains/` module is a future microservice |
| 5 | Packages | 23 production packages; NestJS replaces Express; Knex replaces Prisma; class-validator replaces express-validator; Pino replaces morgan; Redis from launch |

> [!IMPORTANT] Next Step
> Once this proposal is approved: scaffold the NestJS project (`nest new` or initialise manually), set up `knexfile.ts`, create all 18 migration files, run `knex migrate:latest`, then start the Auth domain.

---

*Figma Design: https://www.figma.com/design/2UXlZJlQvAroMetIUVwDE0/Besdong-Chat-App*
*FigJam Architecture Board: https://www.figma.com/board/dtO3wTnZVfXerPSW68Vqk1*
