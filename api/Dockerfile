# syntax=docker/dockerfile:1

FROM node:26-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
COPY --link package.json ./
RUN npm install -g "$(node -p 'require("./package.json").packageManager')"

FROM base AS deps
WORKDIR /app
COPY --link package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --link api/package.json ./api/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @monowork/api --store-dir /pnpm/store

FROM base AS build
WORKDIR /app
COPY --link --from=deps /app/node_modules ./node_modules
COPY --link --from=deps /app/api/node_modules ./api/node_modules
COPY --link package.json pnpm-workspace.yaml ./
COPY --link api ./api
RUN pnpm --filter @monowork/api build

FROM node:26-slim AS runner
WORKDIR /app
COPY --link --from=build /app/api/dist ./dist
COPY --link api/package.json ./
ENV NODE_ENV=production
# node user (uid 1000) ships with the official node image
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
