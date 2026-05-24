import { createApp } from './app.js'
import { env } from './env.js'

const app = createApp()

await app.listen({ port: env.PORT, host: '0.0.0.0' })
