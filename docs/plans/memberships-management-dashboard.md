# Memberships Management Dashboard

## Goal

Build a per-organization members page: invite users, view membership status
(invited / active / suspended), and remove members. Requires Phase 2 of the RBAC
backend ([rbac-memberships.md](rbac-memberships.md)).

## Scope

### API client (`app/src/lib/api.ts`)

Add `Membership` type and `membershipsApi`:

```ts
export type MembershipStatus = 'invited' | 'active' | 'suspended'

export type Membership = {
  id: string
  userId: string
  orgId: string
  status: MembershipStatus
  joinedAt: string | null
  invitedBy: string | null
  createdAt: string
  updatedAt: string
}

export const membershipsApi = {
  list: (orgId: string) => request<Membership[]>(`/orgs/${orgId}/members`),
  invite: (orgId: string, userId: string) =>
    request<Membership>(`/orgs/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  updateStatus: (orgId: string, membershipId: string, status: MembershipStatus) =>
    request<Membership>(`/orgs/${orgId}/members/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  remove: (orgId: string, membershipId: string) =>
    request<void>(`/orgs/${orgId}/members/${membershipId}`, { method: 'DELETE' }),
}
```

### Pinia store (`app/src/stores/memberships.ts`)

State: `memberships: Membership[]`, `loading`, `error`, `currentOrgId: string | null`.
Actions: `fetchMembers(orgId)`, `inviteMember(orgId, userId)`,
`updateStatus(orgId, membershipId, status)`, `removeMember(orgId, membershipId)`.

### Components

- **`MemberInviteForm.vue`** — single user-id / email field to invite a user;
  emits `invite` with `{ userId }`.
- **`MemberTable.vue`** — table of memberships: user id / email, status badge,
  status toggle (active ↔ suspended), remove action.

### View

- **`app/src/views/OrgMembersView.vue`** — reads `:orgId` from route params,
  fetches members on mount, composes table + invite form, shows loading/error/empty
  states.

### Routing

Add route `/orgs/:orgId/members` with name `org-members`. Sidebar link in
`AppSidebar` becomes context-aware (shows "Members" when inside an org context).

## API contract (from Phase 2)

| Method | Path | Body | Result |
|--------|------|------|--------|
| GET | `/orgs/:orgId/members` | — | `Membership[]` |
| POST | `/orgs/:orgId/members` | `{ userId }` | `Membership` 201 |
| PATCH | `/orgs/:orgId/members/:id` | `{ status }` | `Membership` |
| DELETE | `/orgs/:orgId/members/:id` | — | 204 / 404 |

## Tests

- `app/src/stores/memberships.test.ts` — actions update state; `fetchMembers`
  sets `currentOrgId`.
- `app/src/components/MemberInviteForm.test.ts` — validates non-empty field, emits
  payload.
- `app/src/components/MemberTable.test.ts` — status badge renders correctly,
  toggle and remove fire correct events.
- `app/src/views/OrgMembersView.test.ts` — fetches on mount with route orgId,
  renders table, invite + remove flow.

## Dependencies

- Phase 2 backend ([rbac-memberships.md](rbac-memberships.md)).
- App layout ([app-layout-navigation.md](app-layout-navigation.md)) for the org
  context-aware sidebar.
- Organization management dashboard ([org-management-dashboard.md](org-management-dashboard.md))
  to navigate from an org row to its members page.
