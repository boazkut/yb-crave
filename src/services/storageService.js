/**
 * storageService — שכבת הנתונים היחידה של האפליקציה.
 * סדר הבחירה:
 *   1. Firebase — אם הוגדר firebaseConfig
 *   2. ענן (השרת של האתר ב-Netlify, /api) — כשהאתר רץ ב-Netlify
 *   3. דמו (LocalStorage) — כשמריצים מקומית בלי שרת
 */
import { isFirebaseConfigured } from '../config.js'
import { createLocalAdapter } from './localAdapter.js'
import { createCloudAdapter, probeCloud } from './cloudAdapter.js'

let adapter = null
let ready = null

export function initStorage() {
  if (ready) return ready
  ready = (async () => {
    if (isFirebaseConfigured()) {
      try {
        const { createFirebaseAdapter } = await import('./firebaseAdapter.js')
        adapter = createFirebaseAdapter()
      } catch (err) {
        console.error('Firebase לא נטען', err)
      }
    }
    if (!adapter) {
      const health = await probeCloud()
      adapter = health ? createCloudAdapter(health) : createLocalAdapter()
    }
    await adapter.init()
    return adapter
  })()
  return ready
}

export const storage = new Proxy(
  {},
  {
    get(_, prop) {
      if (!adapter) throw new Error('storage not initialised yet')
      const v = adapter[prop]
      return typeof v === 'function' ? v.bind(adapter) : v
    },
  },
)
