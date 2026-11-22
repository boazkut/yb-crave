/**
 * storageService — שכבת הנתונים היחידה של האפליקציה.
 * כל הקומפוננטות מדברות רק איתה, ולכן המעבר מ-LocalStorage ל-Firebase
 * הוא רק עניין של מילוי firebaseConfig — בלי לגעת בשום קוד אחר.
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
        console.error('Firebase לא נטען, עוברים למצב מקומי', err)
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
