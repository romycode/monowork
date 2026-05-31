# App Layout & Navigation

## Goal

Introduce a persistent app shell — sidebar navigation + top header — so that the
growing set of views (users, orgs, members, roles) can be reached without editing
the root template each time. Replaces the current unstyled `<router-view>` in
`App.vue`.

## Scope

### Layout components

- **`app/src/components/AppSidebar.vue`** — vertical nav with named `<RouterLink>`
  entries. Initial links: Users (`/`), Organizations (`/orgs`). Renders active
  state via router-link's `active-class`. Accepts no props; reads route state
  internally.
- **`app/src/components/AppHeader.vue`** — top bar showing the current user's
  email (from `useAuthStore().session`) and a Logout button that calls
  `authStore.logout()` then redirects to `/login`.

### App.vue update

Replace the current bare layout with:
```html
<template>
  <div v-if="authStore.session" class="app-shell">
    <AppSidebar />
    <div class="app-shell__content">
      <AppHeader />
      <main class="app-shell__main">
        <router-view />
      </main>
    </div>
  </div>
  <router-view v-else />   <!-- login view, no shell -->
</template>
```

The `v-else` branch renders the login view without chrome so it has a full-page
look.

### CSS

Scoped styles in `App.vue` (or a dedicated `app-shell.css` imported there):
- `.app-shell` — CSS grid: fixed-width sidebar column + fluid content column.
- `.app-shell__content` — flex column: header + main.
- `.app-shell__main` — `overflow-y: auto; flex: 1`.
- Sidebar and header use CSS variables already defined in `base.css` so they
  inherit the theme.

### Router update

No structural changes to routes — the shell sits outside `<router-view>` and wraps
it conditionally. Future nested layouts (e.g. per-org sub-nav) can use named views
or child routes at that point.

## Tests

- `app/src/components/AppSidebar.test.ts` — renders expected nav links, applies
  active class to the current route.
- `app/src/components/AppHeader.test.ts` — shows user email, logout button calls
  `authStore.logout` and redirects.

## Dependencies

- Authentication frontend ([authentication-frontend.md](authentication-frontend.md))
  — `useAuthStore` must exist (can use a stubbed session for early development).
- Organization management dashboard ([org-management-dashboard.md](org-management-dashboard.md))
  — adds the `/orgs` nav entry once that route exists.
