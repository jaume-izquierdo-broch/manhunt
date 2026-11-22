# syntax=docker/dockerfile:1
# Imagen de producción de la API. Se construye desde la RAÍZ del monorepo:
#   docker build -f apps/api/Dockerfile -t manhunt-api .

ARG NODE_VERSION=24-alpine

# ---------- base: node + pnpm (versión fijada por packageManager) ----------
FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# ---------- prune: solo los paquetes que necesita la API ----------
FROM base AS pruner
RUN npm install -g turbo@2.11.10
COPY . .
RUN turbo prune @manhunt/api --docker

# ---------- build: instala (con caché), compila y empaqueta solo prod ----------
FROM base AS builder
# 1) Solo manifiestos + lockfile -> esta capa se cachea mientras no cambien dependencias
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# 2) Código fuente y build (compila también @manhunt/types)
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@manhunt/api...

# 3) Carpeta autocontenida con dist/, drizzle/ y node_modules de producción
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter=@manhunt/api deploy --legacy --prod /out/api

# ---------- runner: imagen final mínima ----------
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=builder --chown=node:node /out/api ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1
CMD ["node", "--enable-source-maps", "dist/main.js"]
