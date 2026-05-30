# User Management Dashboard

## Goal

Build a frontend dashboard in `app/` for managing users against the existing
`/users` API (list, create, update, delete). The API slice is already complete;
this task is frontend-only.

## Scope

- **API client** (`app/src/lib/api.ts`) — typed `fetch` wrapper around the
  `/users` endpoints plus a UUID v7 generator (the API requires v7 ids for
  `PUT /users/:id`). Base URL comes from `VITE_API_URL`, defaulting to
  `http://localhost:7000`.
- **Pinia store** (`app/src/stores/users.ts`) — holds the user list, loading and
  error state, and actions: `fetchUsers`, `createUser`, `updateUser`,
  `deleteUser`.
- **Components** (`app/src/components/`):
  - `UserForm.vue` — create/edit form (email, name, password). Password is
    required on create, optional on edit.
  - `UserTable.vue` — table of users with edit/delete actions.
- **View** (`app/src/views/UsersView.vue`) — composes the table + form, wires
  store actions, shows loading/error/empty states.
- **Routing** — add a named `users` route as the index, render it through
  `<router-view>` in `App.vue`.

## API contract (existing)

| Method | Path | Body | Result |
|--------|------|------|--------|
| GET | `/users` | — | `User[]` |
| GET | `/users/:id` | — | `User` / 404 |
| PUT | `/users/:id` | `{ email, name, password }` | 201 created / 200 existing |
| PATCH | `/users/:id` | partial `{ email?, name?, password? }` | `User` / 404 |
| DELETE | `/users/:id` | — | 204 / 404 |

`User` = `{ id, email, name, createdAt, updatedAt }` (password never returned).
Creates use `PUT` with a client-generated UUID v7 (idempotency by HTTP method).

## Tests

Frontend uses vitest + happy-dom + `@testing-library/vue`.

- `app/src/lib/api.test.ts` — uuid v7 shape/version; fetch wrapper builds correct
  requests and parses responses (mocked `fetch`).
- `app/src/stores/users.test.ts` — store actions update state correctly with a
  mocked api module.
- `app/src/components/UserForm.test.ts` — emits submit payload, validates
  required fields, edit vs create mode.
- `app/src/views/UsersView.test.ts` — renders list, create/delete flow against a
  mocked store.

## Dependencies

None new — `@testing-library/vue`, `happy-dom`, and `vitest` are already in
`app/package.json`. UUID v7 is implemented inline to avoid a runtime dependency.
