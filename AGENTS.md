# AGENTS.md

Agent reference for this repository. Read this before making any changes.

## Overview

pnpm monorepo — Fastify 5 API (`api/`) + Vue 3 frontend (`app/`). All development runs inside Docker containers via the `just` task runner. No local Node.js or pnpm installation is required.

## Quick start

```sh
just setup   # first time: build image, install deps, start services
just start   # subsequent starts
```

Services must be running for `just test`, `just test-unit`, `just test-acceptance`, and `just typecheck`. All other commands (`just lint`, `just format`, etc.) spin up a temporary container and work without running services.

## Commands

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
just test           # run all api tests
just test-unit      # run unit tests only (service layer)
just test-acceptance # run acceptance tests only (HTTP layer)

just db-push        # push schema to db (dev only, no migration files)
just db-generate    # generate migration files from schema changes
just db-migrate     # run pending migrations
just db-studio      # open Drizzle Studio

just install        # re-run pnpm install after changing package.json
just hooks          # configure git hooks (run once per clone, included in just setup)
```

## Ports

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

`pnpm-workspace.yaml` declares two packages: `api` (`@monowork/api`) and `app` (`@monowork/app`). Shared dev dependencies are pinned once in the workspace `catalog:` and referenced with `catalog:` in individual `package.json` files.

### API (`api/src/`)

Organised as **vertical slices + ports & adapters**. Each feature owns all its layers:

```
src/
├── index.ts          # entry: createApp() + listen + graceful shutdown
├── app.ts            # Fastify factory: Zod provider, OTel hooks, register routers
├── env.ts            # validated env vars — import env from here, never process.env
├── otel.ts           # OTel SDK init (loaded via --import before the app)
├── db/
│   └── index.ts      # db singleton (Drizzle + node-postgres) + DB type
└── <feature>/
    ├── <feature>.ts          # domain types — pure TS, no Drizzle imports
    ├── <feature>.db.ts       # Drizzle table definition — no domain logic
    ├── <feature>.repo.ts     # DB adapter (outbound port) — maps DB record → domain type
    ├── <feature>.service.ts  # business logic (inbound port)
    ├── <feature>.routes.ts   # HTTP adapter — thin, delegates to service
    ├── <feature>.service.test.ts # unit tests — mocks repository, tests service logic
    └── <feature>.routes.test.ts  # acceptance tests — mocks repository, tests HTTP contract
```

File naming rules:
- **Domain model** — `<feature>.ts` — explicit pure-TS types, no ORM imports. This is the only file the service and routes layers import from.
- **DB model** — `<feature>.db.ts` — Drizzle table definition only. Imported by the repository and `drizzle.config.ts`; never by service or routes.
- **Repository** — `<feature>.repo.ts` — the only layer that knows both the DB record shape and the domain type. Owns the mapping between them.
- **Service** — `<feature>.service.ts`
- **Routes** — `<feature>.routes.ts`
- **Tests** — mirror the file under test, e.g. `<feature>.service.test.ts`, `<feature>.routes.test.ts`

Layer rules:
- **Router** knows about HTTP and the service port only. Zod schemas live here.
- **Service** knows about domain types and the repository port only. No HTTP, no Drizzle.
- **Repository** knows about Drizzle and the db singleton only. No HTTP, no business logic.

Key conventions:
- Internal imports use the `#/` alias (`#/users/users-service`), never relative cross-directory paths.
- `import type` for type-only imports.
- Register plugins with `void app.register(...)`.
- OTel SDK is loaded via `--import ./src/otel.ts` — never call `sdk.start()` inside `createApp()`.

### App (`app/`)

Vue 3 + Vite + Pinia + Vue Router. Uses `~/` as the `src/` path alias.

## Work tracking

> **STOP — no code, no file edits, no shell commands until a plan exists.**
> Every task requires a plan file at `docs/plans/<task-slug>.md` and a row in `docs/planing.md` before any implementation begins. This is a hard rule with no exceptions.

All work MUST be tracked in [`docs/planing.md`](docs/planing.md). Before starting any task:

1. **Before work begins** — create a plan file at `docs/plans/<task-slug>.md` describing the goal, scope, test cases or changes, and dependencies. Then add a row to the appropriate priority table in `docs/planing.md` with a description, a link to the plan, and today's date in the **Added** column. If the task already exists with a plan, skip this step.
2. **After work is complete** — fill in today's date in the **Completed** column for that row, then move the row from its priority section into the **Done** table at the top.

Never start implementation without recording the task and its plan first. Never leave a finished task without marking it complete.

## Code conventions

See [`docs/conventions.md`](docs/conventions.md) for the full reference covering formatting, naming, TypeScript strictness, testing patterns, and dependency management.

## Agent harness

Claude Code configuration lives in [`.claude/`](.claude/) — see [`.claude/README.md`](.claude/README.md). It defines task-specialised sub-agents (`slice-builder`, `test-author`, `code-reviewer`, `vue-frontend`, `documenter`), shared `settings.json` (permissions, env), and hooks: a PreToolUse `plan-guard` enforcing the plan-first rule on source edits, and a Stop hook that runs `just format`.

### Orchestration protocol

When the user asks for work, the primary (orchestrator) agent does **not** edit source directly — it plans, delegates to the sub-agents, and integrates their output. The standing procedure:

1. **Plan & track first** — create `docs/plans/<slug>.md` and a `docs/planing.md` row (the plan-first hard rule above).
2. **Branch first** — create one task branch named `<type>/<slug>` using a [Conventional Commits](https://www.conventionalcommits.org/) type (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`), e.g. `feat/invoices-slice`. All of the task's work lands on this branch.
3. **Decompose & delegate** — split the task into units and route each to the right agent (`slice-builder` for API slices, `test-author` for tests, `vue-frontend` for `app/`, `documenter` for docs; `code-reviewer` last). Keep a live status checklist of every delegated unit.
4. **One worktree per agent** — spawn each agent with the Agent tool's `isolation: "worktree"` so it works in its own git worktree. Independent working copies prevent collisions when agents run in parallel.
5. **Commit each finished worktree to the branch** — when an agent completes, review its output and integrate its worktree changes onto the task branch with a Conventional Commits message (`<type>(scope): subject`), in a deterministic order, resolving any overlap. Then clean up the worktree.
6. **Review & finish** — run `code-reviewer` over the assembled diff, run lint/typecheck/tests, fill in the `Completed` date and move the planing row to **Done**. Push or open a PR only when the user asks.

See [`.claude/README.md`](.claude/README.md) for the worktree mechanics and the full agent-routing table.
