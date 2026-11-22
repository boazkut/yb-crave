import type { Config } from '@netlify/functions'
import { login } from '../lib/core.mjs'

export default async (req: Request) => login(req)

export const config: Config = {
  path: '/api/admin/login',
  method: 'POST',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
