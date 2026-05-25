import { db } from '#/db/index'
import { users } from '#/users/users-schema'

async function seedDB(): Promise<void> {
  const user: typeof users.$inferInsert = {
    name: 'John',
    email: 'john@example.com',
    password: 'password123',
  }
  await db.insert(users).values(user).onConflictDoNothing()
  // eslint-disable-next-line no-console
  console.log('New user created!')

  return undefined
}

seedDB()
