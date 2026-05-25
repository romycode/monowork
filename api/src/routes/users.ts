import {db} from '#/db/index'
import {users} from '#/db/schema'
import type {FastifyPluginAsyncZod} from '@fastify/type-provider-zod'
import {eq} from 'drizzle-orm'
import {z} from 'zod'

const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

const notFoundSchema = z.object({message: z.string()})

const idParam = z.object({id: z.coerce.number().int().positive()})

export const usersRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/users',
    {schema: {response: {200: z.array(userSchema)}}},
    async () => db.select().from(users),
  )

  fastify.post(
    '/users',
    {
      schema: {
        body: z.object({
          email: z.string().email(),
          name: z.string().min(1),
        }),
        response: {201: userSchema},
      },
    },
    async (req, reply) => {
      const [user] = await db.insert(users).values(req.body).returning()
      if (!user) throw new Error('Insert failed unexpectedly')
      return reply.code(201).send(user)
    },
  )

  fastify.get(
    '/users/:id',
    {schema: {params: idParam, response: {200: userSchema, 404: notFoundSchema}}},
    async (req, reply) => {
      const [user] = await db.select().from(users).where(eq(users.id, req.params.id))
      if (!user) return reply.code(404).send({message: 'User not found'})
      return user
    },
  )

  fastify.put(
    '/users/:id',
    {
      schema: {
        params: idParam,
        body: z
          .object({
            email: z.string().email().optional(),
            name: z.string().min(1).optional(),
          })
          .refine((b) => b.email !== undefined || b.name !== undefined, {
            message: 'At least one field must be provided',
          }),
        response: {200: userSchema, 404: notFoundSchema},
      },
    },
    async (req, reply) => {
      const [user] = await db
        .update(users)
        .set({...req.body, updatedAt: new Date()})
        .where(eq(users.id, req.params.id))
        .returning()
      if (!user) return reply.code(404).send({message: 'User not found'})
      return user
    },
  )

  fastify.delete(
    '/users/:id',
    {schema: {params: idParam, response: {204: z.void(), 404: notFoundSchema}}},
    async (req, reply) => {
      const [user] = await db.delete(users).where(eq(users.id, req.params.id)).returning()
      if (!user) return reply.code(404).send({message: 'User not found'})
      return reply.code(204).send()
    },
  )
}
