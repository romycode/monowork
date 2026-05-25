import type {FastifyPluginAsyncZod} from '@fastify/type-provider-zod'
import {z} from 'zod'

export const healthRouter: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: z.object({ status: z.literal('ok') }),
        },
      },
    },
    async () => ({ status: 'ok' as const }),
  )
}
