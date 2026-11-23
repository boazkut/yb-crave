import type { Config, Context } from '@netlify/functions'
import { handle } from '../lib/core.mjs'

export default async (req: Request, context: Context) => handle(req, context)

export const config: Config = {
  path: '/api/*',
  excludedPath: ['/api/admin/login', '/api/orders'],
}
