/**
 * מתאם "ענן" — מדבר עם השרת של האתר עצמו ב-Netlify (/api).
 * עובד מיד אחרי פריסה: כל הטלפונים רואים את אותן הזמנות, מלאי והגדרות.
 * עדכונים חיים נעשים בבדיקה תקופתית קלה (רק כשהמסך פתוח) ובהתראות Push.
 */
import { withSettingsDefaults } from './defaults.js'
import { readLS, writeLS } from '../lib/utils.js'

const TOKEN_KEY = 'ybc2:adminToken'
const ORDER_TOKENS = 'ybc2:orderTokens'

const getAdminToken = () => readLS(TOKEN_KEY, null)

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

export async function probeCloud() {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3500)
    const res = await fetch('/api/health', { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    const data = await res.json()
    return data?.ok ? data : null
  } catch {
    return null
  }
}

export function createCloudAdapter(health) {
  const subs = { catalog: new Set(), admin: new Set(), adminsChanged: new Set(), refresh: new Set() }
  let catalog = null
  let adminState = { status: 'signedOut' }

  const emitCatalog = () => subs.catalog.forEach((cb) => cb(catalog))
  const setAdminState = (s) => {
    adminState = s
    subs.admin.forEach((cb) => cb(s))
  }
  const isAdminSession = () => adminState.status === 'admin'

  async function loadCatalog() {
    // מנהל מקבל נתונים טריים; גולשים מקבלים עותק מהיר מה-CDN
    const data = isAdminSession() ? await api('admin/catalog', { admin: true }) : await api('catalog')
    catalog = { products: data.products, settings: withSettingsDefaults(data.settings) }
    emitCatalog()
  }
  const refreshAfterWrite = () => loadCatalog().catch(() => {})

  let catalogPoll = null
  const ensureCatalogPoll = () => {
    if (!catalogPoll) catalogPoll = poll(loadCatalog, 60_000)
  }

  return {
    mode: 'cloud',
    adminIdentity: 'pin',
    vapidPublicKey: health?.vapidPublicKey || '',

    async init() {
      if (getAdminToken()) {
        try {
          const { admin } = await api('admin/me', { admin: true })
          adminState = { status: 'admin', ...admin }
        } catch {
          writeLS(TOKEN_KEY, null)
        }
      }
      await loadCatalog().catch(() => {
        catalog = { products: [], settings: withSettingsDefaults(null) }
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
      return poll(async () => {
        try {
          const o = await api(`orders/${encodeURIComponent(id)}?t=${encodeURIComponent(t)}`)
          const sig = `${o.status}|${o.paid}|${o.rejectReason}`
          if (sig !== last) {
            last = sig
            cb(o)
          }
        } catch (e) {
          if (e.status === 404) cb(null)
        }
      }, 12_000)
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
      const stop = poll(run, 8_000)
      const again = () => run().catch(() => {})
      subs.refresh.add(again)
      return () => {
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
    async testAdminPush() {
      await api('admin/push-test', { method: 'POST', admin: true })
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
      await api('admin/me/pin', { method: 'POST', admin: true, body: { pin } })
    },
  }
}
