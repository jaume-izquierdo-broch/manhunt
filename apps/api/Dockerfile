# syntax=docker/dockerfile:1
# Production image for the API. Build it from the monorepo ROOT:
#   docker build -f apps/api/Dockerfile -t manhunt-api .

ARG NODE_VERSION=24-alpine

# ---------- base: node + pnpm (version pinned by packageManager) ----------
FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# ---------- prune: keep only the packages the API needs ----------
FROM base AS pruner
RUN npm install -g turbo@2.11.10
COPY . .
RUN turbo prune @manhunt/api --docker

# ---------- build: install (cached), compile, bundle production deps ----------
FROM base AS builder
# 1) Manifests + lockfile only: this layer stays cached until dependencies change
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# 2) Source code and build (also compiles @manhunt/types)
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@manhunt/api...

# 3) Self-contained folder with dist/, drizzle/ and production node_modules
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter=@manhunt/api deploy --legacy --prod /out/api

# ---------- runner: minimal final image ----------
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
