# Multitenant RBAC — Design

Authoritative design for the multitenant users / roles / permissions model. This is the
parent document; each implementation phase has its own plan under `docs/plans/rbac-*.md`
and a row in [`planing.md`](../planing.md).

> **Status:** design only. No code is written by this document. It records the decisions,
> the target data model, the runtime authorization flow, and the phased roadmap so the
> implementation plans can be executed one slice at a time.

---

## 1. Guiding principle

> Identity (`users`) is separate from membership (`memberships`), which is separate from
> roles (`membership_roles`), which is separate from permissions (`role_permissions`). The
> code checks **org-scoped permissions**; roles are editable bags of permissions (data, not
> code); platform staff live **outside** the org-scoped model behind their own audited
> short-circuit.

The single rule every handler obeys: **ask for a capability, scoped to an org** —
`can(user, 'post.delete', org)` — never `if (role === 'admin')`.

---

## 2. Decision log

| # | Decision | Why |
|---|----------|-----|
| 1 | Roles via a **many-to-many** join, not a `user_type` column | A user can be several things at once; a single column collapses into `is_admin`/`is_editor` sprawl or compound enums. |
| 2 | Roles attach to the **membership**, not the user | The same person is `editor` in org A and `viewer` in org B without collision. Roles hang off the (user, org) relationship. |
| 3 | `memberships` is its **own table**, not a flat `user_org_roles` | Membership has a lifecycle — `status` (invited/active/suspended), `joined_at`, `invited_by`. A flat join has nowhere to hang that. |
| 4 | Roles assigned through a **bridge table** (`membership_roles`), not a column | A column caps you at one role. The bridge allows several roles per membership; at resolution time their permissions are **unioned**. |
| 5 | **Permissions** are the source of truth for authorization | Roles are a human-facing grouping. Adding a role is a data change, not a code change. |
| 6 | Platform **staff live in a parallel, separate namespace** | Org vocabulary is product resources (`post.delete`); staff vocabulary is platform ops (`org.suspend`, `user.impersonate`). Shared namespaces let a product permission leak into a platform operation — blast radius = the whole platform. |

---

## 3. Target data model

Two parallel spaces. **Org-scoped** (product) and **staff** (platform). They never share
role/permission tables.

### 3.1 Org-scoped space

```text
users            (id, email, password_hash, is_staff, created_at, updated_at, deleted_at)
organizations    (id, name, slug, created_at, updated_at, deleted_at)

memberships      (id, user_id → users, org_id → organizations,
                  status: invited | active | suspended,
                  joined_at, invited_by → users, created_at, updated_at, deleted_at)
                  UNIQUE (user_id, org_id)

roles            (id, name, description, created_at, updated_at)          -- catalog: admin, editor, viewer, billing
permissions      (id, name, description, created_at)                      -- 'post.create', 'billing.manage', …
role_permissions (role_id → roles, permission_id → permissions)           -- PK (role_id, permission_id)
membership_roles (membership_id → memberships, role_id → roles)           -- PK (membership_id, role_id)
```

### 3.2 Staff (platform) space — mirror of org space, **without** `org_id`

```text
users                  (… is_staff bool)                       -- cheap gate, authorizes nothing by itself
staff_roles            (id, name, description, …)              -- support, billing_ops, superadmin
staff_permissions      (id, name, description, …)              -- 'org.read', 'org.suspend', 'user.impersonate', 'refund.issue'
staff_role_permissions (staff_role_id, staff_permission_id)    -- PK pair
user_staff_roles       (user_id, staff_role_id)               -- PK pair
```

### 3.3 Audit & support access (phase 7)

```text
audit_log          (id, actor_user_id, impersonator_user_id?, action, org_id?, target,
                    reason?, created_at)
support_grants     (id, staff_user_id → users, org_id → organizations, kind: read,
                    reason, granted_at, expires_at, revoked_at?)
```

### 3.4 Schema conventions (match the existing codebase)

- Tables: `snake_case` plural; columns: `snake_case`; TS properties: `camelCase`.
- Entity tables (`organizations`, `memberships`, `roles`) carry `created_at`, `updated_at`,
  and a nullable `deleted_at` (soft delete), and all reads filter `isNull(deletedAt)` —
  exactly as `users` does today.
- **Junction tables** (`role_permissions`, `membership_roles`, `staff_role_permissions`,
  `user_staff_roles`) are pure links: composite primary key, **hard delete**, no soft-delete
  column. Revoking a role is a real `DELETE` of the link row.
- `status` uses a Drizzle `pgEnum('membership_status', […])`.
- `memberships` has `UNIQUE (user_id, org_id)` — one membership row per (user, org).
- Each table lives in its feature slice as `<feature>.db.ts`, picked up by the
  `./src/**/*.db.ts` glob in `drizzle.config.ts`. No central schema file.

---

## 4. Runtime authorization (org surface)

From here on **no permission is global** — it is always "does user U have permission P
**in org O**?".

Flow for every org-scoped request:

1. **Org context travels in the request** — in the URL (`/orgs/:orgId/...`). The current
   user comes from the auth layer (stubbed for now — see §7).
2. **Validate an active membership** of the user in that org.
   - If there is none → respond **404, not 403**. We do not confirm the org exists to a
     non-member.
3. **Resolve the permission set**: `(user, org) → membership → roles → permissions`,
   **unioning** the permissions of every role on the membership.
4. **Check** the concrete permission against that set.

```text
(user, org)
   └─ membership (status = active)
        └─ roles [editor, billing]
             └─ permissions { post.create, post.read, billing.manage, … }   ← union
```

### 4.1 The `can()` contract

```text
can(user, permission, org = None):
    # platform surface
    if org is None:
        return user.is_staff and staff_has(user, permission)

    # product surface
    if user.is_staff and support_read_grant_active(user, org) and is_read(permission):
        return True                      # audited support read access (phase 7)
    return resolve_via_membership(user, permission, org)
```

- Staff **short-circuit happens before** the org scope, and is audited.
- For V1, a read-only support bypass is acceptable. Write/destructive access to org data
  goes through impersonation or an explicit, expiring, logged grant — never a silent global
  bypass.

### 4.2 How handlers consume it

A Fastify `preHandler` guard is the single integration point. Routers declare the
permission they need; the guard resolves membership + permission and either continues or
fails closed with **404** (no membership) / **403** (member, lacks permission):

```ts
fastify.delete(
  '/orgs/:orgId/posts/:id',
  { preHandler: requirePermission('post.delete'), schema: { … } },
  handler,
)
```

Handlers never read roles. Adding a new role is a row in `roles` + `role_permissions`,
touching zero handlers.

### 4.3 Caching & invalidation

Resolving the set is a multi-table JOIN on every request. Cache the **resolved permission
set per `(user, org)`** with a short TTL (request-scoped memo first; a shared cache with
TTL later if needed). Invalidate when the membership's roles change, the membership status
changes, or a role's permissions change.

---

## 5. API surfaces

One deployable API serves two distinct audiences behind two route trees. They share the same
`can()` core (§4) but authenticate via **separate sessions** (§7).

| Surface | Route tree | Audience | Authorization |
|---------|-----------|----------|---------------|
| **Internal (staff) API** | `/internal/*` | platform staff — support, ops/billing, superadmin | staff permissions only; org membership irrelevant |
| **Organization API** | `/orgs/:orgId/*` | an organization's own members | normal org-scoped permission check |

**"Admin" is overloaded — keep the two apart:**
- **Platform staff / superadmin** operate the *platform* and live on the **internal** API.
  They are our own people; their reach can cross every org (audited — §5.2, §6).
- An organization's **own admin** is just an **org role** — a bag of permissions such as
  `member.manage` + `billing.manage` — on the **organization** API, sitting alongside that
  org's regular users (editor / viewer / …). It has no reach outside its own org.

Both surfaces are authenticated by JWT-in-cookie, but with separate session realms and
separate cookies so an org-user session can never authenticate an internal call (§7).

### 5.1 Staff / platform layer

- `is_staff` is a **cheap gate** so the 99.99% of traffic never touches the staff tables. By
  itself it authorizes nothing — real authorization is still permission-by-permission via
  `user_staff_roles → staff_roles → staff_permissions`.
- Expect several levels, not one superadmin: **support** (read-only), **ops/billing**,
  **superadmin** (all). Least privilege: many support, very few superadmin.

### 5.2 Staff into org data

1. **Bypass / god-mode** — has the permission, passes ignoring membership. Simple, hard to
   audit. Acceptable in V1 **only for read-only support permissions**.
2. **Impersonation / explicit access** — no automatic access; staff *enters* by opening a
   logged support session. Product code is unchanged (`can(user, perm, org)`); impersonation
   makes the actor act *as* a member while the real staff identity is recorded alongside.

---

## 6. Non-negotiables for staff (highest-value attack surface)

- **2FA / SSO mandatory**, on a login separate from the normal one — realized by the separate
  staff session realm in §7 (`POST /internal/auth/login`).
- **Audit log** of every action: who, what, which org, when, and — for support — *why*
  (reason field). Impersonation double-logs: actor + impersonator.
- **Just-in-time elevation:** not a permanent superadmin; elevate for N minutes with a
  reason. Shrinks the blast radius of a compromised account.
- **The first superadmin is seeded by migration or CLI, never from the UI** (chicken-and-egg).

---

## 7. Authentication (cookie + JWT)

Authorization (`can()`) only needs `request.currentUser = { id, isStaff }`. **Authentication**
is the layer that proves who that user is and populates it. It is specified in
[rbac-authentication.md](rbac-authentication.md) and uses a **signed JWT carried in an
HttpOnly cookie** for both surfaces, with **two separate session realms**:

| Realm | Cookie | Login surface | Populates `currentUser` for |
|-------|--------|---------------|------------------------------|
| Organization users (the `app/` client) | `__Host-session`, path `/` | `POST /auth/login` | `/orgs/:orgId/*` |
| Platform staff (internal API) | `__Host-staff`, path `/internal` | `POST /internal/auth/login` (separate, 2FA-gated) | `/internal/*` (`isStaff: true`) |

**Why two cookies, not one:** the staff session is the highest-value target (§6), so it gets a
separate login, a shorter lifetime, and is **path-scoped** so the browser only ever sends it
to `/internal/*`. An org-user cookie can never authenticate an internal call, and vice-versa.

**Token/cookie properties (both realms):** `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-`
prefix; a short-lived signed **access JWT** (HS256 via `AUTH_JWT_SECRET`; asymmetric later)
plus a **rotating refresh token** backed by a server-side `sessions` table for revocation.
Passwords are stored argon2-hashed (`users.password_hash`). Because auth rides on cookies,
CSRF defense is in scope (`SameSite=Lax` + a custom-header / double-submit check).

**Interim:** until the authentication plan lands, **phase 5 ships a stub** — an `onRequest`
hook reading a dev header — so the resolver and guard are testable. The contract
(`request.currentUser`) is identical, so swapping the stub for the real auth plugin touches
no resolution code.

---

## 8. Phase roadmap

Each phase is an independently shippable slice with its own plan and tests. Build org-scoped
first (phases 1–5); the staff layer (6–7) layers on top.

| Phase | Plan | Delivers |
|-------|------|----------|
| 1 | [rbac-organizations.md](rbac-organizations.md) | `organizations` slice (table, repo, service, routes, tests). |
| 2 | [rbac-memberships.md](rbac-memberships.md) | `memberships` slice with status lifecycle, `UNIQUE(user, org)`, invite/suspend. |
| 3 | [rbac-roles-permissions.md](rbac-roles-permissions.md) | `roles`, `permissions`, `role_permissions` + seeded catalog. |
| 4 | [rbac-membership-roles.md](rbac-membership-roles.md) | Assign/revoke roles on a membership (`membership_roles`). |
| 5 | [rbac-authz-resolution.md](rbac-authz-resolution.md) | `can()` resolver, `requirePermission` guard, org-context + current-user stub, 404/403 semantics, cache. |
| 6 | [rbac-staff-platform.md](rbac-staff-platform.md) | Staff tables, `is_staff` gate, `/internal` tree, staff short-circuit, first-superadmin seed. |
| 7 | [rbac-staff-impersonation-audit.md](rbac-staff-impersonation-audit.md) | Impersonation, audit log, support read grants, JIT elevation. |
| Auth | [rbac-authentication.md](rbac-authentication.md) | Cookie + JWT login/logout/refresh for both realms (org + staff), server-side sessions, password hashing; replaces the phase-5 stub. |

**Authentication is foundational, not last.** The org-user realm can land alongside phase 5
(replacing its stub); the staff realm depends on phase 6 (`is_staff`, the `/internal` tree);
mandatory staff 2FA ties into phase 7. It is listed after the others only because the
org-scoped model is shippable behind the stub without it.

---

## 9. Open questions (resolve before the relevant phase)

- **Roles: global catalog vs per-org custom roles.** This design treats `roles` as a
  global, system-seeded catalog (admin/editor/viewer/billing). If orgs need to define their
  own roles, `roles` grows a nullable `org_id` (null = system role) and resolution filters by
  it. Decide before phase 3.
- **Org context source** — URL segment `/orgs/:orgId` is assumed. A header
  (`X-Org-Id`) is the alternative; pick one in phase 5 and apply it consistently.
- **Cache backend** — request-scoped memo is enough for V1. A cross-request cache (in-process
  LRU or Redis) with explicit invalidation is a later optimization, gated on measured JOIN
  cost.
- **2FA / JIT mechanics** — phase 7 records the requirement; the concrete TOTP/elevation
  implementation is its own follow-up once a real auth layer exists.
