mi-proyecto/
├── apps/
│   ├── mobile/         # React Native con Expo (TypeScript)
│   └── api/            # NestJS API (TypeScript)
├── packages/
│   ├── types/          # Tipos, interfaces y contratos compartidos
│   ├── config-eslint/  # Reglas de linter unificadas
│   └── config-ts/      # tsconfig base para todo el repo
├── turbo.json          # Pipeline de tareas y caché
└── package.json        # Configuración de workspaces (pnpm recomendado)