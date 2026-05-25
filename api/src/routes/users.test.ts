import type {User, UsersRepository} from '#/db/users-repository'
import {usersRoutes} from '#/routes/users'
import type {ZodTypeProvider} from '@fastify/type-provider-zod'
import {serializerCompiler, validatorCompiler} from '@fastify/type-provider-zod'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import {describe, it} from 'node:test'

const mockUser: User = {
  id: crypto.randomUUID(),
  email: 'alice@example.com',
  name: 'Alice',
  password: 'password123',
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
    create: notImplemented,
    update: notImplemented,
    remove: notImplemented,
    ...overrides,
  }
}

function buildApp(repo: UsersRepository) {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  void app.register(usersRoutes, { repo })
  return app
}

describe('GET /users', () => {
  it('returns 200 with empty list', async (t) => {
    const app = buildApp(mockRepo({ findAll: async () => [] }))
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/users' })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.json(), [])
  })

  it('returns 200 with users', async (t) => {
    const app = buildApp(mockRepo({ findAll: async () => [mockUser] }))
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/users' })
    assert.equal(res.statusCode, 200)
    const body = res.json<Array<{ email: string; name: string }>>()
    assert.equal(body.length, 1)
    assert.equal(body[0]?.email, mockUser.email)
    assert.equal(body[0]?.name, mockUser.name)
  })
})

describe('POST /users', () => {
  it('returns 201 with created user', async (t) => {
    const app = buildApp(mockRepo({ create: async (data) => ({ ...mockUser, ...data }) }))
    t.after(() => app.close())
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { email: 'bob@example.com', name: 'Bob', password: 'password123' },
    })
    assert.equal(res.statusCode, 201)
    const body = res.json<{ email: string; name: string; password?: string }>()
    assert.equal(body.email, 'bob@example.com')
    assert.equal(body.name, 'Bob')
    assert.equal(body.password, undefined)
  })

  it('returns 400 when password is too short', async (t) => {
    const app = buildApp(mockRepo())
    t.after(() => app.close())
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { email: 'bob@example.com', name: 'Bob', password: 'short' },
    })
    assert.equal(res.statusCode, 400)
  })

  it('returns 400 for invalid email', async (t) => {
    const app = buildApp(mockRepo())
    t.after(() => app.close())
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { email: 'not-an-email', name: 'Bob' },
    })
    assert.equal(res.statusCode, 400)
  })

  it('returns 400 when name is missing', async (t) => {
    const app = buildApp(mockRepo())
    t.after(() => app.close())
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { email: 'bob@example.com' },
    })
    assert.equal(res.statusCode, 400)
  })
})

describe('GET /users/:id', () => {
  it('returns 200 with the user', async (t) => {
    const app = buildApp(mockRepo({ findById: async () => mockUser }))
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/users/' + mockUser.id })
    assert.equal(res.statusCode, 200)
    const body = res.json<{ id: number; email: string }>()
    assert.equal(body.id, mockUser.id)
    assert.equal(body.email, mockUser.email)
  })

  it('returns 404 when user not found', async (t) => {
    const app = buildApp(mockRepo({ findById: async () => undefined }))
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/users/' + crypto.randomUUID() })
    assert.equal(res.statusCode, 404)
    assert.equal(res.json<{ message: string }>().message, 'User not found')
  })
})

describe('PUT /users/:id', () => {
  it('returns 200 with updated user', async (t) => {
    const updated = { ...mockUser, name: 'Alicia' }
    const app = buildApp(mockRepo({ update: async () => updated }))
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PUT',
      url: '/users/' + mockUser.id,
      payload: { name: 'Alicia', password: 'newpassword123' },
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json<{ name: string }>().name, 'Alicia')
  })

  it('returns 404 when user not found', async (t) => {
    const app = buildApp(mockRepo({ update: async () => undefined }))
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PUT',
      url: '/users/' + crypto.randomUUID(),
      payload: { name: 'Nobody' },
    })
    assert.equal(res.statusCode, 404)
  })

  it('returns 400 when no fields provided', async (t) => {
    const app = buildApp(mockRepo())
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PUT',
      url: '/users/' + crypto.randomUUID(),
      payload: {},
    })
    assert.equal(res.statusCode, 400)
  })
})

describe('DELETE /users/:id', () => {
  it('returns 204 after deleting user', async (t) => {
    const app = buildApp(mockRepo({ remove: async () => mockUser }))
    t.after(() => app.close())
    const res = await app.inject({ method: 'DELETE', url: '/users/' + mockUser.id })
    assert.equal(res.statusCode, 204)
  })

  it('returns 404 when user not found', async (t) => {
    const app = buildApp(mockRepo({ remove: async () => undefined }))
    t.after(() => app.close())
    const res = await app.inject({ method: 'DELETE', url: '/users/' + crypto.randomUUID() })
    assert.equal(res.statusCode, 404)
  })
})
