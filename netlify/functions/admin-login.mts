import type { Config, Context } from '@netlify/functions'
import { login } from '../lib/core.mjs'

export default async (req: Request, context: Context) => login(req, context)

export const config: Config = {
  path: '/api/admin/login',
  method: 'POST',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
