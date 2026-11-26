# @manhunt/mobile

The Manhunt app, built with Expo (React Native), for iOS and Android only. Develop on a real phone with **Expo Go** or on an Android Studio emulator.

## Getting started

1. Start the API (see the [main README](../../README.md)): `pnpm docker:up`, then `pnpm --filter @manhunt/api dev`.
2. Start the app:
   ```bash
   pnpm --filter @manhunt/mobile start
   ```
3. Scan the QR code with Expo Go (Android) or the camera (iOS). The phone and the computer must be on the **same Wi-Fi**. For an Android emulator, use `pnpm --filter @manhunt/mobile android`.

**Which API does the app call?** No setup needed: it uses the IP of the machine running `expo start` and port 3000. Override it in `apps/mobile/.env` (see `.env.example`):

| Variable               | When to use it                                  |
| ---------------------- | ----------------------------------------------- |
| `EXPO_PUBLIC_API_PORT` | The API isn't on port 3000 (e.g. `PORT=3100`)   |
| `EXPO_PUBLIC_API_URL`  | You use `expo start --tunnel` or a deployed API |

> On Windows, if the phone can't connect, allow Node.js through the firewall for private networks.

## Structure

One folder per part of the app you can see. Inside each folder, the file name says what it is:

| Suffix         | What it holds                                               |
| -------------- | ----------------------------------------------------------- |
| `*-screen.tsx` | A whole screen (a route in `app/` points to it)             |
| `*.api.ts`     | Calls to the REST API                                       |
| `*.queries.ts` | React Query hooks over those calls (cache, loading, errors) |
| `*.store.ts`   | State shared by several components (Zustand)                |
| `use-*.ts`     | A hook with one job (connect to the match, track the GPS…)  |
| `components/`  | Pieces used only by that feature's screens                  |
| `*.test.ts(x)` | Tests, next to the file they test                           |

```
src/
├── app/                       Routes (Expo Router). One line each: URL → screen
│   ├── _layout.tsx            Loads the session and decides: (auth) or (app)
│   ├── (auth)/                login, register
│   ├── (app)/                 index (home), create, join, match/[id], settings
│   └── privacy.tsx            Reachable with or without a session
│
├── features/
│   ├── auth/                  Who is signed in
│   │   ├── session.store.ts   ★ The session in memory: logIn, register, logOut, expire
│   │   ├── session-storage.ts The session saved on the phone (SecureStore, encrypted)
│   │   ├── auth.api.ts        register, login, me, logout
│   │   ├── auth-screen.tsx    Login and sign-up screen
│   │   └── components/        The two forms
│   │
│   ├── home/                  Home: your match, create / join, how to play
│   ├── matches/               Create and join a match (REST)
│   │   ├── matches.api.ts     Every /matches endpoint
│   │   ├── matches.queries.ts React Query hooks (useCurrentMatch, useCreateMatch…)
│   │   └── *-screen.tsx       Create match, join with a code
│   │
│   ├── realtime/              The socket to the server, open for the whole session
│   │   ├── use-realtime-connection.ts ★ Opens/closes it, background, session ended
│   │   ├── realtime.store.ts  The socket and its status (connected, reconnecting…)
│   │   └── socket.ts          Typed Socket.IO client
│   │
│   ├── live-match/            The match being played (over the realtime socket)
│   │   ├── match-screen.tsx   ★ Entry point: follows the match and picks the phase
│   │   ├── live-match.store.ts★ Everything about the match on screen + its actions
│   │   ├── use-match-connection.ts  Subscribes; server event → store action
│   │   ├── use-location-tracking.ts GPS → store, and position → server
│   │   ├── phases/            Lobby, play (hiding + hunt), results
│   │   ├── components/        Map, HUD, catch panel, team list…
│   │   └── rules/             Pure game logic: distances, timers, players
│   │
│   ├── location/              Location access: allowed, blocked, GPS off, approximate…
│   │   ├── location-access.store.ts  Read on use and on returning to the app; `fix()`
│   │   └── location-access-notice.tsx The message + the one button that fixes it
│   │
│   ├── settings/              Profile, privacy, log out
│   └── legal/                 Privacy policy text and screen
│
├── lib/                       Technical building blocks, no game logic
│   ├── http/                  HTTP client + ApiError
│   ├── location/              Location permission and GPS readings
│   ├── query-client.ts        React Query cache
│   ├── use-form.ts, forms.ts  Forms validated with the shared zod schemas
│   └── config.ts, format.ts, haptics.ts
│
├── ui/                        Design system: theme, Button, Card, ListRow, Icon…
└── test-utils/                Fixtures and helpers to fill the stores in tests
```

## Where the data lives

There are three kinds of state, each in one place:

| Kind                   | Example                     | Where                         | How you read it                          |
| ---------------------- | --------------------------- | ----------------------------- | ---------------------------------------- |
| **Server data** (REST) | Your current match          | React Query (`*.queries.ts`)  | `const { data } = useCurrentMatch()`     |
| **Shared app state**   | The session, the live match | Zustand stores (`*.store.ts`) | `const user = useSession((s) => s.user)` |
| **One screen's state** | Form fields, a loading flag | `useState` in that component  | —                                        |
| **Saved on the phone** | The session                 | `auth/session-storage.ts`     | Only through the session store           |

A store is a plain object with data and functions. Components read only the part they need (so they redraw only when that part changes), and any code can call its actions, even outside React:

```ts
useSession.getState().expire(); // e.g. from the HTTP client on a 401
useLiveMatch.getState().updateMatch(m); // e.g. from a socket event
```

### The socket

One Socket.IO connection per session, opened by `useRealtimeConnection` in the `(app)` layout:

- **Signed in, app in the foreground** → connected. The server can reach the phone at any time.
- **App in the background** → disconnected (saves battery); it reconnects on return.
- **Session ended elsewhere** (logout, or a login on another device) → the server closes the
  socket, the app checks `/auth/me`, gets a 401 and shows the login with "Session ended".
- **Logged out** → the `(app)` layout unmounts and the socket closes.

Coming back to the app also refetches stale REST data (`focusManager` in `lib/query-client.ts`).

### The life of a match on the phone

```
match/[id] opens  →  MatchScreen
                       ├─ useMatchConnection   subscribes over the app's socket (match:subscribe),
                       │                       and turns every server event into a store action:
                       │                         'player:caught' → playerCaught()
                       │                         'ping:reveal'   → pingRevealed()  …
                       ├─ useLocationTracking  while live and free: GPS → myPosition,
                       │                       and sends it to the server every few seconds
                       └─ picks a phase from match.status:
                            WAITING → LobbyPhase · HIDING/ACTIVE → PlayPhase · FINISHED → ResultsPhase
leaving the screen →  match:unsubscribe, store emptied (the socket stays open)
```

- After every (re)connection the app subscribes again and gets a full snapshot, so a dropped connection never leaves stale state.
- **GPS only runs when needed:** while the match is live and you're still free. The position is sent when you move (at most every 3 s) and every 10 s even when you stand still, so the server always has a recent position to validate catches.
- **Countdowns use the server's clock:** the offset is measured from the snapshot.
- **Types and validation come from `@manhunt/types`**, the same as the API.

### Where do I change…?

| I want to change…                        | File                                          |
| ---------------------------------------- | --------------------------------------------- |
| What happens when a server event arrives | `live-match/live-match.store.ts` (the action) |
| Which events the app listens to          | `live-match/use-match-connection.ts`          |
| When the socket connects or disconnects  | `realtime/use-realtime-connection.ts`         |
| How location access is asked or fixed    | `location/location-access.store.ts`           |
| How often the position is sent           | `live-match/rules/location-reporting.ts`      |
| The lobby / game / results screens       | `live-match/phases/`                          |
| Login, logout, what happens on a 401     | `auth/session.store.ts`                       |
| A REST call                              | `*/…api.ts`, and its hook in `*.queries.ts`   |
| Colors, spacing, fonts                   | `ui/theme.ts`                                 |

## Scripts

| Command                          | What it does                                                               |
| -------------------------------- | -------------------------------------------------------------------------- |
| `pnpm start`                     | Dev server (QR code for Expo Go)                                           |
| `pnpm test`                      | Tests (jest-expo + Testing Library)                                        |
| `pnpm lint` / `pnpm check-types` | ESLint (Expo config) and TypeScript                                        |
| `pnpm icons`                     | Regenerates every icon and the splash from `assets/brand/manhunt-icon.svg` |

## Logo and icons

The source of truth is **`assets/brand/manhunt-icon.svg`** (a hooded figure inside a crosshair). To change the icon, replace or edit that SVG, keeping its `layer:` comments, then run `pnpm icons`. The script writes:

| File                                                     | Used for                                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `images/icon.png` (1024, square, opaque)                 | App icon: iOS and the default everywhere else. iOS rounds the corners itself             |
| `images/android-icon-background.png` + `-foreground.png` | Android adaptive icon. The figure sits in the central 66% that every launcher mask keeps |
| `images/android-icon-monochrome.png`                     | Android 13+ themed icons (single color, tinted by the system)                            |
| `images/splash-icon.png`                                 | Splash screen, over the `#030303` set in `app.json`                                      |
| `images/logo.png`                                        | In-app logo (login and sign-up), with rounded corners                                    |
| `store/play-store-512.png`                               | Google Play listing. Uploaded by hand, not used by the app                               |

There are no per-density sizes (Android `mipmap-*`, the iOS `AppIcon` set) or desktop formats (`.ico`, `.icns`) in the repo: `expo prebuild` and EAS generate the native sizes from these files, and the app has no desktop build.

## Privacy

The text lives in `src/features/legal/privacy-policy.ts` and is shown at `/privacy`, with or without a session. It is a **draft**: fill in `LEGAL_CONTACT` and get it reviewed before publishing. If you change it materially, bump `TERMS_VERSION` in `packages/types/src/auth.ts`: the API records which version each user accepted.

## Current limitations

- **Foreground location only.** With the app in the background, the position isn't sent. Background tracking needs a _development build_ (not Expo Go) and `expo-task-manager`.
