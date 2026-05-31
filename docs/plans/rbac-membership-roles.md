# RBAC Phase 4 — Membership ↔ Roles

## Goal

Connect the two halves: assign one or more roles to a membership via the `membership_roles`
bridge. This is what makes "user U has roles [editor, billing] in org O" expressible, and the
union of those roles' permissions is what phase 5 resolves.

## Scope

### New: `api/src/memberships/membership-roles.db.ts`
`membership_roles` junction: `membershipId` → `memberships.id`, `roleId` → `roles.id`,
composite PK `(membership_id, role_id)`. **Hard delete** — revoking a role deletes the link
row. No `deletedAt`.

### `api/src/memberships/memberships.repo.ts` (extend)
Add: `assignRole(membershipId, roleId)` (insert, `onConflictDoNothing`),
`revokeRole(membershipId, roleId)` (delete the link), `listRoles(membershipId)` (join through
`membership_roles` → `roles`). These join only against non-deleted memberships.

### `api/src/memberships/memberships.service.ts` (extend)
Add `assignRole` / `revokeRole` / `listRoles`. Guard: the membership must exist and be
non-deleted; the role must exist. Assigning an already-assigned role is idempotent.

### `api/src/memberships/memberships.routes.ts` (extend)
- `PUT /orgs/:orgId/members/:id/roles/:roleId` — assign (idempotent, 204).
- `DELETE /orgs/:orgId/members/:id/roles/:roleId` — revoke (204/404).
- `GET /orgs/:orgId/members/:id/roles` — list a membership's roles.

### Tests
- Extend `memberships.service.test.ts` (assign/revoke/list, idempotency, missing role) and
  `memberships.routes.test.ts`. Extend `memberships.repo.test.ts` for the join + hard-delete.
- Update `memberships.test-helpers.ts` mockRepo with the new methods.

### Database & Bruno
- `just db-generate` / `just db-migrate`. Add Bruno requests for assign/revoke/list-roles.

## Out of scope
- Resolving permissions / enforcing them (phase 5). Cache invalidation on role change is
  designed in phase 5; this phase just records the wiring point (assign/revoke are the events
  that must invalidate a cached `(user, org)` permission set).

## Dependencies
- [[rbac-memberships]] (the membership rows) and [[rbac-roles-permissions]] (the roles).
