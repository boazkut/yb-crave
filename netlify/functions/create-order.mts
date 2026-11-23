import type { Config, Context } from '@netlify/functions'
import { handle } from '../lib/core.mjs'

// שליחת הזמנה: פונקציה נפרדת עם הגבלת קצב, כדי שאי אפשר יהיה להציף את החנות בהזמנות מזויפות
export default async (req: Request, context: Context) => handle(req, context)

export const config: Config = {
  path: '/api/orders',
  method: 'POST',
  rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
