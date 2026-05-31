# Roles & Permissions Management Dashboard

## Goal

Build a roles catalog page where platform admins can create roles, view their
permission set, and assign/revoke permissions. Requires Phase 3 of the RBAC
backend ([rbac-roles-permissions.md](rbac-roles-permissions.md)).

## Scope

### API client (`app/src/lib/api.ts`)

Add types and API objects:

```ts
export type Role = { id: string; name: string; description: string; createdAt: string; updatedAt: string }
export type Permission = { id: string; name: string; description: string; createdAt: string }

export const rolesApi = {
  list: () => request<Role[]>('/roles'),
  create: (input: { name: string; description: string }) => {
    const id = uuidv7()
    return request<Role>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },
  update: (id: string, input: Partial<{ name: string; description: string }>) =>
    request<Role>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/roles/${id}`, { method: 'DELETE' }),
  getPermissions: (roleId: string) => request<Permission[]>(`/roles/${roleId}/permissions`),
  addPermission: (roleId: string, permissionId: string) =>
    request<void>(`/roles/${roleId}/permissions/${permissionId}`, { method: 'PUT' }),
  removePermission: (roleId: string, permissionId: string) =>
    request<void>(`/roles/${roleId}/permissions/${permissionId}`, { method: 'DELETE' }),
}

export const permissionsApi = {
  list: () => request<Permission[]>('/permissions'),
}
```

### Pinia store (`app/src/stores/roles.ts`)

State: `roles: Role[]`, `permissions: Permission[]` (full catalog),
`selectedRolePermissions: Permission[]`, `loading`, `error`.
Actions: `fetchRoles`, `fetchPermissions`, `createRole`, `updateRole`,
`deleteRole`, `fetchRolePermissions(roleId)`, `assignPermission(roleId, permId)`,
`revokePermission(roleId, permId)`.

### Components

- **`RoleForm.vue`** — name + description fields; create/edit mode.
- **`RoleTable.vue`** — list of roles with edit/delete actions and an "Manage
  permissions" button that opens the permission panel.
- **`RolePermissionsPanel.vue`** — split-panel: left = permissions assigned to the
  selected role (with revoke button); right = available permissions catalog
  (with assign button). Rendered inside `RolesView` below the table when a role
  is selected.

### View

- **`app/src/views/RolesView.vue`** — fetches roles + permission catalog on mount.
  Composes `RoleTable`, `RoleForm`, and `RolePermissionsPanel`. Selecting a role
  row opens the permissions panel and fetches that role's current permissions.

### Routing

Add route `/roles` with name `roles`. Add "Roles" entry to `AppSidebar`.

## API contract (from Phase 3)

| Method | Path | Body | Result |
|--------|------|------|--------|
| GET | `/roles` | — | `Role[]` |
| PUT | `/roles/:id` | `{ name, description }` | 201 / 200 |
| PATCH | `/roles/:id` | partial | `Role` |
| DELETE | `/roles/:id` | — | 204 |
| GET | `/permissions` | — | `Permission[]` |
| GET | `/roles/:id/permissions` | — | `Permission[]` |
| PUT | `/roles/:id/permissions/:permId` | — | 204 |
| DELETE | `/roles/:id/permissions/:permId` | — | 204 |

## Tests

- `app/src/stores/roles.test.ts` — CRUD actions update state; assign/revoke
  update `selectedRolePermissions`.
- `app/src/components/RoleForm.test.ts` — required field validation, create vs
  edit mode.
- `app/src/components/RoleTable.test.ts` — renders rows, fires edit/delete/select
  events.
- `app/src/components/RolePermissionsPanel.test.ts` — assigned + available lists
  render correctly; assign/revoke emit correct events.
- `app/src/views/RolesView.test.ts` — on mount fetches roles + permissions;
  selecting a role shows panel.

## Dependencies

- Phase 3 backend ([rbac-roles-permissions.md](rbac-roles-permissions.md)).
- App layout ([app-layout-navigation.md](app-layout-navigation.md)) for sidebar
  nav entry.
