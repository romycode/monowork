# AGENTS.md

Agent reference for this repository. Read this before making any changes.

## Project overview

This repository is a monorepo structured around **vertical slices with domain-centric design**. A Fastify 5 API (`api/`) is paired with a Vue 3 frontend (`app/`) and shared libraries (`packages/`). All development runs inside Docker containers via the `just` task runner — no local Node.js or pnpm installation is required.

## Stack

- Node.js 26
- Fastify 5
- Drizzle ORM
- PostgreSQL
- Vue 3
- Pinia
- TypeScript 6+

## Quick start

```sh
just setup   # first time: build image, install deps, start services
just start   # subsequent starts
```

Services must be running for `just test`, `just test-unit`, `just test-integration`, `just test-acceptance`, and `just typecheck`. All other commands (`just lint`, `just format`, etc.) spin up a temporary container and work without running services.

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
just test-unit      # unit tests (domain + application, no I/O)
just test-integration # integration tests (external services / real DB)
just test-acceptance # acceptance tests (end-to-end API)

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
| Tempo      | 7013      |
| Pyroscope  | 7014      |
| Prometheus | 7015      |

## Repository structure

```
api/        Backend (Fastify, vertical slices)
app/        Frontend (Vue 3)
packages/   Shared libraries (types, utilities, schemas)
```

`pnpm-workspace.yaml` declares the packages: `api` (`@monowork/api`), `app` (`@monowork/app`), and the libraries under `packages/` (e.g. `@monowork/tracing`). Shared dev dependencies are pinned once in the workspace `catalog:` and referenced with `catalog:` in individual `package.json` files.

Each feature in `api/src/` is a self-contained **vertical slice** in a **ports & adapters** style, one file per layer. This flat layout is the **default and standard** for the repo — the existing slices (`users`, `organizations`, `health`) all use it, and new slices should too:

```
api/src/<feature>/
  <feature>.ts          # domain: entity types + repository interface — pure TS, no ORM imports
  <feature>.db.ts       # Drizzle table definition
  <feature>.repo.ts     # repository implementation (DB adapter) — maps DB record → domain type
  <feature>.service.ts  # application: business logic / use cases (factory function)
  <feature>.routes.ts   # infrastructure: HTTP adapter (Fastify routes) — receives the service via opts
  <feature>.plugin.ts   # infrastructure: slice composition root — builds repo + service, registers routes
  <feature>.*.test.ts   # unit + acceptance tests
```

The layer names used throughout this document (domain / application / infrastructure) are **conceptual** — they map onto these files; they are **not** required to be folders. Keep slices flat by default.

> **Opt-in: folder-per-layer for genuinely complex slices.** Only when a slice grows rich domain logic — multiple aggregates, real invariants, value objects, domain services, multi-entity workflows — may it graduate to a deeper layer-per-folder layout:
>
> ```
> api/src/<feature>/
>   domain/          # entities, value objects, domain services, repository interfaces
>   application/     # use cases (commands / queries), workflows
>   infrastructure/  # Drizzle repositories, Fastify plugin (composition root), DB access
> ```
>
> This is a deliberate, **per-slice** decision — not a repo-wide target, and not for CRUD-shaped features. Most slices should stay flat; don't introduce these folders speculatively.

> **Two refinements we're adopting (while staying flat).** 1) The **repository interface is a domain abstraction**: define it in `<feature>.ts` and implement it in `<feature>.repo.ts`, so the service depends on a domain-owned contract. 2) Each slice is its **own composition root**: a `<feature>.plugin.ts` builds its repository + service and registers the router (see *Fastify slice architecture*). The **`users` slice is the reference example** of both — `users.ts` owns the `UsersRepository` interface and `users.plugin.ts` is the composition root that `app.ts` just registers. `organizations` and `health` still use the older pattern (repository type in `<feature>.repo.ts`, wiring centralised in `api/src/app.ts`); migrate a slice toward the `users` shape when you create it or substantially change it — don't refactor everything at once.

## Core architectural principles

- Feature-first (vertical slices), not layer-first architecture.
- Domain is the core of business logic.
- Infrastructure is replaceable.
- Application orchestrates use cases.
- Strict dependency direction must be enforced.
- No global service container or hidden DI.

## Dependency rules (STRICT)

```
Infrastructure → Application → Domain
```

Forbidden:

- Domain importing Application or Infrastructure.
- Application importing Infrastructure directly.
- Cross-slice direct imports.
- Hidden service locators or global singletons.

Internal imports use the `#/` alias (`#/users/...`), never relative cross-directory paths. Use `import type` for type-only imports.

## Domain layer

The domain layer contains business logic and domain abstractions.

Contains:

- Entities
- Value objects
- Domain services
- Repository interfaces (IMPORTANT)

Rules:

- Must be pure TypeScript.
- Must not depend on Fastify, Drizzle, Vue, or any framework.
- Must not contain I/O logic.
- Must not contain infrastructure implementations.

Repository rule — repositories are domain-level abstractions of aggregates. They must:

- Represent aggregate roots only.
- Expose domain-relevant operations only.
- Avoid query-specific or infrastructure-specific methods.
- Remain framework-agnostic.

In the flat layout the domain layer is `<feature>.ts` — the entity types and the repository **interface** live there; `<feature>.repo.ts` implements that interface. (Existing slices still declare the repository type in `<feature>.repo.ts`; move it into `<feature>.ts` when you next touch the slice.)

## Application layer

The application layer defines use cases and system behaviour.

Contains:

- Use cases (commands / queries)
- Transaction orchestration
- Business workflows

Rules:

- Depends only on the domain layer.
- Uses domain repository interfaces.
- Must not contain infrastructure logic.
- Must not depend on Fastify or Drizzle.

The application layer answers: *"How does the system perform a business action?"*

## Infrastructure layer

The infrastructure layer implements all external systems.

Contains:

- Drizzle ORM repositories
- Fastify plugin setup
- Database access
- External API integrations

Rules:

- Implements domain repository interfaces.
- Must not contain business rules.
- Must not leak infrastructure types into the domain or application layers.
- Can depend on all other layers.

## Fastify slice architecture

Each vertical slice is a **Fastify plugin** that acts as its own **composition root**. In the flat layout this is a dedicated `<feature>.plugin.ts` that builds the repo + service and registers the slice's `<feature>.routes.ts` router; keeping the wiring out of `routes.ts` leaves the router free of infrastructure imports so its acceptance test never pulls in `db` (see the `users` slice). An opt-in folder slice may use `infrastructure/plugin.ts` instead.

Responsibilities of a slice plugin:

- Build infrastructure adapters.
- Instantiate application use cases.
- Wire dependencies manually (no container).
- Register HTTP routes.

Rules:

- No global DI container is allowed — each plugin is a composition root.
- Dependencies must be passed via Fastify plugin options (`opts`).
- Application and domain layers MUST NOT depend on Fastify.
- Register plugins with `void app.register(...)`.

> Migration note: today slices export a router plugin (e.g. `usersRouter`) that takes its service via `opts`, while `createApp()` in `api/src/app.ts` acts as the single composition root that wires repos → services → routers. New slices should self-compose in their own plugin; `app.ts` should only register the slice plugin.

## Frontend (Vue 3 + Pinia)

Vue 3 + Vite + Pinia + Vue Router. Uses `~/` as the `src/` path alias.

Rules:

- Vue 3 Composition API only.
- Use `<script setup>`.
- **Composables (`use*`) are the design pattern for reusable logic.** Extract repeated component logic, side-effect orchestration, watchers, and cross-component behaviour into composables under `app/src/composables/` (one `use<Thing>.ts` per concern). Composables encapsulate *logic*, not application state.
- Pinia for shared/stateful state only — keep anything stateful in a store, not a composable.
- Avoid duplicating business logic in components.
- UI logic stays in the frontend only.
- Domain logic must never be reimplemented in the frontend.

## Shared packages (`packages/`)

Purpose:

- Shared types
- Validation schemas
- Utility functions

Rules:

- Must be framework-agnostic.
- Must not contain application or infrastructure logic.
- Must not depend on Fastify, Vue, or Drizzle.

## TypeScript rules (v6+)

- Strict mode is mandatory.
- `any` is forbidden.
- Prefer `unknown` for external input.
- Avoid unsafe type assertions (`as`).
- Prefer explicit return types for public APIs.
- Maintain type safety across the backend/frontend boundary.

## Testing strategy

Three buckets, named by file suffix:

**Unit — `*.unit.ts` (`just test-unit`)** — domain and application logic in isolation, no I/O.
- **Domain** (`<feature>.ts`) — pure business logic; no mocks unless necessary.
- **Application** (`<feature>.service.ts`) — use cases in isolation; mock the domain repository interface. No Fastify, DB, or infrastructure.

**Integration — `*.int.ts` (`just test-integration`)** — adapters against real external services: Drizzle repositories (`<feature>.repo.ts`) against a real Postgres, external API clients. Requires running services.

**Acceptance — `*.spec.ts` (`just test-acceptance`)** — end-to-end API tests: drive the real app (`createApp()`) over HTTP against a real database, no mocks.

> Migration note: `users.routes.spec.ts` and `organizations.routes.spec.ts` still mock the repository (HTTP-contract only, no DB) and are flagged to become true end-to-end; `health.routes.spec.ts` (boots `createApp()`) is the closest existing example of the target.

Mocking rule (unit):

- Use simple object mocks (`node:test` `mock.fn`); no external mocking frameworks.
- Mocks must implement domain-defined interfaces only.

Forbidden in unit tests: database access, HTTP requests, Fastify plugins, infrastructure implementations.

## Workflow

Lightweight, branch-first. No formal plan files or `docs/planing.md` entry are required to start work — a short checklist is enough.

1. **Understand first** — read the relevant slice and existing patterns before changing anything (see Code change rules).
2. **Branch** — create one task branch named `<type>/<slug>` using a [Conventional Commits](https://www.conventionalcommits.org/) type (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`), e.g. `feat/invoices-slice`. All of the task's work lands on this branch.
3. **Track lightly** — keep a short checklist/TODO of the units of work for the task (in your working notes or the PR description). No plan document is mandated.
4. **Implement → test → review** — make the smallest correct change within the slice, add/adjust tests, then run `just lint`, `just typecheck`, and `just test` (or the relevant `test-unit` / `test-acceptance`) before committing. Self-review the diff, or use the `code-reviewer` sub-agent.
5. **Commit** — use Conventional Commits messages (`<type>(scope): subject`). Push or open a PR only when asked.

Sub-agents (below) are **optional helpers**, not a required orchestration step. Reach for them when they fit; otherwise implement directly.

## Code change rules

When modifying code:

1. Identify the correct vertical slice first.
2. Stay within slice boundaries.
3. Follow existing patterns in that slice.
4. Avoid cross-slice refactors unless explicitly required.
5. Make the smallest possible change.
6. Do not introduce new abstractions without justification.

## Agent behaviour rules

- Read existing code before making changes.
- Prefer consistency over personal design preferences.
- Do not restructure unrelated code.
- Ask for clarification when behaviour is ambiguous.
- Preserve architectural boundaries at all times.

## Agent harness

Claude Code configuration lives in [`.claude/`](.claude/) — see [`.claude/README.md`](.claude/README.md). It defines optional task-specialised sub-agents (`planner`, `slice-builder`, `test-author`, `code-reviewer`, `vue-frontend`, `documenter`), shared `settings.json` (permissions, env), and a single hook:

- **Stop `format-on-stop`** — runs `just format`.

## Code conventions

See [`docs/conventions.md`](docs/conventions.md) for the full reference covering formatting, naming, TypeScript strictness, testing patterns, and dependency management.

## Golden rule

When in doubt: keep changes local to the slice and respect domain boundaries.
