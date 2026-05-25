import {type DB} from '#/db/index'
import {users} from '#/users/users-schema'
import {eq} from 'drizzle-orm'

type UserRecord = typeof users.$inferSelect

export type User = Omit<UserRecord, 'password'>

export type UsersRepository = {
  findAll: () => Promise<User[]>
  findById: (id: string) => Promise<User | undefined>
  upsert: (
    id: string,
    data: { email: string; name: string; password: string },
  ) => Promise<{ user: User; created: boolean }>
  update: (
    id: string,
    data: { email?: string | undefined; name?: string | undefined; password?: string | undefined },
  ) => Promise<User | undefined>
  remove: (id: string) => Promise<User | undefined>
}

function toUser({ password: _, ...user }: UserRecord): User {
  return user
}

export function createUsersRepository(db: DB): UsersRepository {
  return {
    findAll: async () => {
      const records = await db.select().from(users)
      return records.map(toUser)
    },

    findById: async (id) => {
      const [record] = await db.select().from(users).where(eq(users.id, id))
      return record ? toUser(record) : undefined
    },

    upsert: async (id, data) => {
      const [inserted] = await db
        .insert(users)
        .values({ id, ...data })
        .onConflictDoNothing({ target: users.id })
        .returning()
      if (inserted) return { user: toUser(inserted), created: true }
      const [existing] = await db.select().from(users).where(eq(users.id, id))
      return { user: toUser(existing!), created: false }
    },

    update: async (id, data) => {
      const values: { email?: string; name?: string; password?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      }
      if (data.email !== undefined) values.email = data.email
      if (data.name !== undefined) values.name = data.name
      if (data.password !== undefined) values.password = data.password
      const [record] = await db.update(users).set(values).where(eq(users.id, id)).returning()
      return record ? toUser(record) : undefined
    },

    remove: async (id) => {
      const [record] = await db.delete(users).where(eq(users.id, id)).returning()
      return record ? toUser(record) : undefined
    },
  }
}
