# Users — Soft Delete

## Goal

Replace the physical `DELETE` with a logical delete: set a `deleted_at` timestamp on the row instead of removing it. Deleted users are invisible to all read operations.

## Scope

### `users-schema.ts`
- Add `deletedAt: timestamp('deleted_at')` — nullable, no default.

### `users-repository.ts`
- `toUser` — also omit `deletedAt` from the `User` type (internal detail, same as `password`).
- `findAll` — add `where(isNull(users.deletedAt))`.
- `findById` — add `and(eq(users.id, id), isNull(users.deletedAt))`.
- `remove` — change from `db.delete(...)` to `db.update(...).set({ deletedAt: new Date() })`, filtered to non-deleted rows only; returns `undefined` if already soft-deleted or not found.

### Database
- Run `just db-generate` to produce the migration file.
- Run `just db-migrate` to apply it.

## Out of scope
- Upsert behaviour for soft-deleted users (a PUT on a soft-deleted id will still return the existing record as `created: false` — acceptable for now).
- Hard-delete admin endpoint.
- Exposing `deletedAt` in the API response.

## Test impact
- `users-repository.test.ts` — update `remove` test: verify row still exists in DB with `deletedAt` set, and that subsequent `findById` / `findAll` exclude it.
- `users-service.test.ts` / `users-router.test.ts` — HTTP contract (204 / 404) unchanged; mocks need no update.

## Dependencies
- Drizzle `isNull`, `and` helpers (already available in `drizzle-orm`).
