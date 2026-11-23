# @manhunt/mobile

App de Manhunt con Expo (React Native). Funciona en iOS y Android con **Expo Go**. En web también funciona, pero sin mapa: sirve solo para probar.

## Arrancar

1. Levanta la API (ver el [README principal](../../README.md)): `pnpm docker:up` y `pnpm --filter @manhunt/api dev`.
2. Arranca la app:
   ```bash
   pnpm --filter @manhunt/mobile start
   ```
3. Escanea el QR con Expo Go (Android) o con la cámara (iOS). El móvil y el ordenador deben estar en la **misma Wi-Fi**.

**¿A qué API llama la app?** No hace falta configurar nada: usa la IP del ordenador que ejecuta `expo start` y el puerto 3000. Puedes cambiarlo en `apps/mobile/.env` (ver `.env.example`):

| Variable | Cuándo usarla |
|---|---|
| `EXPO_PUBLIC_API_PORT` | La API no está en el 3000 (por ejemplo, `PORT=3100`) |
| `EXPO_PUBLIC_API_URL` | Usas `expo start --tunnel` o una API desplegada |

> En Windows, si el móvil no conecta, permite Node.js en el firewall para redes privadas.

## Estructura

```
src/
├── app/                  Rutas de Expo Router. Solo enlazan URL → pantalla, sin lógica
│   ├── _layout.tsx       Proveedores + rutas protegidas (con o sin sesión)
│   ├── (auth)/           login, register
│   └── (app)/            index (inicio), create, join, match/[id]
│
├── lib/                  Piezas técnicas sin lógica de juego
│   ├── config.ts         Resolución de la URL de la API
│   ├── http/             Cliente HTTP tipado + ApiError
│   ├── location/         Permiso y GPS (expo-location)
│   ├── forms.ts          Validación con los esquemas zod compartidos
│   ├── format.ts         Formateo de distancias y duraciones
│   └── haptics.ts        Vibraciones
│
├── ui/                   Sistema de diseño: tema claro/oscuro + componentes base
│
├── features/
│   ├── auth/             Sesión (token en SecureStore), login/registro
│   ├── matches/          Inicio, crear partida, unirse (REST + React Query)
│   └── game/             La partida en directo
│       ├── socket/       Socket.IO tipado + emitWithAck
│       ├── session/      GameSessionProvider: socket + estado + GPS
│       ├── state/        Reducer PURO: cada evento del servidor es una acción
│       ├── domain/       Geometría, tiempos y cuándo enviar la posición (puro)
│       ├── hooks/        Reloj del servidor, envío periódico de la posición
│       ├── components/   Mapa, HUD, panel de captura...
│       └── views/        Sala, partida y resultados (según el estado)
│
└── test-utils/           Fixtures y render con una sesión de partida falsa
```

Cómo encajan las piezas:

- **REST con React Query** para lo que no es en directo: sesión, crear partida, unirse y acciones de la sala.
- **Una conexión Socket.IO por partida.** La abre `GameSessionProvider` al entrar en `match/[id]` y la cierra al salir.
  - Tras cada (re)conexión se re-suscribe y recibe un snapshot completo.
  - Cada evento del servidor se convierte en una acción del `gameReducer`.
- **La pantalla de partida es una sola ruta** que muestra la sala, el juego o los resultados según `match.status`.
- **El GPS se activa solo cuando hace falta:** mientras la partida está en juego y sigues libre.
  - La posición se envía al moverte, como mucho cada 3 s, y cada 10 s aunque estés quieto. Así el servidor siempre tiene una posición reciente para validar capturas.
- **Las cuentas atrás usan el reloj del servidor:** el desfase entre relojes se calcula en el snapshot.
- **Los tipos y la validación vienen de `@manhunt/types`,** igual que en la API.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm start` | Servidor de desarrollo (QR para Expo Go) |
| `pnpm test` | Tests (jest-expo + Testing Library) |
| `pnpm lint` / `pnpm check-types` | ESLint (config de Expo) y TypeScript |

## Limitaciones actuales

- **Ubicación solo en primer plano.** Con la app en segundo plano no se envía la posición. Hacerlo requiere una *development build* (no Expo Go) y `expo-task-manager`.
- **En web no hay mapa:** `react-native-maps` no lo soporta y se muestra una lista de posiciones.
