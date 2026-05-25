import {type DB} from '#/db/index'
import {users} from '#/db/schema'
import {eq} from 'drizzle-orm'

export type User = typeof users.$inferSelect

export type UsersRepository = {
  findAll: () => Promise<User[]>
  findById: (id: string) => Promise<User | undefined>
  create: (data: { email: string; name: string; password: string }) => Promise<User>
  update: (
    id: string,
    data: { email?: string | undefined; name?: string | undefined; password?: string | undefined },
  ) => Promise<User | undefined>
  remove: (id: string) => Promise<User | undefined>
}

export function createUsersRepository(db: DB): UsersRepository {
  return {
    findAll: () => db.select().from(users),

    findById: async (id) => {
      const [user] = await db.select().from(users).where(eq(users.id, id))
      return user
    },

    create: async (data) => {
      const [user] = await db.insert(users).values(data).returning()
      if (!user) throw new Error('Insert failed unexpectedly')
      return user
    },

    update: async (id, data) => {
      const values: { email?: string; name?: string; password?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      }
      if (data.email !== undefined) values.email = data.email
      if (data.name !== undefined) values.name = data.name
      if (data.password !== undefined) values.password = data.password
      const [user] = await db.update(users).set(values).where(eq(users.id, id)).returning()
      return user
    },

    remove: async (id) => {
      const [user] = await db.delete(users).where(eq(users.id, id)).returning()
      return user
    },
  }
}
