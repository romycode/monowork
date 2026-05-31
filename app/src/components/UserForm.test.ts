import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import UserForm from '~/components/UserForm.vue'
import type { User } from '~/lib/api'

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

describe('UserForm — create mode', () => {
  it('emits submit with the entered fields', async () => {
    const { getByPlaceholderText, getByText, emitted } = render(UserForm)

    await fireEvent.update(getByPlaceholderText('Ada Lovelace'), 'Bob')
    await fireEvent.update(getByPlaceholderText('ada@example.com'), 'bob@example.com')
    await fireEvent.update(getByPlaceholderText('At least 8 characters'), 'password1')
    await fireEvent.click(getByText('Create user'))

    expect(emitted().submit).toEqual([
      [{ name: 'Bob', email: 'bob@example.com', password: 'password1' }],
    ])
  })

  it('does not emit submit when the password is too short', async () => {
    const { getByPlaceholderText, getByText, emitted } = render(UserForm)

    await fireEvent.update(getByPlaceholderText('Ada Lovelace'), 'Bob')
    await fireEvent.update(getByPlaceholderText('ada@example.com'), 'bob@example.com')
    await fireEvent.update(getByPlaceholderText('At least 8 characters'), 'short')
    await fireEvent.click(getByText('Create user'))

    expect(emitted().submit).toBeUndefined()
  })
})

describe('UserForm — edit mode', () => {
  it('prefills name and email and allows submitting without a password', async () => {
    const { getByDisplayValue, getByText, emitted } = render(UserForm, {
      props: { editing: buildUser() },
    })

    getByDisplayValue('Alice')
    getByDisplayValue('alice@example.com')

    await fireEvent.click(getByText('Save changes'))

    expect(emitted().submit).toEqual([
      [{ name: 'Alice', email: 'alice@example.com', password: '' }],
    ])
  })

  it('emits cancel from the cancel button', async () => {
    const { getByText, emitted } = render(UserForm, { props: { editing: buildUser() } })

    await fireEvent.click(getByText('Cancel'))

    expect(emitted().cancel).toHaveLength(1)
  })
})
