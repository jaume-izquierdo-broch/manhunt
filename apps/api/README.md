# @manhunt/api

The Manhunt API, built with NestJS: REST for accounts and lobbies, WebSocket (Socket.IO) for live matches.
Endpoints, events and game rules are documented in the [main README](../../README.md).

## Structure

```
src/
├── main.ts                    Process entry point
├── app.module.ts              Wires all modules together
├── app.setup.ts               Helmet, CORS, error filter, WebSocket adapter (shared by main and the tests)
│
├── config/                    Environment variables validated with zod  →  @InjectEnv()
│
├── infrastructure/            Technical building blocks, no game logic
│   ├── database/              Postgres + Drizzle: schema, migrations, pool  →  @InjectDb()
│   ├── redis/                 Shared ioredis client  →  @InjectRedis()
│   └── websocket/             Socket.IO adapter over Redis (multiple replicas)
│
├── common/                    Cross-cutting helpers
│   ├── errors/                AppError + the filter that shapes HTTP errors
│   ├── validation/            ZodValidationPipe / parseOrThrow
│   └── websocket/             withAck: result or error → ack { ok, data | error }
│
└── modules/                   Features (one Nest module per folder)
    ├── health/                GET /health
    ├── users/                 Users repository
    ├── auth/                  Sign-up, login, sessions in Redis, global guard
    ├── realtime/              Socket.IO rooms and RealtimePublisher (sending events)
    ├── matches/               Matches: repository, queries and the LOBBY (WAITING)
    └── game/                  LIVE matches: phases, timers, positions, catches, gateway
```

### Inside a module

Every module uses the same kinds of files, each with one job:

| File | Responsibility | May use |
|---|---|---|
| `*.controller.ts` / `*.gateway.ts` | HTTP / WebSocket entry: validate, read the user, delegate | services |
| `*.service.ts` | Use cases (the logic) | repositories, stores, publisher, `domain/` |
| `*.repository.ts` | **All** SQL for its tables. Nothing else touches Drizzle | `infrastructure/database` |
| `*.store.ts` / `*.queue.ts` | State in Redis / BullMQ timers | `infrastructure/redis` |
| `*.mapper.ts` | Database row → public DTO (`@manhunt/types`) | — |
| `*.errors.ts` | The module's errors and their `ErrorCode` (`MatchErrors.notHost()`) | `common/errors` |
| `domain/*.ts` | Pure rules, no I/O, with a `*.spec.ts` next to them | no Nest, no database |

DTOs, validation schemas and WebSocket events are **not** defined here: they live in
`packages/types` and are shared with the mobile app.

### Module dependencies

```
auth ──▶ users, realtime (closes sockets on logout)
matches ──▶ realtime
game ──▶ matches, realtime, auth (SessionStore)
```

`game` depends on `matches`, never the other way around: the lobby knows nothing about timers.

## Sessions

Login and sign-up return an opaque random token (not a JWT). `SessionStore` keeps the session in Redis:

| Key | Value |
|---|---|
| `mh:session:<sha256(token)>` | `{ userId, username, createdAt }`, expires after `SESSION_TTL_SECONDS` (30 days) without use |
| `mh:user:<userId>:sessions` | Set of that user's session ids, for `POST /auth/logout-all` |

- **Only the token's hash is stored**, so a Redis dump can't be used to log in.
- **Sliding expiration**: every authenticated request or socket connection extends the session (`GETEX`).
- **Real logout**: `POST /auth/logout` deletes the key, so the token stops working at once, and closes the sockets opened with it (each socket joins a `session:<id>` room; the Redis adapter reaches every replica).
- Redis runs with `appendonly yes`, so sessions survive a restart.

## The life of a match

```
REST   POST /matches            LobbyService.create          WAITING
REST   POST /matches/join       LobbyService.join            (match:updated to the lobby)
REST   POST /matches/:id/start  MatchLifecycleService.start  WAITING → HIDING
                                 └─ schedules in BullMQ: hiding-end, match-end, ping #1
BullMQ hiding-end               MatchLifecycleService        HIDING → ACTIVE
BullMQ ping #n                  MatchLifecycleService        ping:reveal / ping:notice, schedules #n+1
WS     location:update          GameplayService              Redis + player:position to the team
WS     catch:attempt            GameplayService              CAUGHT; if none left → finish(HUNTER)
BullMQ match-end                MatchLifecycleService        ACTIVE → FINISHED (runners win)
```

Why it works this way:

- **Transitions are conditional UPDATEs** (`WHERE status = 'HIDING'`, `WHERE status = 'ALIVE'`), so two simultaneous catches or a duplicated or late timer can't break anything.
- **Timers live in BullMQ (Redis).** They survive restarts, and with several replicas each job runs exactly once. On startup, `MatchLifecycleService` reschedules matches in progress.
- **Positions live in Redis**, not Postgres, because they change every few seconds.
- **Services emit events through `RealtimePublisher`** and never touch Socket.IO. The Redis adapter delivers each event to sockets on any replica.

## Tests

| Command | Covers |
|---|---|
| `pnpm test` | Unit tests: `domain/`, password hashing, configuration |
| `pnpm test:e2e` | The full API against real Postgres and Redis (`pnpm docker:up`): auth, lobby, live match, pings |

The e2e tests share helpers in `test/support/` (`useTestApp()`, `emit`, `waitFor`).

## Database changes

1. Edit `src/infrastructure/database/schema.ts`.
2. Run `pnpm db:generate` to write the SQL migration to `drizzle/`. Review it and commit it.
3. The API applies pending migrations when it starts.
