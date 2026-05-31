# RBAC Phase 2 — Memberships

## Goal

Model "this user belongs to this org" as a first-class record with its own lifecycle:
status (invited / active / suspended), join date, and inviter. This is the pivot the whole
authorization model resolves through.

## Scope

### New: `api/src/memberships/memberships.db.ts`
Status enum + table:
```ts
export const membershipStatus = pgEnum('membership_status', ['invited', 'active', 'suspended'])
```
`memberships` table:
- `id` uuid pk `defaultRandom()`
- `userId` uuid not null → `users.id`
- `orgId` uuid not null → `organizations.id`
- `status` `membershipStatus` not null `default('invited')`
- `joinedAt` timestamp nullable (set when status becomes `active`)
- `invitedBy` uuid nullable → `users.id`
- `createdAt` / `updatedAt` / `deletedAt`
- `UNIQUE (user_id, org_id)` — one membership per (user, org).

### New: `api/src/memberships/memberships.ts`
Domain type `Membership` with `status: 'invited' | 'active' | 'suspended'`. No Drizzle.

### New: `api/src/memberships/memberships.repo.ts`
`MembershipsRepository`: `findById`, `findByUserAndOrg(userId, orgId)`, `listByOrg(orgId)`,
`listByUser(userId)`, `create`, `updateStatus`, `remove` (soft delete). Reads filter
`isNull(deletedAt)`. `findByUserAndOrg` is the hot path used by the authz resolver (phase 5).

### New: `api/src/memberships/memberships.service.ts`
`MembershipsService`: `invite(userId, orgId, invitedBy)`, `accept(id)` (status → active,
stamps `joinedAt`), `suspend(id)`, `reactivate(id)`, `get`, `listForOrg`, `remove`. Encodes
the legal status transitions; rejects an invite that duplicates an existing membership.

### New: `api/src/memberships/memberships.routes.ts`
Nested under the org: `GET /orgs/:orgId/members`, `GET /orgs/:orgId/members/:id`,
`PUT /orgs/:orgId/members/:id` (invite, client-provided id), `PATCH /orgs/:orgId/members/:id`
(status transition), `DELETE /orgs/:orgId/members/:id`. Zod schema exposes status; never the
soft-delete column.

### Wiring & tests
- Register in `app.ts` with the `traced(...)` pattern.
- `memberships.service.test.ts` (transition rules, duplicate-invite rejection),
  `memberships.routes.test.ts`, `memberships.repo.test.ts`, `memberships.test-helpers.ts`.
- `just db-generate` / `just db-migrate`; Bruno requests under `bruno/memberships/`.

## Out of scope
- Roles on the membership (phase 4) and permission enforcement (phase 5). These routes are
  unguarded until phase 5.

## Dependencies
- [[rbac-organizations]] (FK `org_id`), existing `users` (FK `user_id`, `invited_by`).
