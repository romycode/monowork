# RBAC Phase 6 — Staff / platform layer

## Goal

Add the parallel, org-independent authorization space for platform staff: a separate
permission vocabulary, a separate route tree (`/internal/*`), and an `is_staff` short-circuit
wired into the existing `can()`. Staff tables must **not** reuse the org role/permission
tables — different namespace, different blast radius.

## Scope

### `api/src/users/users.db.ts` (extend)
Add `isStaff` boolean `default(false).notNull()` — the cheap gate. By itself it authorizes
nothing.

### New staff tables (own slice `api/src/staff/`)
- `staff-roles.db.ts` — `staff_roles` (id, name unique, description, timestamps): e.g.
  `support`, `billing_ops`, `superadmin`.
- `staff-permissions.db.ts` — `staff_permissions` (id, name unique, description): platform
  ops vocabulary `org.read`, `org.suspend`, `user.impersonate`, `refund.issue`,
  `flag.toggle`.
- `staff-role-permissions.db.ts` — junction `(staff_role_id, staff_permission_id)`, PK pair,
  hard delete.
- `user-staff-roles.db.ts` — junction `(user_id, staff_role_id)`, PK pair, hard delete.

### Domain / repo / service
- `staff/staff.repo.ts` — `staffRolesFor(userId)`, `staffPermissionsFor(userId)` (join
  user → staff roles → staff permissions), plus admin CRUD for staff roles and assignments.
- `staff/staff.service.ts` — `staffHas(userId, permission)` returning whether the union of a
  user's staff-role permissions contains `permission`.

### `api/src/authz/authz.service.ts` (extend)
Implement the platform branch of `can()` (design §4.1):
```text
if org is undefined:
    return user.isStaff and staffHas(user.id, permission)
```
The cheap `is_staff` flag gates whether the staff tables are even queried.

### New: `api/src/internal/` route tree
- `requireStaffPermission(permission)` preHandler — analogous to `requirePermission` but
  org-free: 401 if no user, 403 if `!isStaff` or `staffHas` is false.
- Example admin routes guarded by it: `POST /internal/orgs/:id/suspend`
  (`org.suspend`), `GET /internal/orgs` (`org.read`). These operate on the platform; org
  membership is irrelevant here.

### Seed — first superadmin
- Add a seed/CLI step (`api/src/db/seed.ts` or a dedicated script) that creates the staff
  roles, staff permissions, their links, and **seeds the first superadmin** by setting
  `is_staff = true` and assigning `superadmin`. Idempotent. **Never** exposed via the UI/API
  (chicken-and-egg, design §6).

### Tests & wiring
- `staff.service.test.ts` (union of staff permissions, gate behavior),
  `staff` repo/route tests, `require-staff-permission.test.ts` (401/403/200).
- Extend `authz.service.test.ts` for the `org === undefined` staff branch.
- Register the `/internal` routers in `app.ts` with `traced(...)`.
- `just db-generate` / `just db-migrate`; Bruno under `bruno/internal/`.

## Out of scope
- Impersonation, audit log, support read-grants, JIT elevation → phase 7. In this phase a
  staff member with a god-mode read permission could be allowed by the §4.1 support branch,
  but that branch stays disabled until phase 7 ships the grant + audit machinery.

## Dependencies
- [[rbac-authz-resolution]] (extends `can()` and the guard pattern), existing `users` slice
  (`is_staff` column).
