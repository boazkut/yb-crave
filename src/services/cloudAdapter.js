/**
 * מתאם "ענן" — מדבר עם השרת של האתר עצמו ב-Netlify (/api).
 * עובד מיד אחרי פריסה: כל הטלפונים רואים את אותן הזמנות, מלאי והגדרות.
 * עדכונים חיים: בדיקת "גרסאות" זעירה כל 2.5 שניות (מה-CDN, כשהמסך פתוח),
 * ומשיכת נתונים רק כשמשהו באמת השתנה. בנוסף התראות Push.
 */
import { withSettingsDefaults } from './defaults.js'
import { readLS, writeLS } from '../lib/utils.js'

const TOKEN_KEY = 'ybc2:adminToken'
const ORDER_TOKENS = 'ybc2:orderTokens'

const getAdminToken = () => readLS(TOKEN_KEY, null)

/** הזמנה שנמחקה בשרת: מוחקים את הקישור הפרטי שלה ואת השורה ברשימת ההזמנות שלי */
function forgetOrder(id) {
  const tokens = readLS(ORDER_TOKENS, {})
  delete tokens[id]
  writeLS(ORDER_TOKENS, tokens)
  const mine = readLS('ybc2:myOrders', [])
  if (Array.isArray(mine)) writeLS('ybc2:myOrders', mine.filter((o) => o.id !== id))
  window.dispatchEvent(new CustomEvent('ybc:local', { detail: 'ybc2:myOrders' }))
}

async function api(path, { method = 'GET', body, admin = false } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (admin) {
    const t = getAdminToken()
    if (t) headers.authorization = `Bearer ${t}`
  }
  const res = await fetch(`/api/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'משהו השתבש. נסו שוב.')
    err.status = res.status
    err.code = data.code
    // קוד המנהל חלש/ישן: מבקשים להחליף לפני כל פעולה
    if (admin && data.code === 'WEAK_PIN') window.dispatchEvent(new Event('ybc:weakpin'))
    // הכניסה בוטלה (למשל הקוד הוחלף בטלפון אחר)
    if (admin && res.status === 401) window.dispatchEvent(new Event('ybc:signedout'))
    throw err
  }
  return data
}

/** בדיקה תקופתית שרצה רק כשהמסך גלוי */
function poll(fn, ms) {
  let timer = 0
  let stopped = false
  const tick = async () => {
    if (stopped) return
    if (!document.hidden) await fn().catch(() => {})
    timer = setTimeout(tick, ms)
  }
  const onVis = () => {
    if (!document.hidden && !stopped) {
      clearTimeout(timer)
      tick()
    }
  }
  document.addEventListener('visibilitychange', onVis)
  tick()
  return () => {
    stopped = true
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVis)
  }
}

const REV_EVERY = 2500

/**
 * שעון הגרסאות: c = קטלוג והגדרות, o = הזמנות.
 * כל שינוי בשרת משנה את הגרסה, וכל מי שמחכה לסוג הזה מקבל הודעה תוך שניות.
 */
function createRevWatcher() {
  const listeners = { c: new Set(), o: new Set() }
  let last = null
  let stop = null
  const check = async () => {
    const res = await fetch('/api/rev', { cache: 'no-store' })
    if (!res.ok) return
    const r = await res.json()
    const prev = last
    last = r
    if (!prev) return
    if (r.c !== prev.c) listeners.c.forEach((f) => f(r.c))
    if (r.o !== prev.o) listeners.o.forEach((f) => f(r.o))
  }
  return {
    get current() {
      return last
    },
    async first() {
      if (!last) await check().catch(() => {})
      return last
    },
    on(kind, f) {
      listeners[kind].add(f)
      if (!stop) stop = poll(check, REV_EVERY)
      return () => listeners[kind].delete(f)
    },
  }
}

async function probeOnce(ms) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    const res = await fetch('/api/health', { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!res.ok) return null
    const data = await res.json()
    return data?.ok ? data : null
  } catch {
    return null
  }
}

/** בודק שיש שרת. ברשת איטית מנסה שוב, עם זמן המתנה ארוך יותר */
export async function probeCloud({ retries = 0 } = {}) {
  const waits = [3500, 6000, 9000]
  for (let i = 0; i <= retries; i += 1) {
    const h = await probeOnce(waits[Math.min(i, waits.length - 1)])
    if (h) return h
  }
  return null
}

export function createCloudAdapter(health) {
  const subs = { catalog: new Set(), admin: new Set(), adminsChanged: new Set(), refresh: new Set() }
  let catalog = null
  let lastSig = ''
  let adminState = { status: 'signedOut' }
  const rev = createRevWatcher()

  const emitCatalog = () => subs.catalog.forEach((cb) => cb(catalog))
  const setAdminState = (s) => {
    adminState = s
    subs.admin.forEach((cb) => cb(s))
  }
  window.addEventListener('ybc:weakpin', () => {
    if (adminState.status === 'admin' && !adminState.mustChangePin) setAdminState({ ...adminState, mustChangePin: true })
  })
  window.addEventListener('ybc:signedout', () => {
    if (adminState.status !== 'admin') return
    writeLS(TOKEN_KEY, null)
    setAdminState({ status: 'signedOut' })
  })

  const isAdminSession = () => adminState.status === 'admin'

  const CACHE_KEY = 'ybc2:catalogCache'

  async function fetchPublicCatalog(v) {
    if (!v && !rev.current) await rev.first()
    const version = v || rev.current?.c
    // תמיד עם גרסה: כתובת בלי גרסה עלולה לקבל עותק ישן מה-CDN
    return api(`catalog?v=${encodeURIComponent(version || `t${Math.floor(Date.now() / 30_000)}`)}`)
  }

  async function loadCatalog(v) {
    let data = null
    // מנהל מקבל נתונים ישר מהשרת. אם זה נכשל (למשל צריך להחליף קוד) — הקטלוג הרגיל, לא מסך ריק
    if (isAdminSession() && !adminState.mustChangePin) data = await api('admin/catalog', { admin: true }).catch(() => null)
    if (!data) {
      try {
        data = await fetchPublicCatalog(v)
      } catch (e) {
        // אין רשת: מציגים את העותק האחרון ששמרנו בטלפון
        const cached = readLS(CACHE_KEY, null)
        if (!catalog && cached?.products?.length) data = cached
        else throw e
      }
    }
    // מעדכנים את המסך רק כשמשהו באמת השתנה — אחרת כל המוצרים היו מצוירים מחדש באמצע גלילה
    const sig = JSON.stringify(data)
    if (sig === lastSig && catalog) return
    lastSig = sig
    catalog = { products: data.products, settings: withSettingsDefaults(data.settings) }
    if (data.products?.length) {
      try {
        writeLS(CACHE_KEY, { products: data.products, settings: data.settings })
      } catch {
        /* אין מקום */
      }
    }
    emitCatalog()
  }
  const refreshAfterWrite = () => loadCatalog().catch(() => {})

  let catalogWatch = false
  const ensureCatalogPoll = () => {
    if (catalogWatch) return
    catalogWatch = true
    rev.on('c', (v) => loadCatalog(v).catch(() => {}))
    // גיבוי, למקרה שבדיקת הגרסאות נכשלת
    poll(() => loadCatalog(), 120_000)
  }

  return {
    mode: 'cloud',
    adminIdentity: 'pin',
    get vapidPublicKey() {
      return health?.vapidPublicKey || ''
    },
    /** אם בהתחלה לא הגענו לשרת, משלימים את המפתח להתראות ברקע */
    async ensureHealth() {
      if (!health?.vapidPublicKey) health = (await probeCloud({ retries: 1 })) || health
      return health
    },

    async init() {
      if (getAdminToken()) {
        try {
          const { admin } = await api('admin/me', { admin: true })
          adminState = { status: 'admin', ...admin }
        } catch {
          writeLS(TOKEN_KEY, null)
        }
      }
      await rev.first()
      await loadCatalog().catch(async () => {
        // ניסיון נוסף אחרי רגע, ורק אז מסך ריק (לא הקטלוג הישן)
        await new Promise((ok) => setTimeout(ok, 1500))
        await loadCatalog().catch(() => {
          catalog = { products: [], settings: withSettingsDefaults(readLS(CACHE_KEY, null)?.settings || null) }
        })
      })
    },

    // ---------- קטלוג והגדרות ----------
    subscribeProducts(cb) {
      const fn = (c) => c && cb(c.products)
      subs.catalog.add(fn)
      if (catalog) fn(catalog)
      ensureCatalogPoll()
      return () => subs.catalog.delete(fn)
    },
    subscribeSettings(cb) {
      const fn = (c) => c && cb(c.settings)
      subs.catalog.add(fn)
      if (catalog) fn(catalog)
      ensureCatalogPoll()
      return () => subs.catalog.delete(fn)
    },
    imageUrlFor: (id, v) => `/api/img/${encodeURIComponent(id)}/${v}`,

    // ---------- לקוח ----------
    async myUid() {
      return 'cloud'
    },
    async createOrder(order, proofDataUrl) {
      const res = await api('orders', { method: 'POST', body: { order, proof: proofDataUrl || null } })
      writeLS(ORDER_TOKENS, { ...readLS(ORDER_TOKENS, {}), [res.id]: res.token })
      return { ...order, id: res.id, number: res.number, createdAt: res.createdAt }
    },
    subscribeOrder(id, cb) {
      const t = readLS(ORDER_TOKENS, {})[id]
      if (!t) {
        cb(null)
        return () => {}
      }
      let last = ''
      let off = () => {}
      let stop = () => {}
      let gone = false
      const fetchOne = async () => {
        if (gone) return
        try {
          const o = await api(`orders/${encodeURIComponent(id)}?t=${encodeURIComponent(t)}`)
          const sig = `${o.status}|${o.paid}|${o.rejectReason}`
          if (sig !== last) {
            last = sig
            cb(o)
          }
        } catch (e) {
          // ההזמנה נמחקה: מפסיקים לשאול עליה ושוכחים אותה בטלפון הזה
          if (e.status === 404) {
            gone = true
            off()
            stop()
            forgetOrder(id)
            cb(null)
          }
        }
      }
      // מושכים מיד כשהגרסה של ההזמנות משתנה, ובנוסף בדיקת גיבוי איטית
      off = rev.on('o', () => fetchOne())
      stop = poll(fetchOne, 60_000)
      return () => {
        off()
        stop()
      }
    },
    async saveOrderPush(id, subscription) {
      const t = readLS(ORDER_TOKENS, {})[id]
      if (!t) throw new Error('ההזמנה לא נמצאה בטלפון הזה')
      await api(`orders/${encodeURIComponent(id)}/push`, { method: 'POST', body: { t, subscription } })
    },

    // ---------- מנהלים: הזמנות ----------
    subscribeOrders(cb, { days = 7 } = {}) {
      const run = async () => {
        const { orders } = await api(`admin/orders?days=${days}`, { admin: true })
        cb(orders)
      }
      const again = () => run().catch(() => {})
      const off = rev.on('o', again)
      const stop = poll(run, 45_000)
      subs.refresh.add(again)
      return () => {
        off()
        stop()
        subs.refresh.delete(again)
      }
    },
    async getProof(orderId) {
      const { dataUrl } = await api(`admin/proof/${encodeURIComponent(orderId)}`, { admin: true })
      return dataUrl
    },
    async updateOrder(id, patch) {
      await api(`admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', admin: true, body: patch })
      subs.refresh.forEach((f) => f())
    },
    async deleteOrder(id) {
      await api(`admin/orders/${encodeURIComponent(id)}`, { method: 'DELETE', admin: true })
      subs.refresh.forEach((f) => f())
    },
    onOrdersChanged(f) {
      subs.refresh.add(f)
      return () => subs.refresh.delete(f)
    },
    async purgeProofs() {
      const { count } = await api('admin/purge-proofs', { method: 'POST', admin: true })
      return count
    },
    async saveAdminPush(subscription) {
      await api('admin/push', { method: 'POST', admin: true, body: { subscription } })
    },
    async testAdminPush(endpoint) {
      await api('admin/push-test', { method: 'POST', admin: true, body: { endpoint } })
    },

    // ---------- מנהלים: מוצרים והגדרות ----------
    async saveProduct(product) {
      await api(`admin/products/${encodeURIComponent(product.id)}`, { method: 'PUT', admin: true, body: product })
      await refreshAfterWrite()
    },
    async deleteProduct(id) {
      await api(`admin/products/${encodeURIComponent(id)}`, { method: 'DELETE', admin: true })
      await refreshAfterWrite()
    },
    /** action: 'delete' או 'update' עם patch כמו { price } */
    async bulkProducts(ids, action, patch) {
      await api('admin/products-bulk', { method: 'POST', admin: true, body: { ids, action, patch } })
      await refreshAfterWrite()
    },
    async getProductImage() {
      return null
    },
    async setProductImage(id, dataUrl) {
      await api(`admin/products/${encodeURIComponent(id)}/image`, { method: 'PUT', admin: true, body: { dataUrl } })
      await refreshAfterWrite()
    },
    async seedCatalog() {
      await api('admin/seed', { method: 'POST', admin: true })
      await refreshAfterWrite()
    },
    async updateSettings(patch) {
      await api('admin/settings', { method: 'PATCH', admin: true, body: patch })
      await refreshAfterWrite()
    },

    // ---------- מנהלים: הרשאות ----------
    subscribeAdmins(cb) {
      const load = () =>
        api('admin/admins', { admin: true })
          .then(({ admins }) => cb(admins))
          .catch(() => cb([]))
      load()
      subs.adminsChanged.add(load)
      return () => subs.adminsChanged.delete(load)
    },
    async addAdmin({ name, pin, role }) {
      await api('admin/admins', { method: 'POST', admin: true, body: { name, pin, role } })
      subs.adminsChanged.forEach((f) => f())
    },
    async removeAdmin(id) {
      await api(`admin/admins/${encodeURIComponent(id)}`, { method: 'DELETE', admin: true })
      subs.adminsChanged.forEach((f) => f())
    },

    // ---------- כניסה בקוד אישי ----------
    onAdminChange(cb) {
      subs.admin.add(cb)
      cb(adminState)
      return () => subs.admin.delete(cb)
    },
    async adminSignIn(_email, pin) {
      const { token, admin } = await api('admin/login', { method: 'POST', body: { pin } })
      writeLS(TOKEN_KEY, token)
      setAdminState({ status: 'admin', ...admin })
      await loadCatalog().catch(() => {})
    },
    async adminSignOut() {
      writeLS(TOKEN_KEY, null)
      setAdminState({ status: 'signedOut' })
    },
    async changeAdminSecret(pin) {
      const { token, admin } = await api('admin/me/pin', { method: 'POST', admin: true, body: { pin } })
      // הטלפון הזה נשאר מחובר עם כניסה חדשה; כל השאר מתנתקים
      if (token) writeLS(TOKEN_KEY, token)
      if (admin) setAdminState({ status: 'admin', ...admin })
      await loadCatalog().catch(() => {})
    },
  }
}
