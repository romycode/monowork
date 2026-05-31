# RBAC — Authentication (cookie + JWT)

## Goal

Replace the phase-5 `currentUser` stub with real authentication: a signed **JWT carried in an
HttpOnly cookie**, with **two separate session realms** — organization users and platform
staff — backed by a server-side `sessions` table for revocation. Ship login / logout /
refresh for both realms plus password hashing. This layer only *produces*
`request.currentUser = { id, isStaff }`; it changes **no** authorization (`can()`) code.

## Two realms (design §7)

| Realm | Cookie | Path | Login | Lifetime |
|-------|--------|------|-------|----------|
| Organization users (the `app/` client) | `__Host-session` | `/` | `POST /auth/login` | normal |
| Platform staff (internal API) | `__Host-staff` | `/internal` | `POST /internal/auth/login` (2FA-gated) | shorter |

Separate cookies + path scoping mean the browser only sends the staff cookie to `/internal/*`,
and an org-user session can never authenticate an internal call (or vice-versa).

## Scope

### Dependencies (add via `just shell` → `pnpm --filter @monowork/api add …`, then `just install`)
- `@fastify/cookie` — cookie parsing/serialisation.
- `@fastify/jwt` (or `jose`) — sign/verify access tokens.
- `argon2` — password hashing.

### `api/src/env.ts` (extend)
- `AUTH_JWT_SECRET` (required, ≥32 chars), `AUTH_ACCESS_TTL` (default `'15m'`),
  `AUTH_REFRESH_TTL` (default `'30d'`), `AUTH_STAFF_ACCESS_TTL` (default `'10m'`),
  `COOKIE_SECURE` (default true; false in dev). Validated in the Zod schema as usual.

### `api/src/users/users.db.ts` (extend)
- Rename `password` → `password_hash` (already flagged in design §7). Migration renames the
  column. Add nullable `totp_secret` placeholder for staff 2FA (enrollment mechanics → phase 7).

### New: `api/src/auth/password.ts`
- `hashPassword(plain): Promise<string>` and `verifyPassword(hash, plain): Promise<boolean>`
  wrapping argon2id. The only place argon2 is imported.

### New: `api/src/auth/jwt.ts`
- `signAccess(claims)` / `verifyAccess(token)`. Claims: `sub` (user id), `isStaff`, `realm`
  (`'org' | 'staff'`), `sid` (session id), `iat`, `exp`. Realm + path scoping are both checked
  so a token minted for one realm is rejected on the other surface.

### New: `api/src/sessions/sessions.db.ts` + repo/service
- `session_realm` `pgEnum(['org', 'staff'])`.
- `sessions` table: `id`, `userId` → users, `realm`, `refreshTokenHash` (argon2/sha256 of the
  refresh token — never the raw token), `userAgent`, `ip`, `createdAt`, `expiresAt`,
  `revokedAt` nullable.
- Repo: `create`, `findByRefreshHash`, `rotate` (revoke old + issue new), `revoke`,
  `revokeAllForUser`. Revocation is what makes logout and "sign out everywhere" real.

### New: `api/src/auth/auth.routes.ts` (organization realm, `/auth/*`)
- `POST /auth/login` — body `{ email, password }`; verify against `password_hash`; on success
  create a session, set `__Host-session` access cookie + issue refresh, return `currentUser`.
  Wrong credentials → **401** (generic message, no user-enumeration).
- `POST /auth/refresh` — read refresh cookie/token, `rotate` the session, reset cookies.
- `POST /auth/logout` — `revoke` the session, clear the cookie. 204.
- `GET /auth/me` — return `currentUser` (401 if unauthenticated).

### New: `api/src/internal/auth.routes.ts` (staff realm, `/internal/auth/*`)
- Mirror of the above but realm `staff`, cookie `__Host-staff` (path `/internal`). Login
  additionally requires `users.is_staff` and passes through the **2FA gate** (a hook here;
  TOTP verification lands in phase 7). Refusal for a non-staff user is a generic 401.

### New: `api/src/auth/authenticate.ts` (replaces the phase-5 stub)
- `onRequest` plugin: pick the cookie for the surface (`/internal/*` → `__Host-staff`,
  else `__Host-session`), `verifyAccess`, confirm `realm` matches the surface, decorate
  `request.currentUser = { id, isStaff }`. No/invalid token → leave `currentUser` undefined;
  the `requirePermission` / `requireStaffPermission` guards then fail closed (401).
- Register in `app.ts` **before** the routers; retire the dev-header stub (keep it available
  only under `NODE_ENV=test` for the resolution tests, or replace those with cookie fixtures).

### CSRF (in scope — cookies are used)
- `SameSite=Lax` blocks the common cross-site cases. For state-changing requests, also require
  a non-simple header (e.g. `X-Requested-With`) or a double-submit token; document the chosen
  mechanism and apply it to all non-GET routes. CORS (`credentials: true`) is already wired in
  `app.ts`; tighten `CORS_ORIGIN` away from `*` once cookies carry auth.

### Tests
- Unit: `password.ts` (hash≠plain, verify true/false), `jwt.ts` (sign/verify, realm mismatch
  rejected, expiry).
- Acceptance (`app.inject`, mocked repos): login success sets cookie + 200; bad password 401;
  `/auth/me` 401 without cookie, 200 with; refresh rotates and old refresh is rejected; logout
  revokes; **realm isolation** — an org cookie on `/internal/*` → 401, a staff cookie on
  `/orgs/*` → 401.
- `sessions` repo integration test (rotate revokes the prior row).

### Database & Bruno
- `just db-generate` / `just db-migrate` (column rename + `sessions` table + enum).
- Bruno: `bruno/auth/` (login, refresh, logout, me) and `bruno/internal/auth/`.

## Out of scope (follow-ups)
- **2FA / TOTP enrollment + verification** — this plan leaves the staff-login gate + the
  `totp_secret` column; the mechanics land with [[rbac-staff-impersonation-audit]] (phase 7).
- SSO / OAuth providers, email verification, password reset / forgot-password flows.
- Account lockout / brute-force throttling beyond the existing global rate-limit.
- A cross-request permission cache (design §4.3) — unrelated to auth.

## Dependencies
- **Org realm:** existing `users` slice; pairs with [[rbac-authz-resolution]] (replaces its
  current-user stub — can land alongside phase 5).
- **Staff realm:** [[rbac-staff-platform]] (`is_staff`, the `/internal` tree). Mandatory staff
  2FA ties into [[rbac-staff-impersonation-audit]].
