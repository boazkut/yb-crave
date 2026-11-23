/**
 * מצב דמו (LocalStorage): עובד מיד בלי שום חיבור, כדי לבדוק את כל המסכים.
 * הנתונים נשמרים רק בדפדפן הזה. לסנכרון אמיתי בין טלפונים מחברים Firebase.
 */
import { SEED_PRODUCTS, CATALOG_VERSION, REMOVED_CATEGORIES } from '../data/catalog.js'
import { DEFAULT_SETTINGS, withSettingsDefaults } from './defaults.js'
import { readLS, writeLS, uid, sha256 } from '../lib/utils.js'
import { SITE_CONFIG } from '../config.js'

const K = {
  products: 'ybc2:products',
  settings: 'ybc2:settings',
  orders: 'ybc2:orders',
  proofs: 'ybc2:proofs',
  counter: 'ybc2:counter',
  version: 'ybc2:catalogVersion',
  admins: 'ybc2:admins',
  uid: 'ybc2:uid',
  session: 'ybc2:adminSession',
  images: 'ybc2:productImages',
}

const DEMO_OWNER = { id: 'owner', name: 'מנהל ראשי (דמו)', role: 'owner', addedAt: 0 }

const listeners = new Map()
const on = (topic, cb) => {
  if (!listeners.has(topic)) listeners.set(topic, new Set())
  listeners.get(topic).add(cb)
  return () => listeners.get(topic)?.delete(cb)
}
const emit = (topic) => listeners.get(topic)?.forEach((cb) => cb())
const topicOfKey = Object.fromEntries(Object.entries(K).map(([t, k]) => [k, t]))

export function createLocalAdapter() {
  const getProducts = () => readLS(K.products, [])
  const setProducts = (l) => {
    writeLS(K.products, l)
    emit('products')
  }
  const getOrders = () => readLS(K.orders, [])
  const setOrders = (l) => {
    writeLS(K.orders, l)
    emit('orders')
  }
  const getProofs = () => readLS(K.proofs, {})
  const getAdmins = () => readLS(K.admins, [DEMO_OWNER])
  const setAdmins = (l) => {
    writeLS(K.admins, l)
    emit('admins')
  }
  const sessionState = () => {
    const id = sessionStorage.getItem(K.session)
    if (!id) return { status: 'signedOut' }
    const a = getAdmins().find((x) => x.id === id) || DEMO_OWNER
    return { status: 'admin', id: a.id, name: a.name, role: a.role }
  }

  return {
    mode: 'demo',

    async init() {
      const existing = readLS(K.products, null)
      if (!existing) writeLS(K.products, SEED_PRODUCTS)
      else if (readLS(K.version, 0) < CATALOG_VERSION) {
        const kept = existing.filter((p) => !REMOVED_CATEGORIES.includes(p.category))
        const ids = new Set(kept.map((p) => p.id))
        writeLS(K.products, [...kept, ...SEED_PRODUCTS.filter((p) => !ids.has(p.id))])
      }
      writeLS(K.version, CATALOG_VERSION)
      if (!readLS(K.settings, null)) writeLS(K.settings, DEFAULT_SETTINGS)
      window.addEventListener('storage', (e) => topicOfKey[e.key] && emit(topicOfKey[e.key]))
    },

    // ---------- קטלוג והגדרות ----------
    subscribeProducts(cb) {
      const run = () => cb(getProducts())
      run()
      return on('products', run)
    },
    subscribeSettings(cb) {
      const run = () => cb(withSettingsDefaults(readLS(K.settings, null)))
      run()
      return on('settings', run)
    },

    // ---------- לקוח ----------
    async myUid() {
      let id = readLS(K.uid, null)
      if (!id) {
        id = uid('u_')
        writeLS(K.uid, id)
      }
      return id
    },
    async createOrder(order, proofDataUrl) {
      const number = readLS(K.counter, 100) + 1
      writeLS(K.counter, number)
      const id = uid('o_')
      const saved = { ...order, id, number }
      if (proofDataUrl) writeLS(K.proofs, { ...getProofs(), [id]: proofDataUrl })
      setOrders([...getOrders(), saved])
      return saved
    },
    subscribeOrder(id, cb) {
      const run = () => cb(getOrders().find((o) => o.id === id) || null)
      run()
      return on('orders', run)
    },

    // ---------- מנהלים: הזמנות ----------
    subscribeOrders(cb) {
      const run = () => cb([...getOrders()].sort((a, b) => b.createdAt - a.createdAt))
      run()
      return on('orders', run)
    },
    async getProof(orderId) {
      return getProofs()[orderId] || null
    },
    async updateOrder(id, patch) {
      setOrders(getOrders().map((o) => (o.id === id ? { ...o, ...patch, statusAt: Date.now() } : o)))
    },
    async deleteOrder(id) {
      const proofs = getProofs()
      delete proofs[id]
      writeLS(K.proofs, proofs)
      setOrders(getOrders().filter((o) => o.id !== id))
    },
    async purgeProofs(olderThanDays = 7) {
      const cutoff = Date.now() - olderThanDays * 86400000
      const proofs = getProofs()
      let n = 0
      for (const o of getOrders()) {
        if (proofs[o.id] && ['delivered', 'rejected', 'cancelled'].includes(o.status) && o.createdAt < cutoff) {
          delete proofs[o.id]
          n++
        }
      }
      writeLS(K.proofs, proofs)
      setOrders(getOrders().map((o) => (proofs[o.id] ? o : { ...o, payment: { ...o.payment, hasProof: false } })))
      return n
    },

    // ---------- מנהלים: מוצרים והגדרות ----------
    async saveProduct(product) {
      const list = getProducts()
      setProducts(list.some((p) => p.id === product.id) ? list.map((p) => (p.id === product.id ? { ...p, ...product } : p)) : [...list, product])
    },
    async setProductQty(id, qty) {
      const n = qty === null ? null : Math.max(0, Math.floor(Number(qty)))
      setProducts(
        getProducts().map((p) => {
          if (p.id !== id) return p
          if (n === null) {
            const { qty: _q, ...rest } = p
            return rest
          }
          return { ...p, qty: n, stock: n <= 0 ? 'out' : n <= 3 ? 'low' : 'in' }
        }),
      )
    },
    async deleteProduct(id) {
      const imgs = readLS(K.images, {})
      delete imgs[id]
      writeLS(K.images, imgs)
      setProducts(getProducts().filter((p) => p.id !== id))
    },
    async bulkProducts(ids, action, patch) {
      const set = new Set(ids)
      if (action === 'delete') {
        const imgs = readLS(K.images, {})
        for (const id of ids) delete imgs[id]
        writeLS(K.images, imgs)
        setProducts(getProducts().filter((p) => !set.has(p.id)))
      } else setProducts(getProducts().map((p) => (set.has(p.id) ? { ...p, ...patch } : p)))
    },
    async getProductImage(id) {
      return readLS(K.images, {})[id] || null
    },
    async setProductImage(id, dataUrl) {
      const imgs = readLS(K.images, {})
      if (dataUrl) imgs[id] = dataUrl
      else delete imgs[id]
      writeLS(K.images, imgs)
      setProducts(getProducts().map((p) => (p.id === id ? { ...p, imageV: dataUrl ? Date.now() : 0 } : p)))
    },
    async seedCatalog() {
      const ids = new Set(getProducts().map((p) => p.id))
      setProducts([...getProducts(), ...SEED_PRODUCTS.filter((p) => !ids.has(p.id))])
    },
    async updateSettings(patch) {
      writeLS(K.settings, { ...withSettingsDefaults(readLS(K.settings, null)), ...patch })
      emit('settings')
    },

    // ---------- מנהלים: הרשאות ----------
    subscribeAdmins(cb) {
      const run = () => cb(getAdmins())
      run()
      return on('admins', run)
    },
    async addAdmin({ name, pin, role }) {
      if (getAdmins().some((a) => a.pin === pin) || pin === SITE_CONFIG.demoAdminPin) throw new Error('הקוד הזה כבר תפוס')
      setAdmins([...getAdmins(), { id: uid('a_'), name: name.trim(), pin, role, addedAt: Date.now() }])
    },
    async removeAdmin(id) {
      setAdmins(getAdmins().filter((a) => a.id !== id || a.id === 'owner'))
    },

    // ---------- כניסה (דמו: קוד) ----------
    onAdminChange(cb) {
      cb(sessionState())
      return on('session', () => cb(sessionState()))
    },
    async adminSignIn(_email, pin) {
      const other = getAdmins().find((a) => a.pin && a.pin === pin)
      if (!other && (await sha256(pin)) !== (await sha256(SITE_CONFIG.demoAdminPin))) throw new Error('קוד שגוי')
      sessionStorage.setItem(K.session, other ? other.id : 'owner')
      emit('session')
    },
    async adminSignOut() {
      sessionStorage.removeItem(K.session)
      emit('session')
    },
  }
}
