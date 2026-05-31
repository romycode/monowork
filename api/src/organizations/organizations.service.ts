import type { Organization } from '#/organizations/organizations'
import type { OrganizationsRepository } from '#/organizations/organizations.repo'

type UpsertOrganizationInput = { name: string; slug: string }
type UpdateOrganizationInput = { name?: string | undefined; slug?: string | undefined }

export type OrganizationsService = {
  list: () => Promise<Organization[]>
  get: (id: string) => Promise<Organization | undefined>
  upsert: (
    id: string,
    input: UpsertOrganizationInput,
  ) => Promise<{ organization: Organization; created: boolean } | undefined>
  update: (
    id: string,
    input: UpdateOrganizationInput,
  ) => Promise<Organization | 'conflict' | undefined>
  remove: (id: string) => Promise<Organization | undefined>
}

export function organizationService(repo: OrganizationsRepository): OrganizationsService {
  return {
    list: () => repo.findAll(),

    get: (id) => repo.findById(id),

    upsert: async (id, input) => {
      const existing = await repo.findBySlug(input.slug)
      if (existing && existing.id !== id) return undefined
      return repo.upsert(id, input)
    },

    update: async (id, input) => {
      if (input.slug !== undefined) {
        const existing = await repo.findBySlug(input.slug)
        if (existing && existing.id !== id) return 'conflict'
      }
      return repo.update(id, input)
    },

    remove: (id) => repo.remove(id),
  }
}
