# Manhunt

A real-world GPS game of tag: **hunters** against **runners** inside a play area.

```
manhunt/
├── apps/
│   ├── mobile/         # React Native app with Expo (TypeScript)
│   └── api/            # NestJS API: REST + WebSocket (Socket.IO)
├── packages/
│   ├── types/          # Shared contracts: DTOs, zod schemas, WebSocket events
│   └── config-ts/      # Base tsconfig
├── .github/workflows/  # CI/CD
├── docker-compose.yml  # Postgres + Redis (+ the API with the "prod" profile)
└── turbo.json          # Task pipeline and caching
```

## Running locally

You need Node 24, pnpm 11 and Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # first time only
pnpm docker:up                              # Postgres + Redis
pnpm dev                                    # API on :3000 + Expo + shared types in watch mode
```

`pnpm dev` runs everything at once. To run the pieces separately:

```bash
pnpm --filter @manhunt/api dev              # API (applies migrations on startup)
pnpm --filter @manhunt/mobile start         # App: scan the QR code with Expo Go (same Wi-Fi)
pnpm --filter @manhunt/mobile android       # App on a running Android emulator
```

The mobile app finds the API on its own (it uses your computer's IP). Details in [apps/mobile/README.md](apps/mobile/README.md).

> **Port already taken?** If another Postgres or service already uses 5432/6379/3000 (for example inside WSL), create a root `.env` with `DB_PORT=5433` (or `REDIS_PORT`), use that port in `DATABASE_URL` in `apps/api/.env` and, for the API, change `PORT` and `EXPO_PUBLIC_API_PORT`.

| Command | What it does |
|---|---|
| `pnpm test` | Unit tests (API and mobile app) |
| `pnpm test:e2e` | e2e tests (full matches) against real Postgres and Redis |
| `pnpm lint` / `pnpm check-types` | Lint and type checking |
| `pnpm --filter @manhunt/api db:generate` | Creates a migration after editing `apps/api/src/infrastructure/database/schema.ts` |
| `pnpm docker:up:all` | Builds the API image and runs everything in Docker |

### Trying it by hand

- **HTTP**: open [apps/api/requests.http](apps/api/requests.http) with the VS Code *REST Client* extension and send the requests in order (the token, id and join code are passed along automatically).
- **A live match**: with the API running, `pnpm --filter @manhunt/api simulate` plays a full match over WebSocket (two players, a ping, a failed catch and a successful one) and narrates it in the console. If the API isn't on port 3000: `API_URL=http://localhost:3100 pnpm --filter @manhunt/api simulate`.

## Rules

1. **Lobby (`LOBBY`)**: the host creates a lobby and shares its 6-character code. The host joins as a hunter, everyone else as a runner; the host sets the rules (area radius and timings), switches teams and kicks players. Everyone shares their location, so the lobby shows who is close enough. The host starts the match where they stand: that point becomes the center of the play area, and every player must be inside it. A match needs at least one hunter and one runner.
2. **Hiding (`HIDING`)**: runners get a `hidingSeconds` head start.
3. **Hunt (`ACTIVE`)**: lasts `durationSeconds`.
   - Each team sees its own members live.
   - Every `pingIntervalSeconds`, hunters receive the free runners' positions (`ping:reveal`) and runners are told they were seen (`ping:notice`).
   - **Catching**: a hunter sends `catch:attempt`. It counts if both players have a position younger than 30 s and are less than 25 m apart (configurable with `CATCH_RADIUS_METERS` and `POSITION_MAX_AGE_SECONDS`). Caught runners become spectators.
4. **End (`FINISHED`)**: hunters win if they catch everyone; runners win if time runs out.

A user can only be in one unfinished match at a time.

## REST API

Every route requires `Authorization: Bearer <token>`, except those marked 🌐. The token is an opaque session token stored in Redis (details in [apps/api/README.md](apps/api/README.md#sessions)). Errors return `{ statusCode, code, message, details? }`, where `code` is one of `ErrorCode` in `@manhunt/types`.

| Method | Route | Description |
|---|---|---|
| 🌐 POST | `/auth/register` | `{ username, email, password, acceptTerms: true }` → `{ accessToken, user }`. Records which policy version was accepted |
| 🌐 POST | `/auth/login` | `{ identifier, password }` (username **or** email) → `{ accessToken, user }`. One device at a time: it ends the user's previous session |
| GET | `/auth/me` | The current user |
| POST | `/auth/logout` | Ends this session: the token stops working and its sockets are closed (204) |
| POST | `/lobbies` | Creates a lobby: `{ radiusMeters?, hidingSeconds?, durationSeconds?, pingIntervalSeconds? }` |
| POST | `/lobbies/join` | `{ joinCode }` → joins the lobby |
| POST | `/lobbies/:id/leave` | Leave the lobby (not the host) |
| DELETE | `/lobbies/:id` | Close the lobby (host) |
| PATCH | `/lobbies/:id/settings` | `{ radiusMeters, hidingSeconds, durationSeconds, pingIntervalSeconds }`: change the rules (host) |
| PATCH | `/lobbies/:id/players/:userId` | `{ team }`: switch a player's team (host) |
| DELETE | `/lobbies/:id/players/:userId` | Kick a player (host) |
| GET | `/matches/current` | `{ match }` with your unfinished match (lobby or live), or `null` |
| GET | `/matches/:id` | Match details (participants only) |
| POST | `/matches/:id/start` | `{ lat, lng, accuracy? }`, the host's position: `LOBBY → HIDING` (host) |
| 🌐 GET | `/health` · `/health/live` | Readiness (Postgres + Redis) · liveness |

## WebSocket (Socket.IO, namespace `/realtime`)

The app keeps one connection for the whole session: `io(URL + '/realtime', { auth: { token } })`. To follow a match (its lobby included), emit `match:subscribe` after connecting and after every reconnection. Every client event is answered with an ack: `{ ok: true, data } | { ok: false, error: { code, message } }`. The types are `ClientToServerEvents` and `ServerToClientEvents`.

**Client → server**

| Event | Payload | Ack `data` |
|---|---|---|
| `match:subscribe` | `{ matchId }` | `MatchSnapshot`: the match, your team and status, teammates, latest ping, next ping |
| `location:update` | `{ lat, lng, accuracy? }` (every 3-10 s; also in the lobby) | `{ at }` |
| `catch:attempt` | `{ runnerId }` | `{ runnerId, distanceMeters, runnersRemaining }` |

**Server → client**

| Event | To | When |
|---|---|---|
| `match:updated` | the lobby | Any change (players, teams, phase, catches). Payload: the full `MatchDto` |
| `match:closed` | the lobby / kicked player | The host closed the lobby or kicked you |
| `player:position` | your team | A teammate reported their position |
| `ping:reveal` | hunters | The free runners' positions + `nextPingAt` |
| `ping:notice` | runners | "The hunters just saw you" + `nextPingAt` |
| `player:caught` | the lobby | A catch (`runnerId`, `hunterId`, `runnersRemaining`) |
| `match:finished` | the lobby | `winnerTeam` |

Times always travel as absolute ISO dates (`hidingEndsAt`, `endsAt`, `nextPingAt`); clients compute their own countdowns.

## API architecture

Folder structure, what each file is responsible for, and the life of a match: [apps/api/README.md](apps/api/README.md).

## CI/CD (`.github/workflows/ci.yml`)

1. **quality**: lint, types, unit tests and build for the API.
2. **mobile**: lint, types and tests for the app.
3. **e2e**: full matches against Postgres and Redis services.
4. **docker**: builds the image; on `main` it's pushed to `ghcr.io/<owner>/manhunt-api` (`latest` and `sha-xxxxxxx`).
5. **deploy** (optional): enabled by defining the GitHub variables `DEPLOY_HOST`, `DEPLOY_USER` and `DEPLOY_PATH` and the secret `DEPLOY_SSH_KEY`. It SSHes into the server and runs `docker compose pull && up -d`. The server needs `docker-compose.yml` and a `.env` (see `.env.example`).
