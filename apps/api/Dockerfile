# syntax=docker/dockerfile:1.7
# Build from the repository root:  docker build -f apps/api/Dockerfile .
# Targets:
#   runtime (default) — the API server
#   migrate           — one-off `prisma migrate deploy` (needs the Prisma CLI)

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /repo
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# ── Install every workspace dependency (cached on manifests only) ────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
COPY packages/queue/package.json packages/queue/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

# ── Compile shared packages, generate the Prisma client, compile the API ─────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN npm run build -w @sellonit/shared -w @sellonit/config -w @sellonit/queue \
 && npm run build -w @sellonit/api

# ── Database migrations (docker compose `migrate` service / release step) ────
FROM deps AS migrate
COPY apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma/ apps/api/prisma/
WORKDIR /repo/apps/api
USER node
CMD ["npx", "--no-install", "prisma", "migrate", "deploy"]

# ── Production image: runtime dependencies + compiled output only ────────────
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
COPY packages/queue/package.json packages/queue/
COPY apps/api/package.json apps/api/
# --omit=optional: @prisma/client declares the Prisma CLI as an optional peer,
# which npm marks "devOptional"; without this flag the CLI, Prisma Studio and
# TypeScript (~240 MB) end up in the runtime image. Nothing optional is needed at runtime.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --omit=optional --ignore-scripts --workspace @sellonit/api
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/packages/config/dist packages/config/dist
COPY --from=build /repo/packages/queue/dist packages/queue/dist
COPY --from=build /repo/apps/api/dist apps/api/dist

WORKDIR /repo/apps/api
USER node
EXPOSE 4000
# Add a HEALTHCHECK here once the contract's GET /v1/health endpoint exists.
# Exec form: Node receives SIGTERM directly.
CMD ["node", "dist/main.js"]
