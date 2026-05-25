# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

pnpm monorepo with a Fastify 5 API (`api/`) and a Vue 3 frontend (`app/`). All development runs inside Docker containers — no Node.js or pnpm on the host is needed. The `just` task runner wraps all Docker Compose operations.

## Commands

All commands run tasks inside containers via Docker Compose. Services must be running (`just start`) before using `exec`-based commands.

```sh
just start          # start all services (api, app, postgres, otel-lgtm)
just stop           # stop and remove containers
just logs           # stream logs from api
just shell          # interactive shell in api container

just lint           # lint api + app
just lint-fix       # lint and autofix api + app
just format         # format api + app
just format-check   # check formatting without writing
just typecheck      # TypeScript check (api only)

just db-push        # push schema to db (development, no migration files)
just db-generate    # generate migration files from schema changes
just db-migrate     # run pending migrations
just db-studio      # open Drizzle Studio
```

First-time setup: `just setup` (builds the dev image, installs deps, starts services).

After adding a package to any `package.json`: `just install`.

### Ports (inside containers mapped to host)

| Service    | Host port |
|------------|-----------|
| API        | 7000      |
| App        | 7001      |
| Postgres   | 7002      |
| Grafana    | 7010      |
| OTLP gRPC  | 7011      |
| OTLP HTTP  | 7012      |

## Architecture

### Monorepo

`pnpm-workspace.yaml` declares two packages: `api` (`@monowork/api`) and `app` (`@monowork/app`). Shared dev dependencies (TypeScript, oxlint, oxfmt, tsx, tsc-alias, all OpenTelemetry packages) are pinned once in the workspace `catalog:` and referenced with `catalog:` in individual `package.json` files.

### API (`api/`)

- **Entry**: `src/index.ts` calls `createApp()` then listens. OTel SDK is loaded first via `--import ./src/otel.ts` in the dev script.
- **App factory**: `src/app.ts` — `createApp()` sets up Fastify with Zod type provider (`@fastify/type-provider-zod`), registers OTel hooks (injects `trace_id`/`span_id` into responses, records errors on spans), and mounts route plugins.
- **Routes**: each route file exports a `FastifyPluginAsyncZod`. Define the Zod schema inline in the route — the type provider derives request/response types automatically.
- **Env**: `src/env.ts` — single Zod schema parsed at startup. Import `env` from here; never read `process.env` directly elsewhere.
- **Database**: `src/db/index.ts` exports a `db` singleton (Drizzle + `node-postgres`). Schema lives in `src/db/schema.ts`. SSL is enabled automatically in production.
- **Observability**: `src/otel.ts` initialises the OTel Node SDK (traces + metrics via OTLP HTTP). Logs go via `pino-loki` directly to Loki — OTel Logs JS is still experimental and not used. The `otel-lgtm` service bundles Grafana, Loki, Tempo, and Prometheus.
- **Path alias**: `#/*` maps to `src/*` (configured in `tsconfig.json` `paths` and `package.json` `imports`). Use `#/foo` for internal imports, never relative paths across directories.
- **Build**: `tsconfig.build.json` extends the main tsconfig but excludes tests, seed, and drizzle config. `tsc-alias` rewrites path aliases in the compiled output.

### App (`app/`)

Vue 3 + Vite + Pinia + Vue Router. Standard scaffold; `@testing-library/vue` + `vitest` + `happy-dom` are available for unit tests.

### Linting & Formatting

- **oxlint** — TypeScript plugin enabled; `correctness` rules are errors, `suspicious` are warnings. `no-console` is a warning; `typescript/no-explicit-any` is an error.
- **oxfmt** — single quotes, no semicolons, 100-char print width, trailing commas, 2-space indent.
- Both tools run per-package (`pnpm --filter @monowork/api lint`, etc.) and are wrapped by `just lint` / `just format`.

### TypeScript

TypeScript 6 in strict mode. Notable extra flags beyond `@tsconfig/node24`: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noUnusedLocals`, `noUnusedParameters`. The `types` array is explicit (`["node", "drizzle-orm/pg-core"]`) because TS6 defaults to `[]`.
