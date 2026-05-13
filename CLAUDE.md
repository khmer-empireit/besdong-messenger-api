# Besdong Messenger API — Claude Code Guide

## What this project is
A production-grade chat API built with NestJS + TypeScript. The goal is a scalable, microservices-ready messenger backend — think WhatsApp-style: direct and group conversations, real-time WebSocket messaging, file attachments, reactions, read receipts, online presence, and push notifications.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL (via Knex.js — no ORM) |
| Cache / pub-sub | Redis (ioredis) |
| Real-time | Socket.IO 4 with `@socket.io/redis-adapter` |
| Auth | JWT (access + refresh), bcryptjs, OAuth (Google/Facebook/Apple), Telegram |
| Storage | Local disk or S3 (switched by `STORAGE_DRIVER` env var) |
| File processing | Sharp (image → WebP conversion) |
| Push notifications | Firebase Admin SDK |
| HTTP security | Helmet, CORS |
| Validation | class-validator + class-transformer |
| API docs | Swagger (dev only, at `/docs`) |

---

## Folder structure

```
src/
  app.module.ts
  main.ts
  domains/              — one folder per business domain
    auth/
    user/
    conversation/
    message/
    contact/
    block/
    upload/
    admin/
    health/
  infrastructure/       — technical plumbing, no business logic
    database/           — DbService (Knex), DatabaseModule (@Global)
    cache/              — RedisService, RedisIoAdapter, CacheModule (@Global)
    firebase/           — FirebaseService, FirebaseModule (@Global)
    storage/            — StorageService, local + S3 providers, StorageModule (@Global)
    config/             — env.validation.ts (class-validator schema for all env vars)
    logger/             — logger.service.ts
  shared/
    guards/             — JwtGuard, AdminGuard, RateLimitGuard
    decorators/         — @CurrentUser(), @RateLimit()
    filters/            — HttpExceptionFilter (global)
    interceptors/       — ResponseInterceptor (wraps all responses in { success, data })
database/
  migrations/           — Knex migrations, timestamp-prefixed filenames
```

### Per-domain structure (every domain follows this exactly)

```
src/domains/<domain>/
  entities/             — typed domain objects, mirrors DB rows — no raw Knex in service layer
  interfaces/           — I<Domain>Repository abstract interface
  dto/                  — request DTOs (class-validator) + response DTOs (Swagger)
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repository.ts   — implements I<Domain>Repository using Knex
  <domain>.module.ts
  <domain>.service.spec.ts
  <domain>.controller.spec.ts   (where applicable)
```

**Auth domain is the reference implementation.** When adding a new domain, copy its pattern exactly.

---

## Architecture rules

### Module boundaries
- Services depend on the repository **interface**, never the concrete class.
- A module that needs another domain's data must **import that domain's module** and inject its **service** — never directly provide a foreign repository.
- `DatabaseModule`, `CacheModule`, `FirebaseModule`, `StorageModule` are `@Global()` — their services (`DbService`, `RedisService`, `FirebaseService`, `StorageService`) are available everywhere without explicit imports.
- `JwtModule` must be registered in each module that needs JWT (`JwtModule.register({})`), not globally — secrets are read per-call from `ConfigService`.

### Guards
- `JwtGuard` — validates Bearer token, attaches `{ sub, role, jti, ... }` to `request.user`.
- `AdminGuard` — reads `payload.role` from the JWT claim, never touches the DB.
- `RateLimitGuard` — uses `rate-limiter-flexible` backed by Redis.
- Apply `JwtGuard` first, then `AdminGuard` on admin-only routes.

### JWT
- Access token payload: `{ sub: userId, role, jti }`.
- Role is embedded at login time by reading from the DB once — never re-queried per request.
- Refresh tokens are stored in the DB (`auth_tokens` table) and invalidated on use.

### WebSocket
- Gateway: `MessageGateway` on namespace `/ws`.
- Redis adapter (`RedisIoAdapter`) is wired in `main.ts` — enables cross-instance pub/sub so messages route correctly in a multi-instance deployment.
- Socket authentication: JWT in `handshake.auth.token` or `Authorization` header.
- Room = `conversation_id` — clients must emit `conversation:join` before receiving messages.
- Online presence is set/cleared in `handleConnection` / `handleDisconnect` via `UserService.setOnlineStatus()`.

### Response shape
All REST responses go through `ResponseInterceptor`:
- Success: `{ success: true, data: <payload> }`
- Error: `{ success: false, statusCode, message, errors, path, timestamp }` (via `HttpExceptionFilter`)

`HttpExceptionFilter` also forwards extra fields from `HttpException` bodies (e.g. health check returns `{ db, redis }` on 503).

### Storage
`StorageService` delegates to `LocalStorageProvider` or `S3StorageProvider` based on `STORAGE_DRIVER=local|s3`. Swap providers by changing the env var — no code changes needed.

### Health check
`GET /api/v1/health` — no auth required. Checks DB (`SELECT 1`) and Redis (`PING`). Returns 200 or 503 with per-service status.

---

## Database conventions (Knex)

- No ORM. All queries are raw Knex builder calls inside repositories.
- Repositories return **entity types**, never raw `Record<string, any>`.
- Migrations live in `database/migrations/`, named `YYYYMMDDHHMMSS_description.ts`.
- Run: `npm run migrate:latest` / `npm run migrate:rollback`.
- Make: `npm run migrate:make -- <name>`.
- Do **not** add `hasTable` guards inside migrations — Knex's own tracking prevents double-runs.

---

## Environment variables

All validated at startup by `src/infrastructure/config/env.validation.ts`. Required vars:

```
NODE_ENV, PORT
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
REDIS_HOST, REDIS_PORT
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN
FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT
TELEGRAM_BOT_TOKEN
STORAGE_DRIVER (local|s3)
```

Optional (S3): `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `STORAGE_CDN_URL`

Apple OAuth also needs `APPLE_CLIENT_ID` (Service ID) in `.env`.

---

## Coding rules

- **No comments** unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant). Never describe what the code does — names do that.
- **No extra abstractions.** Don't design for hypothetical future requirements. Three similar lines is better than a premature abstraction.
- **No unnecessary error handling.** Only validate at system boundaries (user input, external APIs). Trust internal code.
- **No magic strings** — use enums or constants for repeated string literals (`'text'|'image'|'file'`, `'direct'|'group'`, `'member'|'admin'`). This is on the to-do list.
- `whitelist: true, forbidNonWhitelisted: true` on the global `ValidationPipe` — unknown fields in request bodies are rejected.
- Swagger decorators on all controller endpoints (dev only, but keep them accurate).

---

## Git and PR workflow

- One feature per branch, branched off `development`.
- PR target: `development` (not `main`).
- **Test the feature end-to-end before creating the PR** — hit the actual endpoints, check DB rows, watch server logs. Unit tests supplement this but don't replace it.
- Commit messages: short, lowercase, plain one-liner. No bullet points, no body, no co-author tags.
  - Good: `add health check endpoint and graceful shutdown`
  - Bad: `feat: add health check\n\n- checks DB\n- checks Redis\n\nCo-Authored-By: ...`
- Merge order matters — PRs that share files must merge in dependency order to avoid conflicts.

---

## Testing approach

- Jest unit tests with mocked repositories (`jest.fn()`).
- Tests live in `*.spec.ts` alongside the source file.
- The real verification is always endpoint-level: Swagger UI, `curl`, or a DB query. Tests catch regressions; Swagger confirms the feature actually works.
- When adding a method to a repository interface, also add it to the mock in the corresponding spec file.

---

## Scalability roadmap (in priority order)

These are the next items to build, in order of production impact:

1. **Rate limiting** — `@nestjs/throttler` on REST + per-user Redis counter on WebSocket events
2. **Magic strings → enums** — message type, conversation type, participant role
3. **Structured logging with correlation IDs** — attach a request ID to every log line for distributed tracing
4. **Push notifications** — FCM via `FirebaseService` when the recipient isn't connected on WebSocket
5. **Event bus** — Redis pub/sub or BullMQ for cross-domain side effects (e.g. message sent → update unread count + trigger push) without coupling services directly

---

## What's already built

- Auth: local (email/password + OTP), Google OAuth, Facebook OAuth, Apple OAuth, Telegram, admin toggle per auth method
- User: profile, settings, online status, BD number (auto-generated unique identifier)
- Contacts: find by username / email / BD number, add, remove, list with pagination
- Conversations: direct and group, create, list, detail, update (name/avatar), members, mute
- Messages: text/image/file/audio, send, edit, delete (soft), list with cursor pagination, mark read, unread count, last_read_at
- Attachments: `message_attachments` table, returned as `attachments[]` in message responses
- Reactions: add/remove emoji reactions, aggregated per message
- Forward message: forward any message to another conversation
- Real-time: WebSocket events — `message:new`, `message:read_receipt`, `typing:indicator`, `user:status`, `message:reaction`
- Upload: image → WebP conversion via Sharp, local disk or S3, paths per type (avatar/group/attachment/story)
- Block: block/unblock users
- Health check: `GET /api/v1/health` — DB + Redis status, 200 or 503
- Graceful shutdown: `app.enableShutdownHooks()` — clean exit on SIGTERM
- Redis Socket.IO adapter: cross-instance WebSocket via Redis pub/sub (horizontal scale ready)
- Rate limiting: all REST routes + WebSocket events, keyed by userId for authenticated requests

