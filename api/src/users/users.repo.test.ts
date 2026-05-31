import { db } from '#/db/index'
import { createUsersRepository } from '#/users/users.repo'
import { users } from '#/users/users.db'
import assert from 'node:assert/strict'
import { randomUUIDv7 } from 'node:crypto'
import { after, beforeEach, describe, it } from 'node:test'

const repo = createUsersRepository(db)

beforeEach(async () => {
  await db.delete(users)
})

after(async () => {
  await db.$client.end()
})

async function insertUser(overrides: Partial<{ email: string; name: string }> = {}) {
  const id = randomUUIDv7()
  const result = await repo.upsert(id, {
    email: overrides.email ?? `user-${id}@example.com`,
    name: overrides.name ?? 'Alice',
    password: 'password123',
  })
  if (!result) throw new Error('insertUser: upsert returned undefined')
  return result.user
}

describe('UsersRepository.findAll', () => {
  it('returns empty array when no users exist', async () => {
    assert.deepEqual(await repo.findAll(), [])
  })

  it('returns all users', async () => {
    const u1 = await insertUser()
    const u2 = await insertUser()
    const result = await repo.findAll()
    assert.equal(result.length, 2)
    assert.ok(result.some((u) => u.id === u1.id))
    assert.ok(result.some((u) => u.id === u2.id))
  })
})

describe('UsersRepository.findById', () => {
  it('returns the user when found', async () => {
    const user = await insertUser()
    assert.deepEqual(await repo.findById(user.id), user)
  })

  it('returns undefined when not found', async () => {
    assert.equal(await repo.findById(randomUUIDv7()), undefined)
  })
})

describe('UsersRepository.upsert', () => {
  it('creates a new user and returns created=true', async () => {
    const id = randomUUIDv7()
    const { user, created } = await repo.upsert(id, {
      email: 'alice@example.com',
      name: 'Alice',
      password: 'password123',
    })
    assert.equal(created, true)
    assert.equal(user.id, id)
    assert.equal(user.email, 'alice@example.com')
    assert.equal(user.name, 'Alice')
  })

  it('returns the existing user with created=false on replay', async () => {
    const id = randomUUIDv7()
    const input = { email: 'alice@example.com', name: 'Alice', password: 'password123' }
    await repo.upsert(id, input)
    const result = await repo.upsert(id, input)
    assert.ok(result)
    assert.equal(result.created, false)
    assert.equal(result.user.id, id)
  })

  it('returns undefined when the id belongs to a soft-deleted user', async () => {
    const user = await insertUser()
    await repo.remove(user.id)
    assert.equal(
      await repo.upsert(user.id, { email: user.email, name: user.name, password: 'password123' }),
      undefined,
    )
  })
})

describe('UsersRepository.update', () => {
  it('updates the specified fields and returns the updated user', async () => {
    const user = await insertUser()
    const result = await repo.update(user.id, { name: 'Alicia' })
    assert.ok(result)
    assert.equal(result.name, 'Alicia')
    assert.equal(result.email, user.email)
  })

  it('returns undefined when the user does not exist', async () => {
    assert.equal(await repo.update(randomUUIDv7(), { name: 'Nobody' }), undefined)
  })

  it('returns undefined when the user is soft-deleted', async () => {
    const user = await insertUser()
    await repo.remove(user.id)
    assert.equal(await repo.update(user.id, { name: 'Ghost' }), undefined)
  })
})

describe('UsersRepository.remove', () => {
  it('removes the user and returns them', async () => {
    const user = await insertUser()
    const removed = await repo.remove(user.id)
    assert.ok(removed)
    assert.equal(removed.id, user.id)
    assert.equal(await repo.findById(user.id), undefined)
  })

  it('returns undefined when the user does not exist', async () => {
    assert.equal(await repo.remove(randomUUIDv7()), undefined)
  })
})
