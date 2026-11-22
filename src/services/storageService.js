/**
 * storageService — שכבת הנתונים היחידה של האפליקציה.
 * בלי הגדרות Firebase האתר רץ במצב דמו (LocalStorage), ועם הגדרות הוא עובר לבד ל-Firebase.
 */
import { isFirebaseConfigured } from '../config.js'
import { createLocalAdapter } from './localAdapter.js'

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
        console.error('Firebase לא נטען, עוברים למצב דמו', err)
        adapter = createLocalAdapter()
      }
    } else {
      adapter = createLocalAdapter()
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
