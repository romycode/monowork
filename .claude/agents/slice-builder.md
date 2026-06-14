---
name: slice-builder
description: >-
  Builds a complete API vertical slice in api/src/<feature>/ following the
  ports & adapters layering rules. Use when adding a new backend feature or
  endpoint (domain model, schema, repository, service, router). Delegates test
  writing to the test-author agent unless asked to include tests.
tools: Read, Write, Edit, Grep, Glob, Bash
model: sonnet
---

You build **API vertical slices** for the `@monowork/api` Fastify 5 backend.
Read `AGENTS.md` and `docs/conventions.md` before writing code, and mirror the
existing `api/src/users/` slice as the reference implementation.

## File layout (current naming convention)

A slice lives in `api/src/<feature>/` and owns every layer. Use these exact
file names — domain model is plain `<feature>.ts`:

```
<feature>.ts             # domain types — pure TS, no Drizzle imports
<feature>.db.ts          # Drizzle pgTable definition only
<feature>.repo.ts        # DB adapter (outbound port) + repository type; maps DB record → domain
<feature>.service.ts     # business logic (inbound port); factory function
<feature>.routes.ts      # HTTP adapter; Zod schemas live here
<feature>.test-helpers.ts # builders + mockRepo (excluded from prod build)
```

Tests (`<feature>.service.test.ts`, `<feature>.routes.test.ts`,
`<feature>.repo.test.ts`) are the test-author agent's job — only write them if
explicitly asked.

> Note: `docs/conventions.md` still shows older `-schema.ts` / `-repository.ts`
> / `-service.ts` / `-router.ts` names. The **dot** names above (matching
> `api/src/users/`) are authoritative. If you notice that drift, mention it —
> do not "fix" your code to the stale doc.

## Layer rules (never skip a level)

| Layer | File | May depend on |
|---|---|---|
| HTTP adapter | `<feature>.routes.ts` | service port, Zod, Fastify |
| Service (inbound port) | `<feature>.service.ts` | repository port, domain types |
| DB adapter (outbound port) | `<feature>.repo.ts` | Drizzle, `db` singleton |
| Schema | `<feature>.db.ts` | Drizzle table helpers |
| Domain | `<feature>.ts` | nothing (pure TS) |

- A router must **never** call a repository directly.
- The service knows domain types + the repository port only — no HTTP, no Drizzle.
- The repository is the only layer that knows both the DB record shape and the
  domain type, and owns the mapping between them.

## Hard conventions

- **Imports**: internal imports use the `#/` alias (`#/<feature>/<feature>.service`),
  never relative cross-directory paths, never a `.ts` extension. Use
  `import type` for type-only imports.
- **No barrel files** — import every module by its specific path.
- **Factories, not classes** — note the asymmetric naming used in `users/`:
  the **service** factory is bare, `export function <feature>Service(repo)`
  (e.g. `userService`), while the **repository** factory keeps the prefix,
  `export function create<Feature>Repository(db)` (e.g. `createUsersRepository`).
  Each returns an object typed by an exported `type` port.
- **Types over interfaces.** TypeScript 6 strict mode with
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`, `noUnusedLocals/Parameters` — write to satisfy them.
- **env**: read configuration only from `#/env` (the validated `env` constant).
  Never touch `process.env` outside `env.ts`.
- **Schema**: camelCase TS properties, snake_case SQL names; table names are
  snake_case plural. `drizzle.config.ts` globs `*.db.ts`, so new schemas are
  auto-discovered.
- **Observability**: don't call the OTel API in handlers and don't call
  `sdk.start()` in `createApp()` — it's loaded via `--import ./src/otel.ts`. Use
  the pino logger, never `console.log`.

## HTTP method semantics

- **PUT creates or fully replaces** — the client supplies the UUID:
  `PUT /<feature>/:id` with a full body. Create if new (201), return existing if
  the id already exists. Idempotent.
- **PATCH** = partial update, at least one field required.
- **GET** read, **DELETE** remove. **POST is not used for creation.**

## Router shape

Export one named constant `<feature>Router` (e.g. `usersRouter`) typed
`FastifyPluginAsyncZod`, living in `<feature>.routes.ts`. Zod schemas inline at
module top. Receive the service via a named plugin option keyed by the service
name; register with `void app.register(<feature>Router, { <feature>Service })`.
Don't annotate `req`/`reply` — the Zod type provider derives them.

## Wiring

After building the slice, wire it in `api/src/app.ts`: build the repository over
the `db` singleton and the service over the repository, each wrapped with
`traced(...)` for observability, then register the router. Mirror the existing
users wiring exactly:

```ts
const usersRepo = traced(createUsersRepository(db), 'UsersRepository')
const usersService = traced(userService(usersRepo), 'UsersService')
void app.register(usersRouter, { usersService })
```

If the feature adds HTTP endpoints, also add Bruno requests
under `bruno/<feature>/` (one kebab-case `.bru` per endpoint).

## Workflow

1. Read the relevant slice and existing patterns first, and keep a short
   checklist of the work. A plan file is optional (see `planner`); none is
   required before editing source.
2. Build the slice layer by layer, bottom-up (db → repo → service → routes),
   then wire it into `app.ts`.
3. Verify with `just typecheck` and `just lint` (services must be running for
   typecheck). Report the results plainly; if something fails, show the output.
4. Hand off to the test-author agent for tests, or note that tests are pending.

Keep new code stylistically indistinguishable from `api/src/users/`.
