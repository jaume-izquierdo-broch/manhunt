# @manhunt/api

API de Manhunt con NestJS: REST para cuentas y salas, WebSocket (Socket.IO) para la partida en directo.
Los endpoints, eventos y reglas del juego están en el [README principal](../../README.md).

## Estructura

```
src/
├── main.ts                    Arranque del proceso
├── app.module.ts              Une todos los módulos
├── app.setup.ts               Helmet, CORS, filtro de errores, adaptador WebSocket (lo comparten main y tests)
│
├── config/                    Variables de entorno validadas con zod  →  @InjectEnv()
│
├── infrastructure/            Piezas técnicas, sin lógica de juego
│   ├── database/              Postgres + Drizzle: esquema, migraciones, pool  →  @InjectDb()
│   ├── redis/                 Cliente ioredis compartido  →  @InjectRedis()
│   └── websocket/             Adaptador Socket.IO sobre Redis (varias réplicas)
│
├── common/                    Utilidades transversales
│   ├── errors/                AppError + filtro que da forma a los errores HTTP
│   ├── validation/            ZodValidationPipe / parseOrThrow
│   └── websocket/             withAck: resultado/errores → ack { ok, data | error }
│
└── modules/                   Funcionalidades (un módulo Nest por carpeta)
    ├── health/                GET /health
    ├── users/                 Repositorio de usuarios
    ├── auth/                  Registro, login, JWT, guard global
    ├── realtime/              Salas de Socket.IO y RealtimePublisher (enviar eventos)
    ├── matches/               Partidas: repositorio, consultas y SALA (WAITING)
    └── game/                  Partida EN JUEGO: fases, temporizadores, posiciones, capturas, gateway
```

### Dentro de un módulo

Cada módulo usa los mismos tipos de archivo, siempre con el mismo papel:

| Archivo | Responsabilidad | Puede usar |
|---|---|---|
| `*.controller.ts` / `*.gateway.ts` | Entrada HTTP / WebSocket: valida, saca el usuario, delega | servicios |
| `*.service.ts` | Casos de uso (la lógica) | repositorios, stores, publisher, `domain/` |
| `*.repository.ts` | **Todo** el SQL de sus tablas. Nadie más usa Drizzle | `infrastructure/database` |
| `*.store.ts` / `*.queue.ts` | Estado en Redis / temporizadores BullMQ | `infrastructure/redis` |
| `*.mapper.ts` | Fila de BD → DTO público (`@manhunt/types`) | — |
| `*.errors.ts` | Errores del módulo con su `ErrorCode` (`MatchErrors.notHost()`) | `common/errors` |
| `domain/*.ts` | Reglas puras, sin I/O, con su `*.spec.ts` al lado | nada de Nest/BD |

Los DTOs, esquemas de validación y eventos WebSocket **no** se definen aquí: viven en
`packages/types` y los comparte la app móvil.

### Dependencias entre módulos

```
auth ──▶ users
matches ──▶ realtime
game ──▶ matches, realtime, auth (TokenService)
```

`game` depende de `matches`, nunca al revés: la sala no sabe nada de temporizadores.

## Flujo de una partida

```
REST  POST /matches            LobbyService.create         WAITING
REST  POST /matches/join       LobbyService.join           (match:updated a la sala)
REST  POST /matches/:id/start  MatchLifecycleService.start WAITING → HIDING
                                └─ programa en BullMQ: hiding-end, match-end, ping #1
BullMQ hiding-end              MatchLifecycleService       HIDING → ACTIVE
BullMQ ping #n                 MatchLifecycleService       ping:reveal / ping:notice, programa #n+1
WS    location:update          GameplayService             Redis + player:position al equipo
WS    catch:attempt            GameplayService             CAUGHT; si no quedan → finish(HUNTER)
BullMQ match-end               MatchLifecycleService       ACTIVE → FINISHED (ganan RUNNER)
```

Por qué así:

- **Las transiciones son UPDATE condicionales** (`WHERE status = 'HIDING'`, `WHERE status = 'ALIVE'`), así que dos capturas a la vez o un temporizador duplicado o tardío no rompen nada.
- **Los temporizadores están en BullMQ (Redis).** Sobreviven a reinicios, y con varias réplicas cada trabajo se ejecuta una sola vez. Al arrancar, `MatchLifecycleService` re-programa las partidas en curso.
- **Las posiciones viven en Redis**, no en Postgres, porque cambian cada pocos segundos.
- **Los servicios emiten eventos con `RealtimePublisher`**, sin tocar Socket.IO. El adaptador de Redis hace llegar cada evento a los sockets de cualquier réplica.

## Tests

| Comando | Qué cubre |
|---|---|
| `pnpm test` | Unitarios: `domain/`, contraseñas, configuración |
| `pnpm test:e2e` | La API completa contra Postgres y Redis reales (`pnpm docker:up`): auth, sala, partida, pings |

Los tests e2e usan `test/support/` (`useTestApp()`, `emit`, `waitFor`).

## Base de datos

1. Cambia `src/infrastructure/database/schema.ts`.
2. Ejecuta `pnpm db:generate` para crear el SQL en `drizzle/`. Revísalo y súbelo al repo.
3. Al arrancar, la API aplica las migraciones pendientes.
