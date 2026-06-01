# syntax=docker/dockerfile:1

# ── Base ──────────────────────────────────────────────────────────────────────
# Installs pnpm as root (writes to /usr/local). Individual stages set USER.
FROM node:26-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
COPY --link package.json ./
RUN apt update && \
    apt install -y wget && \
    npm install -g "$(node -p 'require("./package.json").packageManager')" && \
    mkdir -p /pnpm && \
    chown node:node /app /pnpm

# ── Development ───────────────────────────────────────────────────────────────
# Target used by compose. Source and node_modules are volume-mounted at runtime;
# compose startup handles the privilege drop to the node user.
FROM base AS development
EXPOSE 3000

# ── Build ─────────────────────────────────────────────────────────────────────
# Single stage following pnpm's Docker guide: install with a persistent store
# cache mount, build, then `pnpm deploy` to assemble a self-contained directory
# with only production node_modules for @monowork/api. Runs as root so the
# deploy target outside /app (`/prod/api`) can be created.
FROM base AS build
COPY --link . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @monowork/api build
RUN pnpm deploy --filter @monowork/api --prod /prod/api

# ── Production ────────────────────────────────────────────────────────────────
# Minimal runtime image — no pnpm, no devDependencies, no source files. The
# deploy directory already holds a pruned production node_modules and the
# compiled output, so we copy it wholesale.
FROM node:26-slim AS production
WORKDIR /app
COPY --link --from=build /prod/api/package.json ./
COPY --link --from=build /prod/api/node_modules ./node_modules
COPY --link --from=build /prod/api/dist ./dist
ENV NODE_ENV=production
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "./dist/src/otel.js", "./dist/src/index.js"]
