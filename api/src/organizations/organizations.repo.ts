import { type DB } from '#/db/index'
import type { Organization } from '#/organizations/organizations'
import { organizations } from '#/organizations/organizations.db'
import { and, eq, isNull } from 'drizzle-orm'

type OrganizationRecord = typeof organizations.$inferSelect

export type OrganizationsRepository = {
  findAll: () => Promise<Organization[]>
  findById: (id: string) => Promise<Organization | undefined>
  findBySlug: (slug: string) => Promise<Organization | undefined>
  upsert: (
    id: string,
    data: { name: string; slug: string },
  ) => Promise<{ organization: Organization; created: boolean } | undefined>
  update: (
    id: string,
    data: { name?: string | undefined; slug?: string | undefined },
  ) => Promise<Organization | undefined>
  remove: (id: string) => Promise<Organization | undefined>
}

function toOrganization({ deletedAt: _, ...org }: OrganizationRecord): Organization {
  return org
}

export function createOrganizationsRepository(db: DB): OrganizationsRepository {
  return {
    findAll: async () => {
      const records = await db.select().from(organizations).where(isNull(organizations.deletedAt))
      return records.map(toOrganization)
    },

    findById: async (id) => {
      const [record] = await db
        .select()
        .from(organizations)
        .where(and(eq(organizations.id, id), isNull(organizations.deletedAt)))
      return record ? toOrganization(record) : undefined
    },

    findBySlug: async (slug) => {
      const [record] = await db
        .select()
        .from(organizations)
        .where(and(eq(organizations.slug, slug), isNull(organizations.deletedAt)))
      return record ? toOrganization(record) : undefined
    },

    upsert: async (id, data) => {
      const [inserted] = await db
        .insert(organizations)
        .values({ id, ...data })
        .onConflictDoNothing({ target: organizations.id })
        .returning()
      if (inserted) return { organization: toOrganization(inserted), created: true }
      const [existing] = await db
        .select()
        .from(organizations)
        .where(and(eq(organizations.id, id), isNull(organizations.deletedAt)))
      return existing ? { organization: toOrganization(existing), created: false } : undefined
    },

    update: async (id, data) => {
      const values: { name?: string; slug?: string; updatedAt: Date } = { updatedAt: new Date() }
      if (data.name !== undefined) values.name = data.name
      if (data.slug !== undefined) values.slug = data.slug
      const [record] = await db
        .update(organizations)
        .set(values)
        .where(and(eq(organizations.id, id), isNull(organizations.deletedAt)))
        .returning()
      return record ? toOrganization(record) : undefined
    },

    remove: async (id) => {
      const [record] = await db
        .update(organizations)
        .set({ deletedAt: new Date() })
        .where(and(eq(organizations.id, id), isNull(organizations.deletedAt)))
        .returning()
      return record ? toOrganization(record) : undefined
    },
  }
}
