# RBAC Phase 5 — Permission resolution & route guard

## Goal

The keystone. Turn the data model into enforcement: resolve `(user, org) → membership →
roles → permissions` (unioned), expose a single `can(user, permission, org)` contract, and a
Fastify `requirePermission` guard that fails closed with the right status (**404** for a
non-member, **403** for a member lacking the permission). Also ship the minimal
current-user / org-context plumbing as a **stub**, since real auth is out of scope.

## Scope

### New: `api/src/authz/current-user.ts` + onRequest hook (stub)
- `type CurrentUser = { id: string; isStaff: boolean }` decorated onto the request.
- A dev/test `onRequest` hook populates `request.currentUser` from a header
  (`X-User-Id`, `X-Is-Staff`) or a fixed test fixture. This is the **seam** real auth slots
  into later — the resolver and guard never change when it is replaced.
- Register the hook in `app.ts` before the routers.

### New: `api/src/authz/authz.service.ts`
`createAuthzService({ memberships, roles })` returning:
```ts
type AuthzService = {
  resolvePermissions: (userId: string, orgId: string) => Promise<Set<string>>
  can: (user: CurrentUser, permission: string, org?: string) => Promise<boolean>
}
```
- `resolvePermissions`: load the **active** membership (`findByUserAndOrg`); if none →
  return empty set (the guard turns that into 404). Otherwise gather roles
  (`membership.listRoles`) → union their permissions.
- `can`: implements design §4.1 — staff short-circuit when `org` is undefined; otherwise
  membership resolution. (Support read-bypass branch is a no-op until phase 7.)

### New: `api/src/authz/require-permission.ts`
`requirePermission(permission: string): preHandlerHookHandler`:
1. Read `request.currentUser` (401 if absent — fail closed).
2. Read `orgId` from `request.params`.
3. `membership = findByUserAndOrg(user.id, orgId)`. If none or not `active` → **404**
   (`{ message: 'Not found' }`) — do not confirm the org exists.
4. Resolve the permission set; if it lacks `permission` → **403**.
5. Otherwise continue. Attach the resolved set to the request to avoid re-resolving within
   the same request.

### Apply the guard
Add `preHandler: requirePermission('…')` to org-scoped mutating routes from phases 1–4
(e.g. `member.invite` on invite, `member.manage` on role assign/suspend). List/read routes
get `post.read` or an appropriate membership check.

### Caching
- V1: **request-scoped memo** — resolve once per request, reuse across the guard and handler.
- Document the invalidation triggers (role assign/revoke, status change, role's permissions
  change) as the contract a future cross-request cache must honor. No shared cache in V1.

### Tests
- `authz.service.test.ts` — unit: union across multiple roles, empty set when no active
  membership, suspended membership denied, staff short-circuit for `org === undefined`.
- `require-permission.test.ts` — acceptance: build a tiny Fastify app with a guarded route
  and a mocked memberships/roles repo; assert 401 (no user) / 404 (no membership) / 403
  (member without permission) / 200 (allowed). Use the established `app.inject()` pattern.

## Out of scope
- Real authentication (password verification, sessions/JWT, 2FA) — the hook is a stub.
- Staff `/admin` tree and impersonation (phases 6–7); `can(user, perm, undefined)` is wired
  but staff tables don't exist yet, so it returns false until phase 6.

## Dependencies
- [[rbac-memberships]], [[rbac-roles-permissions]], [[rbac-membership-roles]].
