import {env} from '#/env'
import {drizzle} from 'drizzle-orm/node-postgres'

export const db = drizzle({
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production',
  },
})

export type DB = typeof db
