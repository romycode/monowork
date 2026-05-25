import type {User, UsersRepository} from '#/users/users-repository'
import {createUsersService} from '#/users/users-service'
import assert from 'node:assert/strict'
import {describe, it} from 'node:test'

const mockUser: User = {
  id: crypto.randomUUID(),
  email: 'alice@example.com',
  name: 'Alice',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
}

function mockRepo(overrides: Partial<UsersRepository> = {}): UsersRepository {
  const notImplemented = (): never => {
    throw new Error('Not implemented')
  }
  return {
    findAll: notImplemented,
    findById: notImplemented,
    upsert: notImplemented,
    update: notImplemented,
    remove: notImplemented,
    ...overrides,
  }
}

describe('UsersService.list', () => {
  it('returns all users from the repository', async () => {
    const service = createUsersService(mockRepo({ findAll: async () => [mockUser] }))
    assert.deepEqual(await service.list(), [mockUser])
  })
})

describe('UsersService.get', () => {
  it('returns the user when found', async () => {
    const service = createUsersService(mockRepo({ findById: async () => mockUser }))
    assert.deepEqual(await service.get(mockUser.id), mockUser)
  })

  it('returns undefined when not found', async () => {
    const service = createUsersService(mockRepo({ findById: async () => undefined }))
    assert.equal(await service.get(mockUser.id), undefined)
  })
})

describe('UsersService.upsert', () => {
  const input = { email: mockUser.email, name: mockUser.name, password: 'password123' }

  it('returns the user with created=true on first call', async () => {
    const service = createUsersService(
      mockRepo({ upsert: async () => ({ user: mockUser, created: true }) }),
    )
    const result = await service.upsert(mockUser.id, input)
    assert.deepEqual(result, { user: mockUser, created: true })
  })

  it('returns the existing user with created=false on replay', async () => {
    const service = createUsersService(
      mockRepo({ upsert: async () => ({ user: mockUser, created: false }) }),
    )
    const result = await service.upsert(mockUser.id, input)
    assert.deepEqual(result, { user: mockUser, created: false })
  })
})

describe('UsersService.update', () => {
  it('returns the updated user', async () => {
    const updated = { ...mockUser, name: 'Alicia' }
    const service = createUsersService(mockRepo({ update: async () => updated }))
    assert.deepEqual(await service.update(mockUser.id, { name: 'Alicia' }), updated)
  })

  it('returns undefined when the user does not exist', async () => {
    const service = createUsersService(mockRepo({ update: async () => undefined }))
    assert.equal(await service.update(mockUser.id, { name: 'Nobody' }), undefined)
  })
})

describe('UsersService.remove', () => {
  it('returns the removed user', async () => {
    const service = createUsersService(mockRepo({ remove: async () => mockUser }))
    assert.deepEqual(await service.remove(mockUser.id), mockUser)
  })

  it('returns undefined when the user does not exist', async () => {
    const service = createUsersService(mockRepo({ remove: async () => undefined }))
    assert.equal(await service.remove(mockUser.id), undefined)
  })
})
