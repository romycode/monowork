# RBAC Phase 7 — Impersonation, audit log & JIT elevation

## Goal

Make staff access to org data safe and accountable. Replace silent god-mode with audited,
expiring, reasoned access: a separate audit log, time-boxed support read-grants, auditable
impersonation, and just-in-time elevation. Staff is the highest-value attack surface, so
none of this is optional (design §6).

## Scope

### New: `api/src/audit/audit-log.db.ts`
`audit_log` table (append-only): `id`, `actorUserId` → users, `impersonatorUserId` nullable
→ users (set when acting via impersonation), `action` text, `orgId` nullable, `target` text,
`reason` text nullable (required for support actions), `createdAt`. No update/delete.

### New: `api/src/audit/audit.service.ts`
`record({ actor, impersonator?, action, org?, target, reason? })`. Called by:
- the support read-grant branch of `can()`,
- impersonation start/stop,
- every `/admin` mutating action.
Double-logs impersonation: actor (the org identity acted as) + impersonator (real staff).

### New: `api/src/staff/support-grants.db.ts` + service
`support_grants` (id, `staffUserId`, `orgId`, `kind: 'read'`, `reason`, `grantedAt`,
`expiresAt`, `revokedAt` nullable). Service: `grant(staffUserId, orgId, reason, ttl)`,
`activeReadGrant(staffUserId, orgId)` (non-expired, non-revoked), `revoke(id)`.

### `api/src/authz/authz.service.ts` (enable the support branch)
Turn on the previously-disabled product-surface branch of design §4.1:
```text
if user.isStaff and activeReadGrant(user.id, org) and isRead(permission):
    auditService.record({ actor: user, action: permission, org, target, reason })
    return true
```
- `isRead(permission)` = permission name ends in `.read` / is in a read allowlist.
- **Read-only** support bypass only. Writes/destructive ops require impersonation.

### New: `api/src/staff/impersonation.ts`
Open a logged support session: `startImpersonation(staffUserId, orgId, reason)` →
returns an actor context where `currentUser` resolves as the impersonated member while the
request also carries `impersonatorUserId`. Product code is unchanged — it still calls
`can(user, perm, org)`; the impersonation context makes `user` the member and the audit
layer records both identities. `stopImpersonation` ends and logs it. Time-boxed.

### JIT elevation
Superadmin is not permanent. `elevate(staffUserId, reason, ttlMinutes)` grants a staff role
for a bounded window (a `user_staff_roles` row with an `expiresAt`, or a parallel
`staff_elevations` table); `staffHas` only counts non-expired grants. Reduces the blast
radius of a compromised account.

### Routes (admin tree)
- `POST /admin/orgs/:id/support-grants` (`support.grant`) — open a read grant with reason.
- `POST /admin/impersonations` / `DELETE /admin/impersonations/:id` — start/stop, reasoned.
- `POST /admin/elevations` — JIT elevation with reason + TTL.
- `GET /admin/audit-log` (`audit.read`) — read the trail.
All guarded by `requireStaffPermission` and recorded to `audit_log`.

### Tests
- `audit.service.test.ts`, `support-grants` service/repo tests, `impersonation` tests
  (double-logging, read-only bypass denied for writes, expired grant denied), JIT expiry.
- Extend `authz.service.test.ts`: active read grant allows read, denies write, expired denies.

### Database & Bruno
- `just db-generate` / `just db-migrate`. Bruno under `bruno/admin/` for grants,
  impersonation, elevation, audit.

## Out of scope (acknowledged future work)
- The concrete **2FA/SSO** mechanism and a separate staff login — recorded as a requirement
  (design §6); rides with the real auth layer.
- Tamper-evident / externally-shipped audit storage (hash chaining, WORM) — V1 keeps an
  append-only table.

## Dependencies
- [[rbac-staff-platform]] (staff roles/permissions, `/admin` tree, `requireStaffPermission`),
  [[rbac-authz-resolution]] (the `can()` support branch and guard).
