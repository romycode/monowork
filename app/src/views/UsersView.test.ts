import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { fireEvent, render } from '@testing-library/vue'
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

const UsersView = (await import('~/views/UsersView.vue')).default

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

function renderView() {
  return render(UsersView, { global: { plugins: [createPinia()] } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UsersView', () => {
  it('shows the empty state when there are no users', async () => {
    list.mockResolvedValue([])
    const { findByText } = renderView()

    await findByText('No users yet. Add one to get started.')
  })

  it('renders fetched users in the table', async () => {
    list.mockResolvedValue([buildUser({ name: 'Grace' })])
    const { findByText } = renderView()

    await findByText('Grace')
  })

  it('shows the error banner when loading fails', async () => {
    list.mockRejectedValue(new Error('network down'))
    const { findByRole } = renderView()

    const alert = await findByRole('alert')
    expect(alert.textContent).toContain('network down')
  })

  it('deletes a user after confirmation', async () => {
    list.mockResolvedValue([buildUser({ name: 'Grace' })])
    remove.mockResolvedValue(undefined)
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )

    const { findByText, getByText } = renderView()
    await findByText('Grace')

    await fireEvent.click(getByText('Delete'))

    expect(remove).toHaveBeenCalledWith('01900000-0000-7000-8000-000000000001')
    await findByText('No users yet. Add one to get started.')
  })

  it('does not delete when confirmation is declined', async () => {
    list.mockResolvedValue([buildUser({ name: 'Grace' })])
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    )

    const { findByText, getByText } = renderView()
    await findByText('Grace')

    await fireEvent.click(getByText('Delete'))

    expect(remove).not.toHaveBeenCalled()
  })

  it('creates a user from the form', async () => {
    list.mockResolvedValue([])
    create.mockResolvedValue(buildUser({ name: 'Bob', email: 'bob@example.com' }))

    const { getByPlaceholderText, getByText, findByText } = renderView()
    await findByText('No users yet. Add one to get started.')

    await fireEvent.update(getByPlaceholderText('Ada Lovelace'), 'Bob')
    await fireEvent.update(getByPlaceholderText('ada@example.com'), 'bob@example.com')
    await fireEvent.update(getByPlaceholderText('At least 8 characters'), 'password1')
    await fireEvent.click(getByText('Create user'))

    expect(create).toHaveBeenCalledWith({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'password1',
    })
    await findByText('Bob')
  })
})
