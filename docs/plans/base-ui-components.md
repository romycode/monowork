# Base UI Components + Centralized CSS

## Goal

Introduce a small set of reusable base components and a central stylesheet so
the dashboard's styling is consistent and defined in one place, rather than
duplicated across feature components.

## Scope

- **`app/src/assets/main.css`** — design tokens as CSS custom properties
  (colors, radii, font) on `:root`, plus the global `body`/font reset moved out
  of `App.vue`. Imported once in `main.ts`.
- **`app/src/components/base/`**:
  - `BaseButton.vue` — `variant` (primary | secondary | outline | danger) and
    `size` (medium | small) props; centralizes all button styling.
  - `BaseInput.vue` — labeled text input with `v-model`; centralizes field +
    label styling.
  - `BaseCard.vue` — surface container (border, radius, surface bg) with an
    optional `padded` prop.
- **Refactor** `UserForm.vue`, `UserTable.vue`, `UsersView.vue` to compose the
  base components and consume the design tokens. Feature components keep only
  their own layout-specific CSS.

## Notes

- No new dependencies. Uses `defineModel` (Vue 3.5) for two-way binding.
- Behaviour and DOM text/roles are unchanged, so the existing 25 tests continue
  to pass without modification.
