# RBAC Phase 3 — Roles, Permissions & the catalog

## Goal

Stand up the authorization vocabulary: a `permissions` catalog (the source of truth the code
checks against), a `roles` catalog (human-facing bags of permissions), and the
`role_permissions` bridge that links them. Seed a starter set so the system is usable.

## Scope

### New: `api/src/roles/roles.db.ts`
`roles` table: `id` uuid pk, `name` text not null unique, `description` text nullable,
`createdAt`/`updatedAt`/`deletedAt`. (See design §9 open question on a future nullable
`orgId` for per-org custom roles — out of scope here; roles are a global catalog.)

### New: `api/src/permissions/permissions.db.ts`
`permissions` table: `id` uuid pk, `name` text not null unique (e.g. `'post.create'`,
`'post.read'`, `'post.delete'`, `'billing.manage'`), `description` text nullable,
`createdAt`. Permissions are immutable catalog data — no soft delete needed.

### New: `api/src/roles/role-permissions.db.ts`
`role_permissions` junction: `roleId` → `roles.id`, `permissionId` → `permissions.id`,
composite PK `(role_id, permission_id)`. **Hard delete** (no `deletedAt`).

### Domain, repo, service, routes
- `roles/roles.ts`, `roles/roles.repo.ts`, `roles/roles.service.ts`, `roles/roles.routes.ts`
  — CRUD for roles plus `attachPermission` / `detachPermission` and
  `listPermissions(roleId)` (joins through `role_permissions`).
- `permissions/permissions.ts`, `.repo.ts`, `.service.ts`, `.routes.ts` — read-mostly:
  `GET /permissions` lists the catalog. Mutations are admin/seed-only.
- Routes: `GET /roles`, `GET /roles/:id`, `PUT /roles/:id`, `PATCH /roles/:id`,
  `DELETE /roles/:id`, `PUT /roles/:id/permissions/:permissionId`,
  `DELETE /roles/:id/permissions/:permissionId`, `GET /permissions`.

### Seed: `api/src/db/seed.ts`
Extend the existing seed to insert the starter catalog idempotently
(`onConflictDoNothing`):
- Permissions: `post.create`, `post.read`, `post.update`, `post.delete`, `billing.manage`,
  `member.invite`, `member.manage`.
- Roles → permissions:
  - `admin` → all of the above
  - `editor` → `post.*`
  - `viewer` → `post.read`
  - `billing` → `billing.manage`

### Tests & wiring
- Service/routes/repo tests + test-helpers for both `roles` and `permissions`, mocking at the
  repo boundary (role↔permission attach/detach, catalog listing).
- Register both routers in `app.ts` with `traced(...)`.
- `just db-generate` / `just db-migrate`; Bruno under `bruno/roles/` and `bruno/permissions/`.

## Out of scope
- Assigning roles to a membership (phase 4) and runtime checks (phase 5). Per-org custom
  roles (design §9).

## Dependencies
- None hard, but lands after [[rbac-memberships]] so phase 4 can immediately consume it.
