# Manhunt

Juego móvil de pilla-pilla con GPS: **cazadores** contra **escapadores** dentro de una zona.

```
manhunt/
├── apps/
│   ├── mobile/         # React Native con Expo (TypeScript)
│   └── api/            # NestJS: REST + WebSocket (Socket.IO)
├── packages/
│   ├── types/          # Contratos compartidos: DTOs, esquemas zod, eventos WebSocket
│   ├── config-eslint/  # Reglas de linter unificadas
│   └── config-ts/      # tsconfig base para todo el repo
├── .github/workflows/  # CI/CD
├── docker-compose.yml  # Postgres + Redis (+ API con el perfil "prod")
└── turbo.json          # Pipeline de tareas y caché
```

## Arrancar en local

Necesitas Node 24, pnpm 11 y Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # primera vez
pnpm docker:up                              # Postgres + Redis
pnpm --filter @manhunt/api dev              # API en http://localhost:3000 (aplica migraciones al arrancar)
pnpm --filter @manhunt/mobile start         # App: escanea el QR con Expo Go (misma Wi-Fi)
```

La app móvil encuentra la API sola (usa la IP de tu ordenador). Detalles en [apps/mobile/README.md](apps/mobile/README.md).

> **¿Puerto ocupado?** Si ya tienes otro Postgres o servicio en el 5432/6379/3000 (por ejemplo, dentro de WSL), crea un `.env` en la raíz con `DB_PORT=5433` (o `REDIS_PORT`), pon ese puerto en `DATABASE_URL` de `apps/api/.env` y, para la API, cambia `PORT` y `EXPO_PUBLIC_API_PORT`.

| Comando | Qué hace |
|---|---|
| `pnpm test` | Tests unitarios (API y app móvil) |
| `pnpm test:e2e` | Tests e2e (partida completa) contra Postgres y Redis reales |
| `pnpm lint` / `pnpm check-types` | Lint y tipos |
| `pnpm --filter @manhunt/api db:generate` | Genera una migración tras cambiar `apps/api/src/infrastructure/database/schema.ts` |
| `pnpm docker:up:all` | Construye la imagen de la API y levanta todo en Docker |

### Probar a mano

- **HTTP**: abre [apps/api/requests.http](apps/api/requests.http) con la extensión *REST Client* de VS Code y lanza las peticiones en orden (se pasan el token, el id y el código solas).
- **Partida en tiempo real**: con la API arrancada, `pnpm --filter @manhunt/api simulate` juega una partida completa por WebSocket (dos jugadores, ping, captura fallida, captura buena) y la narra por consola. Si la API no está en el 3000: `API_URL=http://localhost:3100 pnpm --filter @manhunt/api simulate`.

## Reglas (versión simple)

1. **Sala (`WAITING`)**: el anfitrión crea la partida (zona circular, tiempos) y comparte el código de 6 caracteres. Él entra como cazador, el resto como escapadores; el anfitrión puede cambiar equipos o expulsar. Hace falta al menos un cazador y un escapador.
2. **Escondite (`HIDING`)**: `hidingSeconds` de ventaja para los escapadores.
3. **Caza (`ACTIVE`)**: dura `durationSeconds`.
   - Cada equipo ve a sus compañeros en directo.
   - Cada `pingIntervalSeconds` los cazadores reciben la posición de los escapadores vivos (`ping:reveal`) y los escapadores reciben un aviso (`ping:notice`).
   - **Captura**: un cazador emite `catch:attempt`; vale si ambos tienen posición de hace menos de 30 s y están a menos de 25 m (configurable con `CATCH_RADIUS_METERS` y `POSITION_MAX_AGE_SECONDS`). El capturado pasa a espectador.
4. **Fin (`FINISHED`)**: ganan los cazadores si capturan a todos; ganan los escapadores si se acaba el tiempo.

Un usuario solo puede estar en una partida no terminada a la vez.

## API REST

Todas las rutas requieren `Authorization: Bearer <token>`, salvo las marcadas 🌐. Los errores devuelven `{ statusCode, code, message, details? }`; `code` está en `ErrorCode` de `@manhunt/types`.

| Método | Ruta | Descripción |
|---|---|---|
| 🌐 POST | `/auth/register` | `{ username, email, password, acceptTerms: true }` → `{ accessToken, user }`. Guarda qué versión de la política se aceptó |
| 🌐 POST | `/auth/login` | `{ identifier, password }` (usuario **o** email) → `{ accessToken, user }` |
| GET | `/auth/me` | Usuario actual |
| POST | `/matches` | Crea partida: `{ playArea: { lat, lng, radiusMeters }, hidingSeconds?, durationSeconds?, pingIntervalSeconds? }` |
| POST | `/matches/join` | `{ joinCode }` → entra en la sala |
| GET | `/matches/current` | `{ match }` con tu partida no terminada, o `null` |
| GET | `/matches/:id` | Detalle (solo participantes) |
| POST | `/matches/:id/leave` | Salir de la sala (no anfitrión, solo en `WAITING`) |
| DELETE | `/matches/:id` | Cerrar la sala (anfitrión, solo en `WAITING`) |
| PATCH | `/matches/:id/players/:userId` | `{ team }` cambiar equipo (anfitrión, `WAITING`) |
| DELETE | `/matches/:id/players/:userId` | Expulsar (anfitrión, `WAITING`) |
| POST | `/matches/:id/start` | Empezar: `WAITING → HIDING` |
| 🌐 GET | `/health` · `/health/live` | Readiness (Postgres + Redis) · liveness |

## WebSocket (Socket.IO, namespace `/game`)

Conexión: `io(URL + '/game', { auth: { token } })`. Tras conectar (y tras cada reconexión) emite `match:subscribe`. Todo emit del cliente responde con un ack `{ ok: true, data } | { ok: false, error: { code, message } }`. Los tipos están en `ClientToServerEvents` y `ServerToClientEvents`.

**Cliente → servidor**

| Evento | Payload | Ack `data` |
|---|---|---|
| `match:subscribe` | `{ matchId }` | `MatchSnapshot`: partida, tu equipo y estado, compañeros, último ping, próximo ping |
| `location:update` | `{ lat, lng, accuracy? }` (cada 5-10 s) | `{ at }` |
| `catch:attempt` | `{ runnerId }` | `{ runnerId, distanceMeters, runnersRemaining }` |

**Servidor → cliente**

| Evento | A quién | Cuándo |
|---|---|---|
| `match:updated` | sala | Cualquier cambio (jugadores, equipos, fase, capturas). Payload: `MatchDto` completo |
| `match:closed` | sala / expulsado | El anfitrión cerró la sala o te expulsó |
| `player:position` | tu equipo | Un compañero envió su posición |
| `ping:reveal` | cazadores | Posiciones de los escapadores vivos + `nextPingAt` |
| `ping:notice` | escapadores | "Os acaban de localizar" + `nextPingAt` |
| `player:caught` | sala | Captura (`runnerId`, `hunterId`, `runnersRemaining`) |
| `match:finished` | sala | `winnerTeam` |

Las fechas viajan siempre como ISO absolutas (`hidingEndsAt`, `endsAt`, `nextPingAt`): la app calcula las cuentas atrás.

## Arquitectura de la API

Estructura de carpetas, responsabilidades de cada archivo y flujo de una partida: [apps/api/README.md](apps/api/README.md).

## CI/CD (`.github/workflows/ci.yml`)

1. **quality**: lint, tipos, tests unitarios y build.
2. **e2e**: partida completa contra servicios Postgres y Redis.
3. **docker**: construye la imagen; en `main` la publica en `ghcr.io/<owner>/manhunt-api` (`latest` y `sha-xxxxxxx`).
4. **deploy** (opcional): se activa definiendo en GitHub las variables `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` y el secreto `DEPLOY_SSH_KEY`. Entra por SSH al servidor y hace `docker compose pull && up -d`. El servidor necesita `docker-compose.yml` y un `.env` (ver `.env.example`).
