/**
 * מתאם Firebase Firestore — סנכרון חי בין כל הטלפונים (חינם בחבילת Spark).
 * נטען רק אם הוגדר firebaseConfig (ראו src/config.js), כך שבמצב מקומי הוא לא מכביד על האתר.
 *
 * מבנה הנתונים:
 *   products/{id}       — מוצרים
 *   orders/{autoId}     — הזמנות
 *   meta/settings       — הגדרות החנות
 *   meta/votes          — הצבעות למוצר הבא
 *   meta/counter        — מונה מספרי הזמנות (#101, #102...)
 */
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  runTransaction,
  increment,
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth'
import { FIREBASE_CONFIG, SITE_CONFIG } from '../config.js'
import { SEED_PRODUCTS } from '../data/catalog.js'
import { DEFAULT_SETTINGS, DEFAULT_VOTES, withSettingsDefaults } from './defaults.js'

const stripUndefined = (obj) => JSON.parse(JSON.stringify(obj))

export function createFirebaseAdapter() {
  const app = initializeApp(FIREBASE_CONFIG)
  const db = getFirestore(app)
  const auth = getAuth(app)
  const settingsRef = doc(db, 'meta', 'settings')
  const votesRef = doc(db, 'meta', 'votes')
  const counterRef = doc(db, 'meta', 'counter')
  let isAdmin = false

  const chunked = async (items, fn) => {
    for (let i = 0; i < items.length; i += 400) {
      const batch = writeBatch(db)
      items.slice(i, i + 400).forEach((it) => fn(batch, it))
      await batch.commit()
    }
  }

  return {
    mode: 'firebase',

    async init() {
      onAuthStateChanged(auth, (u) => {
        isAdmin = Boolean(u)
      })
    },

    subscribeProducts(cb) {
      return onSnapshot(
        collection(db, 'products'),
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        (err) => console.error('products', err),
      )
    },
    subscribeSettings(cb) {
      return onSnapshot(
        settingsRef,
        (snap) => cb(withSettingsDefaults(snap.exists() ? snap.data() : DEFAULT_SETTINGS)),
        (err) => {
          console.error('settings', err)
          cb(withSettingsDefaults(null))
        },
      )
    },
    subscribeVotes(cb) {
      return onSnapshot(
        votesRef,
        (snap) => cb(snap.exists() ? { ...DEFAULT_VOTES, ...snap.data() } : DEFAULT_VOTES),
        () => cb(DEFAULT_VOTES),
      )
    },
    subscribeOrders(cb) {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(600))
      return onSnapshot(
        q,
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        (err) => console.error('orders', err),
      )
    },
    subscribeOrder(id, cb) {
      return onSnapshot(
        doc(db, 'orders', id),
        (snap) => cb(snap.exists() ? { ...snap.data(), id: snap.id } : null),
        () => cb(null),
      )
    },

    async createOrder(order) {
      const orderRef = doc(collection(db, 'orders'))
      const byId = {}
      for (const l of order.lines) if (l.productId) byId[l.productId] = (byId[l.productId] || 0) + l.qty
      const number = await runTransaction(db, async (tx) => {
        const c = await tx.get(counterRef)
        const next = (c.exists() ? c.data().value : 100) + 1
        tx.set(counterRef, { value: next })
        tx.set(orderRef, stripUndefined({ ...order, number: next }))
        return next
      })
      // עדכון מלאי ומונה מכירות (מחוץ לטרנזקציה כדי שמוצר שנמחק לא יכשיל הזמנה)
      await Promise.all(
        Object.entries(byId).map(([pid, q]) =>
          updateDoc(doc(db, 'products', pid), {
            qty: increment(-q),
            soldCount: increment(q),
            weekSold: increment(q),
          }).catch(() => null),
        ),
      )
      return { ...order, id: orderRef.id, number }
    },
    async updateOrder(id, patch) {
      await updateDoc(doc(db, 'orders', id), stripUndefined(patch))
    },
    async deleteOrder(id) {
      await deleteDoc(doc(db, 'orders', id))
    },

    async saveProduct(product) {
      await setDoc(doc(db, 'products', product.id), stripUndefined(product), { merge: true })
    },
    async deleteProduct(id) {
      await deleteDoc(doc(db, 'products', id))
    },
    async seedCatalog(mode = 'missing') {
      const snap = await getDocs(collection(db, 'products'))
      const ids = new Set(snap.docs.map((d) => d.id))
      const items = mode === 'reset' ? SEED_PRODUCTS : SEED_PRODUCTS.filter((p) => !ids.has(p.id))
      await chunked(items, (b, p) => b.set(doc(db, 'products', p.id), p))
      const s = await getDocs(collection(db, 'meta'))
      if (!s.docs.some((d) => d.id === 'settings')) await setDoc(settingsRef, DEFAULT_SETTINGS)
    },
    async resetWeekly() {
      const snap = await getDocs(collection(db, 'products'))
      await chunked(snap.docs, (b, d) => b.update(d.ref, { weekSold: 0 }))
    },
    async notifyMe(productId) {
      await updateDoc(doc(db, 'products', productId), { notifyCount: increment(1) })
    },

    async updateSettings(patch) {
      await setDoc(settingsRef, stripUndefined(patch), { merge: true })
    },

    async vote(option) {
      await setDoc(votesRef, { counts: { [option]: increment(1) } }, { merge: true })
    },
    async resetVotes() {
      await runTransaction(db, async (tx) => {
        const v = await tx.get(votesRef)
        const round = (v.exists() ? v.data().round || 1 : 1) + 1
        tx.set(votesRef, { round, counts: {} })
      })
    },

    async exportAll() {
      const [p, o, m] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'meta')),
      ])
      const meta = Object.fromEntries(m.docs.map((d) => [d.id, d.data()]))
      return {
        products: p.docs.map((d) => ({ ...d.data(), id: d.id })),
        orders: o.docs.map((d) => ({ ...d.data(), id: d.id })),
        settings: meta.settings || DEFAULT_SETTINGS,
        votes: meta.votes || DEFAULT_VOTES,
        counter: meta.counter?.value || 100,
      }
    },
    async importAll(data) {
      if (data.products) await chunked(data.products, (b, p) => b.set(doc(db, 'products', p.id), p))
      if (data.orders)
        await chunked(data.orders, (b, o) => {
          const { id, ...rest } = o
          b.set(doc(db, 'orders', id), rest)
        })
      if (data.settings) await setDoc(settingsRef, data.settings)
      if (data.votes) await setDoc(votesRef, data.votes)
      if (data.counter) await setDoc(counterRef, { value: data.counter })
    },

    // ---------- כניסת מנהלים (Firebase Auth — סיסמה) ----------
    isAdmin: () => isAdmin,
    onAdminChange(cb) {
      return onAuthStateChanged(auth, (u) => cb(Boolean(u)))
    },
    async adminSignIn(password) {
      try {
        await signInWithEmailAndPassword(auth, SITE_CONFIG.adminEmail, password)
      } catch {
        throw new Error('סיסמה שגויה (או שמשתמש המנהל עוד לא נוצר ב-Firebase)')
      }
    },
    async adminSignOut() {
      await signOut(auth)
    },
    async changeAdminSecret(newPassword) {
      if (!auth.currentUser) throw new Error('צריך להיות מחוברים')
      await updatePassword(auth.currentUser, newPassword)
    },
  }
}
