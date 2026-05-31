# Organization Management Dashboard

## Goal

Build a frontend dashboard in `app/` for managing organizations against the
`/orgs` API (list, create, update, delete). Mirrors the structure of the user
management dashboard. Requires Phase 1 of the RBAC backend
([rbac-organizations.md](rbac-organizations.md)) to be complete.

## Scope

- **API client** (`app/src/lib/api.ts`) — extend with `Organization` and
  `OrganizationInput` types and an `orgsApi` object:
  - `list` → `GET /orgs`
  - `create(input)` → `PUT /orgs/:id` with a client-generated UUID v7
  - `update(id, input)` → `PATCH /orgs/:id`
  - `remove(id)` → `DELETE /orgs/:id`
- **Pinia store** (`app/src/stores/orgs.ts`) — holds org list, loading and error
  state, and actions: `fetchOrgs`, `createOrg`, `updateOrg`, `deleteOrg`.
- **Components** (`app/src/components/`):
  - `OrgForm.vue` — create/edit form (`name`, `slug`). Slug is auto-derived from
    name on create but editable; on edit both fields are independently editable.
  - `OrgTable.vue` — table of orgs with edit/delete actions.
- **View** (`app/src/views/OrgsView.vue`) — composes table + form, wires store
  actions, shows loading/error/empty states. Same layout class structure as
  `UsersView.vue`.
- **Routing** — add a named `orgs` route at `/orgs` to `app/src/router/index.ts`.

## API contract (from Phase 1)

| Method | Path | Body | Result |
|--------|------|------|--------|
| GET | `/orgs` | — | `Organization[]` |
| GET | `/orgs/:id` | — | `Organization` / 404 |
| PUT | `/orgs/:id` | `{ name, slug }` | 201 created / 200 existing |
| PATCH | `/orgs/:id` | partial `{ name?, slug? }` | `Organization` / 404 |
| DELETE | `/orgs/:id` | — | 204 / 404 |

`Organization` = `{ id, name, slug, createdAt, updatedAt }`.

## Tests

- `app/src/lib/api.test.ts` — add `orgsApi` cases (list, create with uuid v7,
  update, remove; fetch mocked).
- `app/src/stores/orgs.test.ts` — store actions update state correctly with a
  mocked api module.
- `app/src/components/OrgForm.test.ts` — emits submit payload, validates required
  fields, create vs edit mode, slug auto-derive.
- `app/src/views/OrgsView.test.ts` — renders list, create/delete flow against a
  mocked store.

## Dependencies

- Phase 1 backend ([rbac-organizations.md](rbac-organizations.md)) — needs running
  API endpoints.
- No new npm deps — same stack as users dashboard.
