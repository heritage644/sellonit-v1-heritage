# syntax=docker/dockerfile:1.7
# Build from the repository root:  docker build -f apps/worker/Dockerfile .

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /repo
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
COPY packages/queue/package.json packages/queue/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/worker/ apps/worker/
RUN npm run build -w @sellonit/config -w @sellonit/queue \
 && npm run build -w @sellonit/worker

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
COPY packages/queue/package.json packages/queue/
COPY apps/worker/package.json apps/worker/
# --omit=optional: @prisma/client declares the Prisma CLI as an optional peer,
# which npm marks "devOptional"; without this flag the CLI, Prisma Studio and
# TypeScript (~240 MB) end up in the runtime image. Nothing optional is needed at runtime.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --omit=optional --ignore-scripts --workspace @sellonit/worker
COPY --from=build /repo/packages/config/dist packages/config/dist
COPY --from=build /repo/packages/queue/dist packages/queue/dist
COPY --from=build /repo/apps/worker/dist apps/worker/dist

WORKDIR /repo/apps/worker
USER node
# No HTTP port: liveness is the process itself (it exits non-zero if Redis is
# unreachable at start-up). Orchestrators should restart on exit.
CMD ["node", "dist/main.js"]
