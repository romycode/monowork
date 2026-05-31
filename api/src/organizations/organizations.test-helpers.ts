import type { Organization } from '#/organizations/organizations'
import type { OrganizationsRepository } from '#/organizations/organizations.repo'
import { mock } from 'node:test'

export function buildOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: '01900000-0000-7000-8000-000000000002',
    name: 'Acme Corp',
    slug: 'acme-corp',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

export function mockRepo(
  overrides: Partial<OrganizationsRepository> = {},
): OrganizationsRepository {
  const notImpl = (): never => {
    throw new Error('not implemented')
  }
  return {
    findAll: mock.fn(overrides.findAll ?? (notImpl as OrganizationsRepository['findAll'])),
    findById: mock.fn(overrides.findById ?? (notImpl as OrganizationsRepository['findById'])),
    findBySlug: mock.fn(
      overrides.findBySlug ?? (notImpl as OrganizationsRepository['findBySlug']),
    ),
    upsert: mock.fn(overrides.upsert ?? (notImpl as OrganizationsRepository['upsert'])),
    update: mock.fn(overrides.update ?? (notImpl as OrganizationsRepository['update'])),
    remove: mock.fn(overrides.remove ?? (notImpl as OrganizationsRepository['remove'])),
  }
}
