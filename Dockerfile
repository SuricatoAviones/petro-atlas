# syntax=docker/dockerfile:1
# One Dockerfile for the whole monorepo. docker-compose.yml builds three targets from it:
#   db-setup  runs the migrations and loads the synthetic seed, then exits
#   api       Express API
#   web       Next.js standalone server

FROM node:26.13.0-alpine AS base
ENV CI=true
RUN npm install --global pnpm@12.18.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/petro-calc/package.json packages/petro-calc/
COPY packages/shared-types/package.json packages/shared-types/
COPY db/package.json db/

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
# NEXT_PUBLIC_* values are inlined into the web bundle at build time.
ARG NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/positron
ENV NEXT_PUBLIC_MAP_STYLE_URL=$NEXT_PUBLIC_MAP_STYLE_URL
# The API as the browser reaches it, not as the web container does.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS db-setup
RUN pnpm install --frozen-lockfile --prod --filter @petroatlas/db
COPY db db
WORKDIR /repo/db
USER node
CMD ["sh", "-c", "node scripts/migrate.ts && node seed/seed.ts"]

FROM base AS api
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod --filter @petroatlas/api...
COPY --from=build /repo/packages/shared-types/dist packages/shared-types/dist
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]

FROM node:26.13.0-alpine AS web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
