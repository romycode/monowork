import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '~/lib/api'
import type { User } from '~/lib/api'

const list = vi.fn()
const create = vi.fn()
const update = vi.fn()
const remove = vi.fn()

vi.mock('~/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/api')>()
  return {
    ...actual,
    usersApi: {
      list: (...args: unknown[]) => list(...args),
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
      remove: (...args: unknown[]) => remove(...args),
    },
  }
})

// Imported after the mock is registered.
const { useUsersStore } = await import('~/stores/users')

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    email: 'alice@example.com',
    name: 'Alice',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('fetchUsers', () => {
  it('loads users and clears loading', async () => {
    const users = [buildUser()]
    list.mockResolvedValue(users)
    const store = useUsersStore()

    await store.fetchUsers()

    expect(store.users).toEqual(users)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('captures the error message on failure', async () => {
    list.mockRejectedValue(new ApiError(500, 'boom'))
    const store = useUsersStore()

    await store.fetchUsers()

    expect(store.users).toEqual([])
    expect(store.error).toBe('boom')
    expect(store.loading).toBe(false)
  })
})

describe('createUser', () => {
  it('appends the created user and returns true', async () => {
    const user = buildUser()
    create.mockResolvedValue(user)
    const store = useUsersStore()

    const ok = await store.createUser({ email: user.email, name: user.name, password: 'password1' })

    expect(ok).toBe(true)
    expect(store.users).toEqual([user])
  })

  it('returns false and sets error on failure', async () => {
    create.mockRejectedValue(new ApiError(409, 'email taken'))
    const store = useUsersStore()

    const ok = await store.createUser({ email: 'a@b.com', name: 'A', password: 'password1' })

    expect(ok).toBe(false)
    expect(store.error).toBe('email taken')
    expect(store.users).toEqual([])
  })
})

describe('updateUser', () => {
  it('replaces the matching user in place', async () => {
    const user = buildUser()
    list.mockResolvedValue([user])
    const store = useUsersStore()
    await store.fetchUsers()

    update.mockResolvedValue(buildUser({ name: 'Alicia' }))
    const ok = await store.updateUser(user.id, { name: 'Alicia' })

    expect(ok).toBe(true)
    expect(store.users[0]!.name).toBe('Alicia')
  })
})

describe('deleteUser', () => {
  it('removes the user from the list', async () => {
    const user = buildUser()
    list.mockResolvedValue([user])
    const store = useUsersStore()
    await store.fetchUsers()

    remove.mockResolvedValue(undefined)
    const ok = await store.deleteUser(user.id)

    expect(ok).toBe(true)
    expect(store.users).toEqual([])
  })
})
