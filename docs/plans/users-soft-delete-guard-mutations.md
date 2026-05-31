# Users — Guard mutations against soft-deleted records

## Goal

Soft-deleted users must be invisible to all operations, not just reads. `update` and `upsert` currently bypass the `deleted_at` guard and can mutate or return deleted rows.

## Scope

### `users-repository.ts`
- `update` — add `isNull(users.deletedAt)` to the `where` clause. Already returns `undefined` when no row matches, so the router's 404 path is covered automatically.
- `upsert` — add `isNull(users.deletedAt)` to the fallback `select`. Change return type to `Promise<{ user: User; created: boolean } | undefined>` so callers can detect the "id belongs to a deleted user" case.

### `users-service.ts`
- `upsert` return type: `Promise<{ user: User; created: boolean } | undefined>`.

### `users-router.ts`
- PUT handler: handle `undefined` from `usersService.upsert` as 404 (`{ message: 'User not found' }`). Add `404: notFoundSchema` to the response schema.

## Test impact
- `users-repository.test.ts` — add cases for `update` and `upsert` on a soft-deleted user (expect `undefined`).
- `users-router.test.ts` — add case for PUT on a deleted user (expect 404).
- `users-service.test.ts` — add case for `upsert` returning `undefined`.

## Dependencies
- Builds on [[users-soft-delete]].
