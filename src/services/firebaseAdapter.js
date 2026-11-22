/**
 * Firebase (Firestore + Authentication) — סנכרון חי, חינם בחבילת Spark.
 *
 * מבנה הנתונים:
 *   products/{id}             מוצרים (כולם קוראים, רק מנהלים כותבים)
 *   orders/{autoId}           הזמנות (לקוח רואה רק את שלו, לפי uid)
 *   paymentProofs/{orderId}   צילומי תשלום דחוסים (רק מנהלים רואים)
 *   productImages/{id}        תמונות מוצרים שהועלו מהדשבורד (נטענות רק כשהמוצר מוצג)
 *   admins/{email}            רשימת המנהלים המורשים
 *   meta/settings             הגדרות החנות
 *   meta/counter              מונה מספרי הזמנות
 *
 * לקוחות מחוברים אוטומטית כמשתמש אנונימי, וכך חוקי האבטחה מצמידים כל הזמנה לטלפון שיצר אותה.
 * צילומי התשלום נשמרים ב-Firestore (דחוסים), כי Cloud Storage דורש חבילה בתשלום.
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
  getDoc,
  getDocs,
  writeBatch,
  runTransaction,
  where,
} from 'firebase/firestore'
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'
import { FIREBASE_CONFIG } from '../config.js'
import { SEED_PRODUCTS } from '../data/catalog.js'
import { DEFAULT_SETTINGS, withSettingsDefaults } from './defaults.js'

const clean = (obj) => JSON.parse(JSON.stringify(obj))

const AUTH_ERRORS = {
  'auth/invalid-credential': 'אימייל או סיסמה שגויים',
  'auth/wrong-password': 'אימייל או סיסמה שגויים',
  'auth/user-not-found': 'אין משתמש עם האימייל הזה. בכניסה ראשונה בחרו "יצירת סיסמה".',
  'auth/email-already-in-use': 'כבר יש סיסמה לאימייל הזה. היכנסו רגיל או אפסו סיסמה.',
  'auth/weak-password': 'הסיסמה צריכה להיות לפחות 6 תווים',
  'auth/invalid-email': 'האימייל לא תקין',
  'auth/too-many-requests': 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.',
  'auth/admin-restricted-operation': 'צריך להפעיל ב-Firebase את שיטת הכניסה Anonymous (ראו README)',
  'auth/operation-not-allowed': 'שיטת הכניסה הזו לא הופעלה ב-Firebase (ראו README)',
}
const authError = (e) => new Error(AUTH_ERRORS[e?.code] || 'משהו השתבש בכניסה. נסו שוב.')

export function createFirebaseAdapter() {
  const app = initializeApp(FIREBASE_CONFIG)
  const db = getFirestore(app)
  const auth = getAuth(app)
  const settingsRef = doc(db, 'meta', 'settings')
  const counterRef = doc(db, 'meta', 'counter')

  let authReady
  const firstAuth = new Promise((r) => (authReady = r))
  onAuthStateChanged(auth, () => authReady())

  const ensureUser = async () => {
    await firstAuth
    if (auth.currentUser) return auth.currentUser
    try {
      const cred = await signInAnonymously(auth)
      return cred.user
    } catch (e) {
      throw authError(e)
    }
  }

  const batches = async (items, fn) => {
    for (let i = 0; i < items.length; i += 400) {
      const b = writeBatch(db)
      items.slice(i, i + 400).forEach((it) => fn(b, it))
      await b.commit()
    }
  }

  const adminState = async (user) => {
    if (!user || user.isAnonymous) return { status: 'signedOut' }
    const email = (user.email || '').toLowerCase()
    if (!user.emailVerified) return { status: 'unverified', email }
    try {
      const snap = await getDoc(doc(db, 'admins', email))
      if (!snap.exists()) return { status: 'notAdmin', email }
      const a = snap.data()
      return { status: 'admin', email, name: a.name || email, role: a.role || 'admin' }
    } catch {
      return { status: 'notAdmin', email }
    }
  }

  return {
    mode: 'firebase',
    async init() {},

    // ---------- קטלוג והגדרות ----------
    subscribeProducts(cb) {
      return onSnapshot(
        collection(db, 'products'),
        (s) => cb(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
        (e) => console.error('products', e),
      )
    },
    subscribeSettings(cb) {
      return onSnapshot(
        settingsRef,
        (s) => cb(withSettingsDefaults(s.exists() ? s.data() : null)),
        () => cb(withSettingsDefaults(null)),
      )
    },

    // ---------- לקוח ----------
    async myUid() {
      return (await ensureUser()).uid
    },
    async createOrder(order, proofDataUrl) {
      const user = await ensureUser()
      const orderRef = doc(collection(db, 'orders'))
      const data = clean({ ...order, uid: user.uid })
      const number = await runTransaction(db, async (tx) => {
        const c = await tx.get(counterRef)
        const next = c.exists() ? c.data().value + 1 : 101
        tx.set(counterRef, { value: next })
        tx.set(orderRef, { ...data, number: next })
        if (proofDataUrl) tx.set(doc(db, 'paymentProofs', orderRef.id), { uid: user.uid, dataUrl: proofDataUrl, createdAt: Date.now() })
        return next
      })
      return { ...data, id: orderRef.id, number }
    },
    subscribeOrder(id, cb) {
      let unsub = () => {}
      let cancelled = false
      ensureUser()
        .then(() => {
          if (cancelled) return
          unsub = onSnapshot(
            doc(db, 'orders', id),
            (s) => cb(s.exists() ? { ...s.data(), id: s.id } : null),
            () => cb(null),
          )
        })
        .catch(() => cb(null))
      return () => {
        cancelled = true
        unsub()
      }
    },

    // ---------- מנהלים: הזמנות ----------
    subscribeOrders(cb) {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500))
      return onSnapshot(
        q,
        (s) => cb(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
        (e) => console.error('orders', e),
      )
    },
    async getProof(orderId) {
      const s = await getDoc(doc(db, 'paymentProofs', orderId))
      return s.exists() ? s.data().dataUrl : null
    },
    async updateOrder(id, patch) {
      await updateDoc(doc(db, 'orders', id), clean({ ...patch, statusAt: Date.now() }))
    },
    async deleteOrder(id) {
      const b = writeBatch(db)
      b.delete(doc(db, 'paymentProofs', id))
      b.delete(doc(db, 'orders', id))
      await b.commit()
    },
    async purgeProofs(olderThanDays = 7) {
      const cutoff = Date.now() - olderThanDays * 86400000
      const s = await getDocs(query(collection(db, 'orders'), where('createdAt', '<', cutoff)))
      const done = s.docs.filter((d) => ['delivered', 'rejected', 'cancelled'].includes(d.data().status) && d.data().payment?.hasProof)
      await batches(done, (b, d) => {
        b.delete(doc(db, 'paymentProofs', d.id))
        b.update(d.ref, { 'payment.hasProof': false })
      })
      return done.length
    },

    // ---------- מנהלים: מוצרים והגדרות ----------
    async saveProduct(product) {
      await setDoc(doc(db, 'products', product.id), clean(product), { merge: true })
    },
    async deleteProduct(id) {
      const b = writeBatch(db)
      b.delete(doc(db, 'productImages', id))
      b.delete(doc(db, 'products', id))
      await b.commit()
    },
    async getProductImage(id) {
      const s = await getDoc(doc(db, 'productImages', id))
      return s.exists() ? s.data().dataUrl : null
    },
    async setProductImage(id, dataUrl) {
      const b = writeBatch(db)
      if (dataUrl) b.set(doc(db, 'productImages', id), { dataUrl, updatedAt: Date.now() })
      else b.delete(doc(db, 'productImages', id))
      b.set(doc(db, 'products', id), { imageV: dataUrl ? Date.now() : 0 }, { merge: true })
      await b.commit()
    },
    async seedCatalog() {
      const s = await getDocs(collection(db, 'products'))
      const ids = new Set(s.docs.map((d) => d.id))
      await batches(
        SEED_PRODUCTS.filter((p) => !ids.has(p.id)),
        (b, p) => b.set(doc(db, 'products', p.id), p),
      )
      const st = await getDoc(settingsRef)
      if (!st.exists()) await setDoc(settingsRef, DEFAULT_SETTINGS)
    },
    async updateSettings(patch) {
      await setDoc(settingsRef, clean(patch), { merge: true })
    },

    // ---------- מנהלים: הרשאות ----------
    subscribeAdmins(cb) {
      return onSnapshot(
        collection(db, 'admins'),
        (s) => cb(s.docs.map((d) => ({ ...d.data(), email: d.id }))),
        (e) => console.error('admins', e),
      )
    },
    async addAdmin({ name, email, role }) {
      const e = email.trim().toLowerCase()
      await setDoc(doc(db, 'admins', e), { name: name.trim(), role, addedAt: Date.now(), addedBy: auth.currentUser?.email || '' })
    },
    async removeAdmin(email) {
      await deleteDoc(doc(db, 'admins', email))
    },

    // ---------- כניסת מנהלים: אימייל + סיסמה ----------
    onAdminChange(cb) {
      return onAuthStateChanged(auth, async (u) => cb(await adminState(u)))
    },
    async adminSignIn(email, password) {
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      } catch (e) {
        throw authError(e)
      }
    },
    async adminSignUp(email, password) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await sendEmailVerification(cred.user)
      } catch (e) {
        throw authError(e)
      }
    },
    async resendVerification() {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser)
    },
    async recheckVerification(cb) {
      if (!auth.currentUser) return
      await auth.currentUser.reload()
      await auth.currentUser.getIdToken(true)
      cb(await adminState(auth.currentUser))
    },
    async resetPassword(email) {
      try {
        await sendPasswordResetEmail(auth, email.trim())
      } catch (e) {
        throw authError(e)
      }
    },
    async adminSignOut() {
      await signOut(auth)
    },
  }
}
