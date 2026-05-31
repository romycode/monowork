# RBAC Phase 1 — Organizations

## Goal

Introduce the tenant root: an `organizations` feature slice. An organization is the scope
every membership, role assignment, and permission check hangs off. Mirror the existing
`users` slice exactly (domain split, soft delete, ports & adapters).

## Scope

### New: `api/src/organizations/organizations.ts`
Domain type — pure TS, no Drizzle:
```ts
export type Organization = {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}
```

### New: `api/src/organizations/organizations.db.ts`
Drizzle table `organizations`:
- `id` uuid pk `defaultRandom()`
- `name` text not null
- `slug` text not null `unique()` — URL-safe identifier
- `createdAt` / `updatedAt` timestamps `defaultNow().notNull()`
- `deletedAt` timestamp nullable (soft delete)

### New: `api/src/organizations/organizations.repo.ts`
`OrganizationsRepository` port + `createOrganizationsRepository(db)`. Methods: `findAll`,
`findById`, `findBySlug`, `upsert`, `update`, `remove` (soft delete). `toOrganization` maps
the record and omits `deletedAt`. All reads filter `isNull(organizations.deletedAt)`.

### New: `api/src/organizations/organizations.service.ts`
`OrganizationsService` port + `organizationService(repo)`. Delegates to the repo; enforces
slug uniqueness at the service boundary (surface a conflict when `findBySlug` already
resolves to a different id).

### New: `api/src/organizations/organizations.routes.ts`
`organizationsRouter: FastifyPluginAsyncZod<{ organizationsService }>`. Zod schemas inline.
Endpoints follow the house HTTP semantics:
- `GET /orgs` — list
- `GET /orgs/:id` — read (404 if missing)
- `PUT /orgs/:id` — create-or-replace (201/200), client-provided UUID v7
- `PATCH /orgs/:id` — partial update (≥1 field)
- `DELETE /orgs/:id` — soft delete (204/404)

### Wiring: `api/src/app.ts`
Register with the `traced(...)` pattern used for users:
```ts
const orgsRepo = traced(createOrganizationsRepository(db), 'OrganizationsRepository')
const orgsService = traced(organizationService(orgsRepo), 'OrganizationsService')
void app.register(organizationsRouter, { organizationsService })
```

### Tests
- `organizations.service.test.ts` — unit, mocks repo (slug-conflict logic, not-found paths).
- `organizations.routes.test.ts` — acceptance via `app.inject()` (status codes, validation).
- `organizations.repo.test.ts` — integration against the real DB (soft delete hides rows).
- `organizations.test-helpers.ts` — `buildOrganization()` + `mockRepo()`.

### Database
- `just db-generate` then `just db-migrate`.

### Bruno
- `bruno/organizations/` — one `.bru` per endpoint.

## Out of scope
- Membership/roles (phases 2–4). No authorization on these routes yet — they are wired open
  until phase 5 adds the guard.

## Dependencies
- None. First RBAC slice. Pattern source: the `users` slice.
