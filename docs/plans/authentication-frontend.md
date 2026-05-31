# Authentication — Frontend

## Goal

Add a login/logout flow to the app so every page beyond `/login` is protected.
Pairs with the Authentication backend plan ([rbac-authentication.md](rbac-authentication.md)).
Until that plan ships, the store can stub the session to keep other frontend work
unblocked.

## Scope

### Auth API (`app/src/lib/auth.ts`)

Typed wrappers around the auth endpoints. The `request` helper from `api.ts` is
reused (it already sends `Content-Type: application/json` and throws `ApiError`):

```ts
export type Session = { userId: string; email: string; orgId?: string }

export const authApi = {
  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<Session>('/auth/me'),
}
```

Cookie-based session — no token storage in JS. The `request` helper in `api.ts`
must be updated to include `credentials: 'include'` on every call.

### Auth store (`app/src/stores/auth.ts`)

Pinia store with:
- `session: Session | null` — current authenticated user
- `loading: boolean`, `error: string | null`
- `login(email, password)` — calls `authApi.login`, sets `session`
- `logout()` — calls `authApi.logout`, clears `session`
- `init()` — calls `authApi.me` on app boot; silently sets session or leaves null

### Components

- `app/src/components/LoginForm.vue` — email + password fields, submit button,
  inline error. Emits `submit` with `{ email, password }` payload.

### View

- `app/src/views/LoginView.vue` — renders `LoginForm`, calls store on submit,
  redirects to `/` on success.

### Router guard

In `app/src/router/index.ts`, add a `beforeEach` guard:
- Public routes: `login` only.
- All others require `authStore.session != null`.
- If no session and not on login, redirect to `/login`.

Boot sequence: `main.ts` calls `authStore.init()` then `app.mount()`.

## Tests

- `app/src/lib/auth.test.ts` — `authApi` builds correct requests (mocked fetch);
  `credentials: 'include'` is set.
- `app/src/stores/auth.test.ts` — `login` sets session, `logout` clears it,
  `init` sets session from `me` response, init failure leaves session null.
- `app/src/components/LoginForm.test.ts` — required field validation, emits payload
  on submit, shows error prop.
- `app/src/views/LoginView.test.ts` — form submit triggers store, redirects on
  success, shows error on failure.

## Notes on unblocking other frontend work

Before the backend auth endpoints exist, the auth store can export a small
`stubSession()` helper (dev-only, behind `import.meta.env.DEV`) so other views can
render without hitting a redirect loop.

## Dependencies

- Backend auth plan ([rbac-authentication.md](rbac-authentication.md)) for the
  real endpoints; stub session unblocks frontend work in the meantime.
