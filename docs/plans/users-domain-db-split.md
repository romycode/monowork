# Users — Split domain model from database model

## Goal

Decouple the domain `User` type from Drizzle. Currently `User` is derived via `Omit<typeof users.$inferSelect, ...>`, which leaks ORM concerns into the domain. After this change, the domain type is an explicit pure-TS definition; the repository is the only layer that knows about Drizzle record shapes.

## New file conventions

| File | Purpose |
|------|---------|
| `<feature>.ts` | Domain types — pure TS, zero Drizzle imports |
| `<feature>.db.ts` | Drizzle table definition |
| `<feature>.repo.ts` | Repository — maps between DB record and domain type |

## Scope

### New: `api/src/users/users.ts`
Explicit domain type:
```ts
export type User = {
  id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}
```

### New: `api/src/users/users.db.ts`
Move the Drizzle table definition here verbatim from `users-schema.ts`.

### Delete: `api/src/users/users-schema.ts`

### `api/src/users/users-repository.ts`
- Import `users` table from `#/users/users.db` instead of `#/users/users-schema`.
- Import `User` from `#/users/users` instead of deriving it from Drizzle.
- `toUser` maps from the Drizzle `UserRecord` type to the domain `User`.
- `UserRecord` stays as a local `typeof users.$inferSelect` — it is a DB concern, not exported.

### `api/src/users/users-service.ts`
- Import `User` from `#/users/users` instead of `#/users/users-repository`.

### `api/src/users/users-test-helpers.ts`
- Import `User` from `#/users/users`.

### `api/src/users/users-repository.test.ts`
- Import `users` table from `#/users/users.db`.

### `api/src/db/seed.ts`
- Import `users` table from `#/users/users.db`.

### `api/drizzle.config.ts`
- Update schema glob from `./src/**/*-schema.ts` to `./src/**/*.db.ts`.

### `AGENTS.md`
- Update file naming rules to reflect `.db.ts` for DB models.

## Dependencies
- Builds on [[users-soft-delete]].
