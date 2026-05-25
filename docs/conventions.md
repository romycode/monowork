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
7. [Docker & Workflow](#docker--workflow)
8. [Dependencies](#dependencies)

---

## Project Structure

This is a pnpm monorepo with two packages:

```
monowork/
├── api/              # @monowork/api — Fastify 5 backend
├── app/              # @monowork/app — Vue 3 frontend
├── bruno/            # Bruno API client collection
├── docs/             # Project documentation
├── compose.yml       # Docker Compose for all services
├── justfile          # Task runner (wraps Docker Compose)
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json      # Workspace root (scripts, engines, shared devDeps)
```

### `api/` layout

Organised as **vertical slices + ports & adapters**. Each feature owns all its layers under a single directory:

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
│       ├── <feature>-schema.ts      # Drizzle table definition
│       ├── <feature>-repository.ts  # DB adapter (outbound port)
│       ├── <feature>-service.ts     # Business logic (inbound port)
│       ├── <feature>-router.ts      # HTTP adapter — thin, delegates to service
│       └── <feature>.test.ts        # Route tests, mocks the service
├── drizzle.config.ts
├── tsconfig.json
├── tsconfig.build.json       # Excludes tests/seed from production build
└── package.json
```

### `app/` layout

```
app/
├── src/
│   ├── main.ts               # Vue app bootstrap
│   ├── App.vue
│   ├── router/index.ts
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
| Files | kebab-case | `users-repository.ts` |
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

```ts
// api/ — correct
import type { UsersService } from '#/users/users-service'
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

Each feature is a self-contained directory under `src/<feature>/`. The layers within each slice have strict rules about what they may depend on:

| Layer | File | May depend on |
|---|---|---|
| HTTP adapter | `<feature>-router.ts` | Service port, Zod, Fastify |
| Service (inbound port) | `<feature>-service.ts` | Repository port, domain types |
| DB adapter (outbound port) | `<feature>-repository.ts` | Drizzle, `db` singleton |
| Schema | `<feature>-schema.ts` | Drizzle table helpers |

No layer may skip levels (e.g. a router must not call the repository directly).

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
import type { ItemsService } from '#/items/items-service'
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
- Pass the service via plugin options: `void app.register(itemsRouter, { service: createItemsService(repo) })`

### Service

Contains business logic. Receives domain inputs, returns domain objects, delegates persistence to the repository port. Use a factory function — not a class.

```ts
import type { ItemsRepository, Item } from '#/items/items-repository'

export type ItemsService = {
  list: () => Promise<Item[]>
  // ...
}

export function createItemsService(repo: ItemsRepository): ItemsService {
  return {
    list: () => repo.findAll(),
    // ...
  }
}
```

### Repository

DB adapter. Use a factory function — not a class. Define the repository `type` (the port) in the same file so it can be imported and mocked in tests without pulling in Drizzle.

```ts
export type Item = typeof items.$inferSelect

export type ItemsRepository = {
  findAll: () => Promise<Item[]>
  // ...
}

export function createItemsRepository(db: DB): ItemsRepository {
  return {
    findAll: () => db.select().from(items),
    // ...
  }
}
```

### Schema

Drizzle `pgTable` definition. Use camelCase for TypeScript properties and snake_case for SQL column names. The Drizzle config uses a glob (`./src/**/*-schema.ts`) so new schemas are picked up automatically.

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
- **Stores**: one Pinia store per domain concept, in `src/stores/`. Export the store via a `use<Name>Store` composable using `defineStore`.
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
| Mocking | Manual factory functions (no mocking library) |

Each feature slice has two test files:

| File | Kind | Mocks | What it tests |
|---|---|---|---|
| `<feature>-service.test.ts` | Unit | `<Feature>Repository` | Business logic in isolation |
| `<feature>-router.test.ts` | Acceptance | `<Feature>Repository` | Full HTTP contract: router + real service |

**Both test kinds mock at the repository boundary** — the infrastructure edge. The difference is the entry point: unit tests call service methods directly; acceptance tests send HTTP requests and exercise the service for real.

#### Unit tests (`<feature>-service.test.ts`)

Call service methods directly with a mocked repository. Focus on what the service *does*, not HTTP.

```ts
describe('UsersService.get', () => {
  it('returns undefined when not found', async () => {
    const service = createUsersService(mockRepo({ findById: async () => undefined }))
    assert.equal(await service.get('non-existent-id'), undefined)
  })
})
```

#### Acceptance tests (`<feature>-router.test.ts`)

Build a minimal Fastify app with the real service wired to a mocked repository. Never import `createApp()` — register only the router under test.

```ts
function buildApp(repoOverrides: Partial<UsersRepository> = {}) {
  const service = createUsersService(mockRepo(repoOverrides))
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
  const app = buildApp({ upsert: async () => ({ user: mockUser, created: true }) })
  t.after(() => app.close())
  const res = await app.inject({ method: 'PUT', url: '/users/' + mockUser.id, payload })
  assert.equal(res.statusCode, 201)
})
```

#### Mock factory pattern

Use a factory function with "not implemented" stubs for all port methods and accept partial overrides. Never use a mocking library.

```ts
function mockRepo(overrides: Partial<UsersRepository> = {}): UsersRepository {
  const notImplemented = (): never => { throw new Error('Not implemented') }
  return { findAll: notImplemented, findById: notImplemented, ...overrides }
}
```

**Always close the app** in `t.after()` to prevent resource leaks.

Run tests with `just test` (requires services to be running).

### App (`app/`)

The frontend uses vitest with happy-dom and `@testing-library/vue`.

- Co-locate tests next to the component or store being tested.
- Use `@testing-library/vue` render utilities rather than manual Vue mount calls.
- Run with `pnpm --filter @monowork/app test` (not wired into `just` yet).

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
