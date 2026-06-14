import type { OrganizationsRepository } from '#/organizations/organizations.repo'
import { organizationsRouter } from '#/organizations/organizations.routes'
import { organizationService } from '#/organizations/organizations.service'
import { buildOrganization, mockRepo } from '#/organizations/organizations.test-helpers'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const mockOrg = buildOrganization()

function buildApp(repoOverrides: Partial<OrganizationsRepository> = {}) {
  const service = organizationService(mockRepo(repoOverrides))
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  void app.register(organizationsRouter, { organizationsService: service })
  return app
}

describe('GET /orgs', () => {
  it('returns 200 with empty list', async (t) => {
    const app = buildApp({ findAll: async () => [] })
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/orgs' })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.json(), [])
  })

  it('returns 200 with organizations', async (t) => {
    const app = buildApp({ findAll: async () => [mockOrg] })
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/orgs' })
    assert.equal(res.statusCode, 200)
    const body = res.json<Array<{ name: string; slug: string }>>()
    assert.equal(body.length, 1)
    assert.equal(body[0]?.name, mockOrg.name)
    assert.equal(body[0]?.slug, mockOrg.slug)
  })
})

describe('GET /orgs/:id', () => {
  it('returns 200 with the organization', async (t) => {
    const app = buildApp({ findById: async () => mockOrg })
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/orgs/' + mockOrg.id })
    assert.equal(res.statusCode, 200)
    const body = res.json<{ id: string; slug: string }>()
    assert.equal(body.id, mockOrg.id)
    assert.equal(body.slug, mockOrg.slug)
  })

  it('returns 404 when organization not found', async (t) => {
    const app = buildApp({ findById: async () => undefined })
    t.after(() => app.close())
    const res = await app.inject({ method: 'GET', url: '/orgs/' + mockOrg.id })
    assert.equal(res.statusCode, 404)
    assert.equal(res.json<{ message: string }>().message, 'Organization not found')
  })
})

describe('PUT /orgs/:id', () => {
  const payload = { name: 'Acme Corp', slug: 'acme-corp' }

  it('returns 201 when organization is created', async (t) => {
    const app = buildApp({
      findBySlug: async () => undefined,
      upsert: async () => ({ organization: mockOrg, created: true }),
    })
    t.after(() => app.close())
    const res = await app.inject({ method: 'PUT', url: '/orgs/' + mockOrg.id, payload })
    assert.equal(res.statusCode, 201)
    assert.equal(res.json<{ slug: string }>().slug, mockOrg.slug)
  })

  it('returns 200 when organization already exists (idempotent replay)', async (t) => {
    const app = buildApp({
      findBySlug: async () => mockOrg,
      upsert: async () => ({ organization: mockOrg, created: false }),
    })
    t.after(() => app.close())
    const res = await app.inject({ method: 'PUT', url: '/orgs/' + mockOrg.id, payload })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json<{ slug: string }>().slug, mockOrg.slug)
  })

  it('returns 404 when slug belongs to a different organization', async (t) => {
    const other = buildOrganization({ id: '01900000-0000-7000-8000-000000000099' })
    const app = buildApp({ findBySlug: async () => other })
    t.after(() => app.close())
    const res = await app.inject({ method: 'PUT', url: '/orgs/' + mockOrg.id, payload })
    assert.equal(res.statusCode, 404)
  })

  it('returns 400 when name is missing', async (t) => {
    const app = buildApp()
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PUT',
      url: '/orgs/' + mockOrg.id,
      payload: { slug: 'acme-corp' },
    })
    assert.equal(res.statusCode, 400)
  })

  it('returns 400 when slug is invalid', async (t) => {
    const app = buildApp()
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PUT',
      url: '/orgs/' + mockOrg.id,
      payload: { name: 'Acme Corp', slug: 'Acme Corp' },
    })
    assert.equal(res.statusCode, 400)
  })
})

describe('PATCH /orgs/:id', () => {
  it('returns 200 with updated organization', async (t) => {
    const updated = buildOrganization({ name: 'Acme Inc' })
    const app = buildApp({ update: async () => updated })
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PATCH',
      url: '/orgs/' + mockOrg.id,
      payload: { name: 'Acme Inc' },
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json<{ name: string }>().name, 'Acme Inc')
  })

  it('returns 404 when organization not found', async (t) => {
    const app = buildApp({ update: async () => undefined })
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PATCH',
      url: '/orgs/' + mockOrg.id,
      payload: { name: 'Nobody' },
    })
    assert.equal(res.statusCode, 404)
  })

  it('returns 409 when slug is already taken', async (t) => {
    const other = buildOrganization({ id: '01900000-0000-7000-8000-000000000099' })
    const app = buildApp({ findBySlug: async () => other })
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PATCH',
      url: '/orgs/' + mockOrg.id,
      payload: { slug: 'taken-slug' },
    })
    assert.equal(res.statusCode, 409)
    assert.equal(res.json<{ message: string }>().message, 'Slug already in use')
  })

  it('returns 400 when no fields provided', async (t) => {
    const app = buildApp()
    t.after(() => app.close())
    const res = await app.inject({
      method: 'PATCH',
      url: '/orgs/' + mockOrg.id,
      payload: {},
    })
    assert.equal(res.statusCode, 400)
  })
})

describe('DELETE /orgs/:id', () => {
  it('returns 204 after deleting organization', async (t) => {
    const app = buildApp({ remove: async () => mockOrg })
    t.after(() => app.close())
    const res = await app.inject({ method: 'DELETE', url: '/orgs/' + mockOrg.id })
    assert.equal(res.statusCode, 204)
  })

  it('returns 404 when organization not found', async (t) => {
    const app = buildApp({ remove: async () => undefined })
    t.after(() => app.close())
    const res = await app.inject({ method: 'DELETE', url: '/orgs/' + mockOrg.id })
    assert.equal(res.statusCode, 404)
  })
})
