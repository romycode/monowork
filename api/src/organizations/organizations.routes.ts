import type { OrganizationsService } from '#/organizations/organizations.service'
import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod'
import { z } from 'zod'

const organizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

const notFoundSchema = z.object({ message: z.string() })
const conflictSchema = z.object({ message: z.string() })

const idParam = z.object({ id: z.uuid({ version: 'v7' }) })

const organizationBody = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

type Options = { organizationsService: OrganizationsService }

export const organizationsRouter: FastifyPluginAsyncZod<Options> = async (
  fastify,
  { organizationsService },
) => {
  fastify.get(
    '/orgs',
    { schema: { response: { 200: z.array(organizationSchema) } } },
    async () => organizationsService.list(),
  )

  fastify.get(
    '/orgs/:id',
    { schema: { params: idParam, response: { 200: organizationSchema, 404: notFoundSchema } } },
    async (req, reply) => {
      const org = await organizationsService.get(req.params.id)
      if (!org) return reply.code(404).send({ message: 'Organization not found' })
      return org
    },
  )

  fastify.put(
    '/orgs/:id',
    {
      schema: {
        params: idParam,
        body: organizationBody,
        response: { 200: organizationSchema, 201: organizationSchema, 404: notFoundSchema },
      },
    },
    async (req, reply) => {
      const result = await organizationsService.upsert(req.params.id, req.body)
      if (!result) return reply.code(404).send({ message: 'Organization not found' })
      return reply.code(result.created ? 201 : 200).send(result.organization)
    },
  )

  fastify.patch(
    '/orgs/:id',
    {
      schema: {
        params: idParam,
        body: organizationBody
          .partial()
          .refine((b) => b.name !== undefined || b.slug !== undefined, {
            error: 'At least one field must be provided',
          }),
        response: {
          200: organizationSchema,
          404: notFoundSchema,
          409: conflictSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await organizationsService.update(req.params.id, req.body)
      if (result === 'conflict') return reply.code(409).send({ message: 'Slug already in use' })
      if (!result) return reply.code(404).send({ message: 'Organization not found' })
      return result
    },
  )

  fastify.delete(
    '/orgs/:id',
    { schema: { params: idParam, response: { 204: z.void(), 404: notFoundSchema } } },
    async (req, reply) => {
      const org = await organizationsService.remove(req.params.id)
      if (!org) return reply.code(404).send({ message: 'Organization not found' })
      return reply.code(204).send()
    },
  )
}
