import { organizationService } from '#/organizations/organizations.service'
import { buildOrganization, mockRepo } from '#/organizations/organizations.test-helpers'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('OrganizationsService.list', () => {
  it('returns all organizations from the repository', async () => {
    const org = buildOrganization()
    const service = organizationService(mockRepo({ findAll: async () => [org] }))
    assert.deepEqual(await service.list(), [org])
  })
})

describe('OrganizationsService.get', () => {
  it('returns the organization when found', async () => {
    const org = buildOrganization()
    const service = organizationService(mockRepo({ findById: async () => org }))
    assert.deepEqual(await service.get(org.id), org)
  })

  it('returns undefined when not found', async () => {
    const service = organizationService(mockRepo({ findById: async () => undefined }))
    assert.equal(await service.get('non-existent'), undefined)
  })
})

describe('OrganizationsService.upsert', () => {
  const input = { name: 'Acme Corp', slug: 'acme-corp' }

  it('returns the organization with created=true on first call', async () => {
    const org = buildOrganization()
    const service = organizationService(
      mockRepo({
        findBySlug: async () => undefined,
        upsert: async () => ({ organization: org, created: true }),
      }),
    )
    assert.deepEqual(await service.upsert(org.id, input), { organization: org, created: true })
  })

  it('returns the existing organization with created=false on replay', async () => {
    const org = buildOrganization()
    const service = organizationService(
      mockRepo({
        findBySlug: async () => org,
        upsert: async () => ({ organization: org, created: false }),
      }),
    )
    assert.deepEqual(await service.upsert(org.id, input), { organization: org, created: false })
  })

  it('returns undefined when slug belongs to a different organization', async () => {
    const org = buildOrganization()
    const other = buildOrganization({ id: '01900000-0000-7000-8000-000000000099' })
    const service = organizationService(
      mockRepo({
        findBySlug: async () => other,
      }),
    )
    assert.equal(await service.upsert(org.id, input), undefined)
  })
})

describe('OrganizationsService.update', () => {
  it('returns the updated organization', async () => {
    const org = buildOrganization()
    const updated = buildOrganization({ name: 'Acme Inc' })
    const service = organizationService(
      mockRepo({
        findBySlug: async () => undefined,
        update: async () => updated,
      }),
    )
    assert.deepEqual(await service.update(org.id, { name: 'Acme Inc' }), updated)
  })

  it('returns undefined when the organization does not exist', async () => {
    const service = organizationService(mockRepo({ update: async () => undefined }))
    assert.equal(await service.update('non-existent', { name: 'Nobody' }), undefined)
  })

  it('returns conflict when slug is taken by a different organization', async () => {
    const org = buildOrganization()
    const other = buildOrganization({ id: '01900000-0000-7000-8000-000000000099' })
    const service = organizationService(
      mockRepo({
        findBySlug: async () => other,
      }),
    )
    assert.equal(await service.update(org.id, { slug: 'taken-slug' }), 'conflict')
  })

  it('allows updating slug to the same value (same org)', async () => {
    const org = buildOrganization()
    const updated = buildOrganization({ slug: 'acme-corp' })
    const service = organizationService(
      mockRepo({
        findBySlug: async () => org,
        update: async () => updated,
      }),
    )
    assert.deepEqual(await service.update(org.id, { slug: 'acme-corp' }), updated)
  })
})

describe('OrganizationsService.remove', () => {
  it('returns the removed organization', async () => {
    const org = buildOrganization()
    const service = organizationService(mockRepo({ remove: async () => org }))
    assert.deepEqual(await service.remove(org.id), org)
  })

  it('returns undefined when the organization does not exist', async () => {
    const service = organizationService(mockRepo({ remove: async () => undefined }))
    assert.equal(await service.remove('non-existent'), undefined)
  })
})
