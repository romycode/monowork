import { userService } from '#/users/users-service'
import { buildUser, mockRepo } from '#/users/users-test-helpers'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('UsersService.list', () => {
  it('returns all users from the repository', async () => {
    const user = buildUser()
    const service = userService(mockRepo({ findAll: async () => [user] }))
    assert.deepEqual(await service.list(), [user])
  })
})

describe('UsersService.get', () => {
  it('returns the user when found', async () => {
    const user = buildUser()
    const service = userService(mockRepo({ findById: async () => user }))
    assert.deepEqual(await service.get(user.id), user)
  })

  it('returns undefined when not found', async () => {
    const service = userService(mockRepo({ findById: async () => undefined }))
    assert.equal(await service.get('non-existent'), undefined)
  })
})

describe('UsersService.upsert', () => {
  const input = { email: 'alice@example.com', name: 'Alice', password: 'password123' }

  it('returns the user with created=true on first call', async () => {
    const user = buildUser()
    const service = userService(mockRepo({ upsert: async () => ({ user, created: true }) }))
    assert.deepEqual(await service.upsert(user.id, input), { user, created: true })
  })

  it('returns the existing user with created=false on replay', async () => {
    const user = buildUser()
    const service = userService(mockRepo({ upsert: async () => ({ user, created: false }) }))
    assert.deepEqual(await service.upsert(user.id, input), { user, created: false })
  })
})

describe('UsersService.update', () => {
  it('returns the updated user', async () => {
    const user = buildUser()
    const updated = buildUser({ name: 'Alicia' })
    const service = userService(mockRepo({ update: async () => updated }))
    assert.deepEqual(await service.update(user.id, { name: 'Alicia' }), updated)
  })

  it('returns undefined when the user does not exist', async () => {
    const service = userService(mockRepo({ update: async () => undefined }))
    assert.equal(await service.update('non-existent', { name: 'Nobody' }), undefined)
  })
})

describe('UsersService.remove', () => {
  it('returns the removed user', async () => {
    const user = buildUser()
    const service = userService(mockRepo({ remove: async () => user }))
    assert.deepEqual(await service.remove(user.id), user)
  })

  it('returns undefined when the user does not exist', async () => {
    const service = userService(mockRepo({ remove: async () => undefined }))
    assert.equal(await service.remove('non-existent'), undefined)
  })
})
