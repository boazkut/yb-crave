/**
 * מתאם נתונים מקומי (LocalStorage).
 * עובד מיידית בלי שום הגדרה — מושלם לדמו ולבדיקות.
 * מסתנכרן בין לשוניות באותו מכשיר, אבל לא בין טלפונים שונים (לזה יש את Firebase).
 */
import { SEED_PRODUCTS, CATALOG_VERSION } from '../data/catalog.js'
import { DEFAULT_SETTINGS, DEFAULT_VOTES, withSettingsDefaults } from './defaults.js'
import { readLS, writeLS, uid, sha256 } from '../lib/utils.js'
import { SITE_CONFIG } from '../config.js'

const K = {
  products: 'ybc:products',
  settings: 'ybc:settings',
  orders: 'ybc:orders',
  votes: 'ybc:votes',
  counter: 'ybc:counter',
  version: 'ybc:catalogVersion',
  admin: 'ybc:adminSession',
}

const listeners = new Map()
const on = (key, cb) => {
  if (!listeners.has(key)) listeners.set(key, new Set())
  listeners.get(key).add(cb)
  return () => listeners.get(key)?.delete(cb)
}
const emit = (key) => listeners.get(key)?.forEach((cb) => cb())

const keyToTopic = Object.fromEntries(Object.entries(K).map(([topic, k]) => [k, topic]))

export function createLocalAdapter() {
  const adminListeners = new Set()

  const getProducts = () => readLS(K.products, [])
  const setProducts = (list) => {
    writeLS(K.products, list)
    emit('products')
  }
  const getSettings = () => withSettingsDefaults(readLS(K.settings, null))
  const getOrders = () => readLS(K.orders, [])
  const setOrders = (list) => {
    writeLS(K.orders, list)
    emit('orders')
  }

  return {
    mode: 'local',

    async init() {
      const existing = readLS(K.products, null)
      if (!existing) {
        writeLS(K.products, SEED_PRODUCTS)
      } else if (readLS(K.version, 0) < CATALOG_VERSION) {
        const ids = new Set(existing.map((p) => p.id))
        writeLS(K.products, [...existing, ...SEED_PRODUCTS.filter((p) => !ids.has(p.id))])
      }
      writeLS(K.version, CATALOG_VERSION)
      if (!readLS(K.settings, null)) writeLS(K.settings, DEFAULT_SETTINGS)
      window.addEventListener('storage', (e) => {
        const topic = keyToTopic[e.key]
        if (topic) emit(topic)
      })
    },

    subscribeProducts(cb) {
      const run = () => cb(getProducts())
      run()
      return on('products', run)
    },
    subscribeSettings(cb) {
      const run = () => cb(getSettings())
      run()
      return on('settings', run)
    },
    subscribeVotes(cb) {
      const run = () => cb(readLS(K.votes, DEFAULT_VOTES))
      run()
      return on('votes', run)
    },
    subscribeOrders(cb) {
      const run = () => cb([...getOrders()].sort((a, b) => b.createdAt - a.createdAt))
      run()
      return on('orders', run)
    },
    subscribeOrder(id, cb) {
      const run = () => cb(getOrders().find((o) => o.id === id) || null)
      run()
      return on('orders', run)
    },

    async createOrder(order) {
      const number = readLS(K.counter, 100) + 1
      writeLS(K.counter, number)
      const saved = { ...order, id: uid('o_'), number }
      setOrders([...getOrders(), saved])
      // עדכון מלאי ומכירות
      const byId = {}
      for (const l of order.lines) if (l.productId) byId[l.productId] = (byId[l.productId] || 0) + l.qty
      setProducts(
        getProducts().map((p) =>
          byId[p.id]
            ? {
                ...p,
                qty: Math.max(0, (p.qty ?? 0) - byId[p.id]),
                soldCount: (p.soldCount || 0) + byId[p.id],
                weekSold: (p.weekSold || 0) + byId[p.id],
              }
            : p,
        ),
      )
      return saved
    },
    async updateOrder(id, patch) {
      setOrders(getOrders().map((o) => (o.id === id ? { ...o, ...patch } : o)))
    },
    async deleteOrder(id) {
      setOrders(getOrders().filter((o) => o.id !== id))
    },

    async saveProduct(product) {
      const list = getProducts()
      const exists = list.some((p) => p.id === product.id)
      setProducts(exists ? list.map((p) => (p.id === product.id ? { ...p, ...product } : p)) : [...list, product])
    },
    async deleteProduct(id) {
      setProducts(getProducts().filter((p) => p.id !== id))
    },
    async seedCatalog(mode = 'missing') {
      if (mode === 'reset') return setProducts(SEED_PRODUCTS)
      const ids = new Set(getProducts().map((p) => p.id))
      setProducts([...getProducts(), ...SEED_PRODUCTS.filter((p) => !ids.has(p.id))])
    },
    async resetWeekly() {
      setProducts(getProducts().map((p) => ({ ...p, weekSold: 0 })))
    },
    async notifyMe(productId) {
      setProducts(getProducts().map((p) => (p.id === productId ? { ...p, notifyCount: (p.notifyCount || 0) + 1 } : p)))
    },

    async updateSettings(patch) {
      writeLS(K.settings, { ...getSettings(), ...patch })
      emit('settings')
    },

    async vote(option) {
      const v = readLS(K.votes, DEFAULT_VOTES)
      writeLS(K.votes, { ...v, counts: { ...v.counts, [option]: (v.counts[option] || 0) + 1 } })
      emit('votes')
    },
    async resetVotes() {
      const v = readLS(K.votes, DEFAULT_VOTES)
      writeLS(K.votes, { round: (v.round || 1) + 1, counts: {} })
      emit('votes')
    },

    async exportAll() {
      return {
        products: getProducts(),
        settings: getSettings(),
        orders: getOrders(),
        votes: readLS(K.votes, DEFAULT_VOTES),
        counter: readLS(K.counter, 100),
      }
    },
    async importAll(data) {
      if (data.products) setProducts(data.products)
      if (data.settings) {
        writeLS(K.settings, data.settings)
        emit('settings')
      }
      if (data.orders) setOrders(data.orders)
      if (data.votes) {
        writeLS(K.votes, data.votes)
        emit('votes')
      }
      if (data.counter) writeLS(K.counter, data.counter)
    },

    // ---------- כניסת מנהלים (PIN) ----------
    isAdmin: () => sessionStorage.getItem(K.admin) === '1',
    onAdminChange(cb) {
      adminListeners.add(cb)
      cb(sessionStorage.getItem(K.admin) === '1')
      return () => adminListeners.delete(cb)
    },
    async adminSignIn(pin) {
      const s = getSettings()
      const expected = s.adminPinHash || (await sha256(SITE_CONFIG.defaultAdminPin))
      if ((await sha256(pin)) !== expected) throw new Error('קוד שגוי')
      sessionStorage.setItem(K.admin, '1')
      adminListeners.forEach((cb) => cb(true))
    },
    async adminSignOut() {
      sessionStorage.removeItem(K.admin)
      adminListeners.forEach((cb) => cb(false))
    },
    async changeAdminSecret(newPin) {
      await this.updateSettings({ adminPinHash: await sha256(newPin) })
    },
  }
}
