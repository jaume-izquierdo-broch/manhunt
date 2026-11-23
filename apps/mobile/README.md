# @manhunt/mobile

The Manhunt app, built with Expo (React Native). It runs on iOS and Android with **Expo Go**. The web build also works, but without a map: it's only meant for testing.

## Getting started

1. Start the API (see the [main README](../../README.md)): `pnpm docker:up`, then `pnpm --filter @manhunt/api dev`.
2. Start the app:
   ```bash
   pnpm --filter @manhunt/mobile start
   ```
3. Scan the QR code with Expo Go (Android) or the camera (iOS). The phone and the computer must be on the **same Wi-Fi**. For an Android emulator, use `pnpm --filter @manhunt/mobile android`.

**Which API does the app call?** No setup needed: it uses the IP of the machine running `expo start` and port 3000. Override it in `apps/mobile/.env` (see `.env.example`):

| Variable | When to use it |
|---|---|
| `EXPO_PUBLIC_API_PORT` | The API isn't on port 3000 (e.g. `PORT=3100`) |
| `EXPO_PUBLIC_API_URL` | You use `expo start --tunnel` or a deployed API |

> On Windows, if the phone can't connect, allow Node.js through the firewall for private networks.

## Structure

```
src/
├── app/                  Expo Router routes. They only map a URL to a screen, no logic
│   ├── _layout.tsx       Providers + protected routes (signed in or out)
│   ├── (auth)/           login, register
│   ├── privacy.tsx       Privacy policy (reachable without a session)
│   └── (app)/            index (home), create, join, match/[id]
│
├── lib/                  Technical building blocks, no game logic
│   ├── config.ts         Resolves the API URL
│   ├── http/             Typed HTTP client + ApiError
│   ├── location/         Location permission and GPS (expo-location)
│   ├── forms.ts          Validation with the shared zod schemas
│   ├── use-form.ts       Form hook (values, per-field errors, submission)
│   ├── format.ts         Distance and duration formatting
│   └── haptics.ts        Vibrations
│
├── ui/                   Design system: light/dark theme + base components
│
├── features/
│   ├── auth/             Session (token in SecureStore), login and sign-up
│   ├── legal/            Privacy policy and terms of use
│   ├── matches/          Home, create match, join (REST + React Query)
│   └── game/             The live match
│       ├── socket/       Typed Socket.IO client + emitWithAck
│       ├── session/      GameSessionProvider: socket + state + GPS
│       ├── state/        PURE reducer: every server event is an action
│       ├── domain/       Geometry, timing and when to report the position (pure)
│       ├── hooks/        Server clock, periodic position reporting
│       ├── components/   Map, HUD, catch panel, team list...
│       └── views/        Lobby, play and results (picked by match status)
│
└── test-utils/           Fixtures and rendering with a fake match session
```

How the pieces fit together:

- **REST with React Query** for everything that isn't live: the session, creating and joining matches, lobby actions.
- **One Socket.IO connection per match.** `GameSessionProvider` opens it when entering `match/[id]` and closes it on leaving.
  - After every (re)connection it subscribes again and receives a full snapshot.
  - Every server event becomes an action of `gameReducer`.
- **The match screen is a single route** that shows the lobby, the game or the results based on `match.status`.
- **GPS only runs when needed:** while the match is live and you're still free.
  - The position is sent when you move (at most every 3 s) and every 10 s even when you stand still, so the server always has a recent position to validate catches.
- **Countdowns use the server's clock:** the offset is measured from the snapshot.
- **Types and validation come from `@manhunt/types`**, the same as the API.

## Scripts

| Command | What it does |
|---|---|
| `pnpm start` | Dev server (QR code for Expo Go) |
| `pnpm test` | Tests (jest-expo + Testing Library) |
| `pnpm lint` / `pnpm check-types` | ESLint (Expo config) and TypeScript |
| `pnpm icons` | Regenerates every icon and the splash from `assets/brand/manhunt-icon.svg` |

## Logo and icons

The source of truth is **`assets/brand/manhunt-icon.svg`** (a hooded figure inside a crosshair). To change the icon, replace or edit that SVG, keeping its `layer:` comments, then run `pnpm icons`. The script writes:

| File | Used for |
|---|---|
| `images/icon.png` (1024, square, opaque) | App icon: iOS and the default everywhere else. iOS rounds the corners itself |
| `images/android-icon-background.png` + `-foreground.png` | Android adaptive icon. The figure sits in the central 66% that every launcher mask keeps |
| `images/android-icon-monochrome.png` | Android 13+ themed icons (single color, tinted by the system) |
| `images/splash-icon.png` | Splash screen, over the `#030303` set in `app.json` |
| `images/logo.png` / `images/favicon.png` | In-app logo (login and sign-up) and web favicon, with rounded corners |
| `store/play-store-512.png` | Google Play listing. Uploaded by hand, not used by the app |

There are no per-density sizes (Android `mipmap-*`, the iOS `AppIcon` set) or desktop formats (`.ico`, `.icns`) in the repo: `expo prebuild` and EAS generate the native sizes from these files, and the app has no desktop build.

## Privacy

The text lives in `src/features/legal/privacy-policy.ts` and is shown at `/privacy`, with or without a session. It is a **draft**: fill in `LEGAL_CONTACT` and get it reviewed before publishing. If you change it materially, bump `TERMS_VERSION` in `packages/types/src/auth.ts`: the API records which version each user accepted.

## Current limitations

- **Foreground location only.** With the app in the background, the position isn't sent. Background tracking needs a *development build* (not Expo Go) and `expo-task-manager`.
- **No map on the web:** `react-native-maps` doesn't support it, so a list of positions is shown instead.
