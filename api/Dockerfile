# syntax=docker/dockerfile:1

# ── Base ──────────────────────────────────────────────────────────────────────
# Installs pnpm as root (writes to /usr/local). Individual stages set USER.
FROM node:26-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
COPY --link package.json ./
RUN npm install -g "$(node -p 'require("./package.json").packageManager')" && \
    mkdir -p /pnpm && \
    chown node:node /app /pnpm

# ── Development ───────────────────────────────────────────────────────────────
# Target used by compose. Source and node_modules are volume-mounted at runtime;
# compose startup handles the privilege drop to the node user.
FROM base AS development
EXPOSE 3000

# ── Fetch ─────────────────────────────────────────────────────────────────────
# pnpm fetch only needs the lockfile — cached until dependencies change.
FROM base AS fetch
USER node
COPY --link --chown=node:node pnpm-lock.yaml ./
RUN pnpm fetch

# ── Deps ──────────────────────────────────────────────────────────────────────
# Installs node_modules offline from the virtual store built in fetch.
FROM fetch AS deps
COPY --link --chown=node:node package.json pnpm-workspace.yaml ./
COPY --link --chown=node:node api/package.json ./api/
RUN pnpm install --offline --frozen-lockfile --filter @monowork/api

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS build
COPY --link --chown=node:node api ./api
RUN pnpm --filter @monowork/api build

# ── Production ────────────────────────────────────────────────────────────────
# Minimal runtime image — only the compiled output and production manifest.
FROM node:26-slim AS production
WORKDIR /app
COPY --link --from=build /app/api/dist ./dist
COPY --link --from=build /app/api/package.json ./
ENV NODE_ENV=production
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
