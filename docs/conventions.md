# Conventions

This document is the canonical reference for code style, project structure, and workflow conventions in this monorepo. It applies to all contributors.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Code Style](#code-style)
3. [TypeScript](#typescript)
4. [API Conventions](#api-conventions)
5. [App Conventions](#app-conventions)
6. [Testing](#testing)
7. [Bruno (API Client)](#bruno-api-client)
8. [Docker & Workflow](#docker--workflow)
9. [Dependencies](#dependencies)

---

## Project Structure

This is a pnpm monorepo with workspace packages:

```
monowork/
├── api/              # @monowork/api — Fastify 5 backend
├── app/              # @monowork/app — Vue 3 frontend
├── packages/         # Shared workspace packages
│   └── tracing/      # @monowork/tracing — OTel tracing utilities
├── bruno/            # Bruno API client collection
├── docs/             # Project documentation
├── compose.yml       # Docker Compose for all services
├── justfile          # Task runner (wraps Docker Compose)
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json      # Workspace root (scripts, engines, shared devDeps)
```

### `api/` layout

Organised as **vertical slices + ports & adapters**, one file per layer. This flat layout is the **default and standard**; each feature owns all its layers under a single directory:

```
api/
├── src/
│   ├── index.ts              # Entry: creates app, binds port, graceful shutdown
│   ├── app.ts                # createApp() factory: Fastify setup, plugins, routers
│   ├── env.ts                # Validated environment variables (single source of truth)
│   ├── otel.ts               # OpenTelemetry SDK initialisation
│   ├── db/
│   │   ├── index.ts          # Drizzle db singleton and DB type
│   │   └── seed.ts           # Dev seed script
│   └── <feature>/
│       ├── <feature>.ts             # Domain — pure TS entity types + repository interface, no Drizzle
│       ├── <feature>.db.ts          # Drizzle table definition
│       ├── <feature>.repo.ts        # Repository implementation (DB adapter)
│       ├── <feature>.service.ts     # Business logic (inbound port)
│       ├── <feature>.routes.ts      # HTTP adapter — thin, delegates to service
│       ├── <feature>.plugin.ts      # Slice composition root — wires repo + service, registers routes
│       ├── <feature>.service.unit.ts # Unit (application) — mocks repository, tests service logic
│       ├── <feature>.repo.int.ts     # Integration — repository against a real Postgres
│       ├── <feature>.routes.spec.ts  # Acceptance — end-to-end API (target); see migration note
│       └── <feature>.test-helpers.ts # Builders + mockRepo (excluded from production build)
├── drizzle.config.ts
├── tsconfig.json
├── tsconfig.build.json       # Excludes tests/seed from production build
└── package.json
```

A slice may **opt in** to a deeper `domain/ application/ infrastructure/` folder layout, but only when its domain logic genuinely warrants it (multiple aggregates, real invariants, multi-entity workflows) — never for CRUD-shaped features. Keep slices flat by default.

### `app/` layout

```
app/
├── src/
│   ├── main.ts               # Vue app bootstrap
│   ├── App.vue
│   ├── router/index.ts
│   ├── composables/          # reusable logic (use<Thing>.ts)
│   └── stores/               # Pinia stores
├── vite.config.ts
├── tsconfig.json             # Project references
├── tsconfig.app.json
└── package.json
```

---

## Code Style

### Formatter: oxfmt

All source code is formatted with [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html). Configuration lives in `.oxfmtrc.json` at the root:

| Setting | Value |
|---|---|
| Print width | 100 characters |
| Indent | 2 spaces |
| Semicolons | None |
| Quotes | Single |
| Trailing commas | All |
| Bracket spacing | Yes |
| Arrow function parens | Always |

Run `just format` to format, `just format-check` to verify without writing.

### Linter: oxlint

All source code is linted with [oxlint](https://oxc.rs/docs/guide/usage/linter.html) (TypeScript plugin enabled). Configuration lives in `.oxlintrc.json` at the root:

| Category | Severity |
|---|---|
| `correctness` | Error |
| `suspicious` | Warning |
| `no-console` | Warning |
| `typescript/no-explicit-any` | Error |

Run `just lint` to check, `just lint-fix` to autofix.

### Naming

| Subject | Convention | Example |
|---|---|---|
| Files | kebab-case with a dot-separated layer suffix | `users.repo.ts` |
| Test files | layer descriptor + bucket suffix `.unit.ts` / `.int.ts` / `.spec.ts` | `users.service.unit.ts`, `users.repo.int.ts`, `users.routes.spec.ts` |
| Functions | camelCase | `createApp`, `findById` |
| Variables & constants | camelCase | `db`, `env`, `mockUser` |
| Types & exported schemas | PascalCase for types; camelCase for Zod schemas | `UsersRepository`, `userSchema` |
| SQL table names | snake_case plural | `'users'` |
| SQL column names | snake_case | `'created_at'` |
| TypeScript properties | camelCase | `createdAt` |
| Vue components | PascalCase | `UserCard.vue` |

### Imports

- Use `import type` for type-only imports — this is enforced by the TypeScript compiler (`verbatimModuleSyntax` is on).
- In `api/`, always use the `#/` path alias for internal imports. Never use relative paths that cross directories.
- In `app/`, use the `~/` path alias for imports from `src/`.
- Third-party imports go after internal imports (no automatic enforcement, but keep it consistent).

### No barrel files

Do not use `index.ts` barrel files that re-export from other modules. Every module is imported directly by its file path.

```ts
// correct — import from the specific module
import { traced } from '@monowork/tracing/traced'
import { withSpan } from '@monowork/tracing/helpers'

// wrong — barrel re-export
import { traced, withSpan } from '@monowork/tracing'
```

For workspace packages, use subpath exports in `package.json` to expose each module individually:

```json
{
  "exports": {
    "./traced": "./src/traced.ts",
    "./helpers": "./src/helpers.ts"
  }
}
```

```ts
// api/ — correct
import type { UsersService } from '#/users/users.service'
import { createApp } from '#/app'
import { env } from '#/env'
import Fastify from 'fastify'

// api/ — wrong
import { createApp } from '../../app'        // relative cross-directory
import { createApp } from '#/app.ts'         // never include .ts extension
```

---

## TypeScript

TypeScript 6 in strict mode. Both packages extend `tsconfig.base.json` (which layers `@tsconfig/node24` + `@tsconfig/node-ts`). The API applies additional strictness flags:

| Flag | Effect |
|---|---|
| `noUncheckedIndexedAccess` | Array and object index access returns `T \| undefined` |
| `exactOptionalPropertyTypes` | Optional props must be explicitly `\| undefined` — cannot be set to `undefined` implicitly |
| `noPropertyAccessFromIndexSignature` | Indexed signatures must use bracket notation |
| `noUnusedLocals` / `noUnusedParameters` | Dead code is a compile error |

**Use `type` over `interface`** for all object type definitions. Interfaces are for declaration merging (rare); `type` is the default.

```ts
// correct
type UsersRepository = {
  findAll: () => Promise<User[]>
  findById: (id: string) => Promise<User | undefined>
}

// avoid
interface UsersRepository {
  findAll(): Promise<User[]>
}
```

**ESM throughout.** Both packages use `"type": "module"`. Never use CommonJS (`require`, `module.exports`).

The `types` array in each `tsconfig.json` is explicit — TypeScript 6 defaults to `[]`, so any required ambient types must be listed.

---

## API Conventions

### Vertical slices + ports & adapters

Each feature is a self-contained directory under `src/<feature>/`, flat (one file per layer) by default. A slice may opt in to a `domain/ application/ infrastructure/` folder layout only when its domain logic genuinely warrants it — not for CRUD features. The layers within each slice have strict rules about what they may depend on:

| Layer | File | May depend on |
|---|---|---|
| Slice composition root | `<feature>.plugin.ts` | repo + service factories, `db`, Fastify |
| HTTP adapter | `<feature>.routes.ts` | Service port, Zod, Fastify |
| Service (inbound port) | `<feature>.service.ts` | Repository port, domain types |
| Repository impl (outbound port) | `<feature>.repo.ts` | Drizzle, `db` singleton, domain model |
| DB model | `<feature>.db.ts` | Drizzle table helpers |
| Domain (entity types + repository interface) | `<feature>.ts` | Pure TS — no Drizzle |

No layer may skip levels (e.g. a router must not call the repository directly).

### Domain model

`<feature>.ts` is the slice's domain layer: hand-written entity types and the **repository interface** (the port), in pure TypeScript with no Drizzle imports. The service and the repository implementation both depend on this file, and tests mock the interface from here without pulling in infrastructure.

```ts
// items.ts
export type Item = {
  id: string
  name: string
}

export type ItemsRepository = {
  findAll: () => Promise<Item[]>
  findById: (id: string) => Promise<Item | undefined>
}
```

> Existing slices still declare the repository `type` in `<feature>.repo.ts` rather than `<feature>.ts`. That's the current baseline; move the interface into the domain file when you create or substantially change a slice.

### HTTP method semantics

| Method | Semantics | Idempotent |
|---|---|---|
| `GET` | Read resource(s) | Yes |
| `PUT` | Create **or** fully replace a resource. Client provides the ID. | Yes |
| `PATCH` | Partial update (at least one field required) | No |
| `DELETE` | Remove a resource | Yes |

**PUT is used for creates.** The client generates a UUID and sends `PUT /resource/:id` with a full body. The server creates the resource if the ID is new, or returns the existing resource if it already exists. Calling the same request multiple times always produces the same outcome — idempotency by HTTP method.

**PATCH is used for partial updates.** At least one field must be provided; absent fields are left unchanged.

POST is not used for resource creation in this API.

### Router

Exports one named constant typed as `FastifyPluginAsyncZod`. Zod schemas live here (inline at module top). The router's only job is HTTP: parse the request, call the service, format the response.

```ts
import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod'
import type { ItemsService } from '#/items/items.service'
import { z } from 'zod'

const itemSchema = z.object({ id: z.uuid(), name: z.string() })

type Options = { service: ItemsService }

export const itemsRouter: FastifyPluginAsyncZod<Options> = async (fastify, { service }) => {
  fastify.get('/items', { schema: { response: { 200: z.array(itemSchema) } } }, async () =>
    service.list(),
  )
}
```

- The type provider (`@fastify/type-provider-zod`) derives all handler types automatically. Do not annotate `req` or `reply` manually.
- Register with `void app.register(...)`. The `void` prefix prevents floating-promise lint warnings.
- Pass the service via plugin options: `void app.register(itemsRouter, { service: itemsService(repo) })`

Each slice is its own **composition root** — no global DI container. The **`users` slice** is the reference: `users.plugin.ts` builds the repository + service (each wrapped with `traced`) and registers the router, and `app.ts` just calls `void app.register(usersSlice)`. Keep this wiring in `<feature>.plugin.ts`, **not** in `routes.ts`, so the router stays free of infrastructure imports and its tests never pull in `db`. `organizations` still wires centrally in `createApp()` (the older pattern) — migrate it when you next touch it.

### Service

Contains business logic. Receives domain inputs, returns domain objects, delegates persistence to the repository port. Use a factory function — not a class. Depend on the repository **interface** from the domain file (`#/items/items`), never on the repository implementation.

```ts
import type { Item, ItemsRepository } from '#/items/items'

export type ItemsService = {
  list: () => Promise<Item[]>
  // ...
}

export function itemsService(repo: ItemsRepository): ItemsService {
  return {
    list: () => repo.findAll(),
    // ...
  }
}
```

### Repository

Repository **implementation** (DB adapter). Use a factory function — not a class. The repository interface (the port) and the domain entity type live in `<feature>.ts` (see *Domain model*); this file imports them, maps the Drizzle record to the domain type, and is the only layer that knows both shapes.

```ts
import type { Item, ItemsRepository } from '#/items/items'
import { items } from '#/items/items.db'
import type { DB } from '#/db/index'

type ItemRecord = typeof items.$inferSelect

function toItem(record: ItemRecord): Item {
  return { id: record.id, name: record.name }
}

export function createItemsRepository(db: DB): ItemsRepository {
  return {
    findAll: async () => (await db.select().from(items)).map(toItem),
    // ...
  }
}
```

### Schema

Drizzle `pgTable` definition. Use camelCase for TypeScript properties and snake_case for SQL column names. The Drizzle config uses a glob (`./src/**/*.db.ts`) so new schemas are picked up automatically.

```ts
export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

### Environment variables

All env vars are validated once at startup in `src/env.ts` using a Zod schema. The exported `env` constant is the only way to read configuration across the app.

```ts
// correct
import { env } from '#/env'
const port = env.PORT

// wrong — never read process.env directly outside env.ts
const port = Number(process.env.PORT)
```

### Observability

- The OTel SDK is loaded before the app via `--import ./src/otel.ts` in the dev/start script. Never call `sdk.start()` inside `createApp()`.
- Structured logs go to stdout (pino) and to Loki (pino-loki transport). Do not use `console.log` for application logs.
- Request traces, span attributes, and error recording are wired up in `createApp()` via Fastify hooks. Route handlers do not need to touch the OTel API directly.

---

## App Conventions

The frontend uses Vue 3 + Pinia + Vue Router. The stack is configured but mostly scaffolding at this point.

- **Path alias**: `~/` maps to `src/`. Use it for all internal imports.
- **Stores**: one Pinia store per domain concept, in `src/stores/`. Export the store via a `use<Name>Store` composable using `defineStore`. Pinia holds shared/stateful state.
- **Composables**: the design pattern for reusable logic. Extract repeated component logic, side-effect orchestration, watchers, and cross-component behaviour into `use<Thing>.ts` files under `src/composables/` (one concern per file, returning refs/computed/functions). Composables encapsulate logic, not application state — keep stateful shared state in a Pinia store.
- **Router**: routes are defined in `src/router/index.ts`. Use named routes.
- **Components**: PascalCase filenames. Single-file components (`.vue`) only.
- **Styles**: scoped styles (`<style scoped>`) by default.

---

## Testing

### API (`api/`)

The API uses Node's built-in test runner with no external test framework.

| Concern | Tool |
|---|---|
| Test runner | `node:test` (`describe`, `it`) |
| Assertions | `node:assert/strict` |
| HTTP testing | `app.inject()` (no real server) |
| Mocking | `mock.fn()` from `node:test` — no external mocking library |

Three test buckets, named by file suffix:

| Bucket | Suffix | What it exercises | External I/O |
|---|---|---|---|
| **Unit** | `*.unit.ts` | Domain (`<feature>.ts`) + application (`<feature>.service.ts`) logic in isolation; mock the repository interface | None |
| **Integration** | `*.int.ts` | Adapters against real external services — Drizzle repositories (`<feature>.repo.ts`) against Postgres, external API clients | Real DB / services |
| **Acceptance** | `*.spec.ts` | End-to-end API: the real app (`createApp()`) over HTTP against a real database. **MUST use real infrastructure — no mocks** | Real DB / HTTP |

Run with `just test-unit`, `just test-integration`, `just test-acceptance`, or `just test` (all). Integration and acceptance tests need running services; unit tests never touch I/O.

> **Advisory — migration required.** `users.routes.spec.ts` and `organizations.routes.spec.ts` are **currently non-compliant**: they still mock the repository (an HTTP-contract test, not true end-to-end) and run without a DB. They **must be migrated** to real end-to-end against Postgres. This is known debt, deliberately left as-is for now. `health.routes.spec.ts`, which boots `createApp()`, is the compliant reference.

#### Domain object builders

Each feature exposes a `<feature>.test-helpers.ts` file (excluded from the production build) with builder functions for domain objects. Builders provide valid defaults and accept partial overrides, keeping tests focused on what varies.

```ts
// users.test-helpers.ts
export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'alice@example.com',
    name: 'Alice',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}
```

Use the builder anywhere a domain object is needed:

```ts
const user = buildUser()
const updated = buildUser({ name: 'Alicia' })
```

#### Mock factory pattern

Each feature's test helpers also export a `mockRepo` factory. Every port method is wrapped with `mock.fn()` from `node:test` — unset methods throw `'not implemented'`, and all methods track calls via `.mock` for future assertions.

```ts
export function mockRepo(overrides: Partial<UsersRepository> = {}): UsersRepository {
  const notImpl = (): never => { throw new Error('not implemented') }
  return {
    findAll: mock.fn(overrides.findAll ?? (notImpl as UsersRepository['findAll'])),
    findById: mock.fn(overrides.findById ?? (notImpl as UsersRepository['findById'])),
    // …
  }
}
```

#### Unit tests (`*.unit.ts`)

Domain and application logic, no I/O. Application unit tests call service methods directly with a mocked repository; domain unit tests exercise pure logic in `<feature>.ts` directly. Focus on what the code *does*, not HTTP or the DB.

```ts
describe('UsersService.get', () => {
  it('returns undefined when not found', async () => {
    const service = userService(mockRepo({ findById: async () => undefined }))
    assert.equal(await service.get('non-existent'), undefined)
  })
})
```

#### Acceptance tests (`*.spec.ts`)

Acceptance tests **MUST use real infrastructure**: boot the real app with `createApp()` and drive it over HTTP against a **real database**, asserting the full request → DB → response path with **no mocks** (`health.routes.spec.ts` boots `createApp()` today). Mocking the repository in an acceptance spec is not allowed.

> **Advisory — do not copy.** `users.routes.spec.ts` / `organizations.routes.spec.ts` still use a **non-compliant legacy pattern** — a minimal Fastify app with the real service wired to a **mocked** repository (no DB). The snippet below shows that pattern only so it is recognisable; it is being **replaced**, not followed. Both specs **must be migrated** to true end-to-end; don't write new acceptance specs this way.

```ts
function buildApp(repoOverrides: Partial<UsersRepository> = {}) {
  const service = userService(mockRepo(repoOverrides))
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  void app.register(usersRouter, { service })
  return app
}
```

Focus on HTTP contract: status codes, response shapes, validation rejections.

```ts
it('returns 201 when user is created', async (t) => {
  const user = buildUser()
  const app = buildApp({ upsert: async () => ({ user, created: true }) })
  t.after(() => app.close())
  const res = await app.inject({ method: 'PUT', url: '/users/' + user.id, payload })
  assert.equal(res.statusCode, 201)
})
```

**Always close the app** in `t.after()` to prevent resource leaks.

Run tests with `just test` (all), `just test-unit` (no services needed), `just test-integration`, or `just test-acceptance`. Integration and true end-to-end acceptance tests require services to be running.

### App (`app/`)

The frontend uses vitest with happy-dom and `@testing-library/vue`.

- Co-locate tests next to the component or store being tested.
- Use `@testing-library/vue` render utilities rather than manual Vue mount calls.
- Run with `pnpm --filter @monowork/app test` (not wired into `just` yet).

---

## Bruno (API Client)

[Bruno](https://www.usebruno.com/) is the API client for manual testing and exploring endpoints. The collection lives in `bruno/` at the repository root.

### Layout

```
bruno/
├── bruno.json                  # Collection metadata
├── environments/
│   └── development.bru         # baseUrl: http://localhost:7000
├── health.bru                  # GET /health
└── users/
    ├── list-users.bru          # GET /users
    ├── create-user.bru         # PUT /users/:id
    ├── get-user.bru            # GET /users/:id
    ├── update-user.bru         # PATCH /users/:id
    └── delete-user.bru         # DELETE /users/:id
```

### Conventions

- One `.bru` file per endpoint, named with the action in kebab-case (`create-user.bru`, not `PUT-user.bru`).
- Group files by feature in subdirectories matching the API feature directories (`users/`, etc.).
- Use the `development` environment for local testing — it points to `http://localhost:7000`.
- Keep request bodies minimal and representative. Use UUID v7 for IDs.
- When adding a new feature with HTTP endpoints, add the corresponding Bruno requests in `bruno/<feature>/`.

---

## Docker & Workflow

All development happens inside Docker containers. No local Node.js or pnpm installation is needed. The `just` task runner wraps all Docker Compose operations.

For the full command reference and port mapping, see [`AGENTS.md`](../AGENTS.md).

---

## Dependencies

Shared dev dependencies (TypeScript, oxlint, oxfmt, tsx, OTel packages, etc.) are pinned once in the workspace `catalog:` inside `pnpm-workspace.yaml`. Reference them from individual `package.json` files using `catalog:` instead of a version string:

```json
{
  "devDependencies": {
    "typescript": "catalog:",
    "oxlint": "catalog:"
  }
}
```

To add a dependency to a package:

```sh
# From the host, using just shell
just shell
pnpm --filter @monowork/api add <package>
pnpm --filter @monowork/app add -D <package>
```

After any `package.json` change, run `just install` to sync the lockfile.
