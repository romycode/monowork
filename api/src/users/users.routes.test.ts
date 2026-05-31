import type { UsersRepository } from '#/users/users.repo'
import { usersRouter } from '#/users/users.routes'
import { userService } from '#/users/users.service'
import { buildUser, mockRepo } from '#/users/users.test-helpers'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const mockUser = buildUser()

function buildApp(repoOverrides: Partial<UsersRepository> = {}) {
  const service = userService(mockRepo(repoOverrides))
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  void app.register(usersRouter, { usersService: service })
  return app
}

describe('GET /users', () => {
  it('returns 200 with empty list', async (t) => {
    const app = buildApp({ findAll: async () => [] })
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/users' })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.json(), [])
  })

  it('returns 200 with users', async (t) => {
    const app = buildApp({ findAll: async () => [mockUser] })
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/users' })
    assert.equal(res.statusCode, 200)
    const body = res.json<Array<{ email: string; name: string }>>()
    assert.equal(body.length, 1)
    assert.equal(body[0]?.email, mockUser.email)
    assert.equal(body[0]?.name, mockUser.name)
  })
})

describe('PUT /users/:id', () => {
  const payload = { email: 'alice@example.com', name: 'Alice', password: 'password123' }

  it('returns 201 when user is created', async (t) => {
    const app = buildApp({ upsert: async () => ({ user: mockUser, created: true }) })
    t.after(() => app.close())
    const res = await app.inject({ method: 'PUT', url: '/users/' + mockUser.id, payload })
    assert.equal(res.statusCode, 201)
    assert.equal(res.json<{ email: string }>().email, mockUser.email)
  })

  it('returns 200 when user already exists (idempotent replay)', async (t) => {
    const app = buildApp({ upsert: async () => ({ user: mockUser, created: false }) })
    t.after(() => app.close())
    const res = await app.inject({ method: 'PUT', url: '/users/' + mockUser.id, payload })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json<{ email: string }>().email, mockUser.email)
  })

  it('returns 400 when email is invalid', async (t) => {
    const app = buildApp()
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PUT',
      url: '/users/' + mockUser.id,
      payload: { ...payload, email: 'not-an-email' },
    })
    assert.equal(res.statusCode, 400)
  })

  it('returns 400 when password is too short', async (t) => {
    const app = buildApp()
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PUT',
      url: '/users/' + mockUser.id,
      payload: { ...payload, password: 'short' },
    })
    assert.equal(res.statusCode, 400)
  })

  it('returns 404 when user is soft-deleted', async (t) => {
    const app = buildApp({ upsert: async () => undefined })
    t.after(() => app.close())
    const res = await app.inject({ method: 'PUT', url: '/users/' + mockUser.id, payload })
    assert.equal(res.statusCode, 404)
    assert.equal(res.json<{ message: string }>().message, 'User not found')
  })

  it('returns 400 when a required field is missing', async (t) => {
    const app = buildApp()
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PUT',
      url: '/users/' + mockUser.id,
      payload: { email: 'alice@example.com', name: 'Alice' },
    })
    assert.equal(res.statusCode, 400)
  })
})

describe('GET /users/:id', () => {
  it('returns 200 with the user', async (t) => {
    const app = buildApp({ findById: async () => mockUser })
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/users/' + mockUser.id })
    assert.equal(res.statusCode, 200)
    const body = res.json<{ id: string; email: string }>()
    assert.equal(body.id, mockUser.id)
    assert.equal(body.email, mockUser.email)
  })

  it('returns 404 when user not found', async (t) => {
    const app = buildApp({ findById: async () => undefined })
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/users/' + mockUser.id })
    assert.equal(res.statusCode, 404)
    assert.equal(res.json<{ message: string }>().message, 'User not found')
  })
})

describe('PATCH /users/:id', () => {
  it('returns 200 with updated user', async (t) => {
    const updated = buildUser({ name: 'Alicia' })
    const app = buildApp({ update: async () => updated })
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/' + mockUser.id,
      payload: { name: 'Alicia' },
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json<{ name: string }>().name, 'Alicia')
  })

  it('returns 404 when user not found', async (t) => {
    const app = buildApp({ update: async () => undefined })
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/' + mockUser.id,
      payload: { name: 'Nobody' },
    })
    assert.equal(res.statusCode, 404)
  })

  it('returns 400 when no fields provided', async (t) => {
    const app = buildApp()
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/' + mockUser.id,
      payload: {},
    })
    assert.equal(res.statusCode, 400)
  })
})

describe('DELETE /users/:id', () => {
  it('returns 204 after deleting user', async (t) => {
    const app = buildApp({ remove: async () => mockUser })
    t.after(() => app.close())
    const res = await app.inject({ method: 'DELETE', url: '/users/' + mockUser.id })
    assert.equal(res.statusCode, 204)
  })

  it('returns 404 when user not found', async (t) => {
    const app = buildApp({ remove: async () => undefined })
    t.after(() => app.close())
    const res = await app.inject({ method: 'DELETE', url: '/users/' + mockUser.id })
    assert.equal(res.statusCode, 404)
  })
})
