import {db} from '#/db/index.ts'
import {users} from '#/db/schema.ts'

async function seedDB(): Promise<void> {
  const user: typeof users.$inferInsert = {
    name: 'John',
    email: 'john@example.com',
  }
  await db.insert(users).values(user).onConflictDoNothing()
  // eslint-disable-next-line no-console
  console.log('New user created!')

  return undefined
}

seedDB()
