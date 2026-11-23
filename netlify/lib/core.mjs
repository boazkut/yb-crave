/**
 * השרת של Y&B CRAVE (Netlify Functions + Netlify Blobs).
 * עובד מיד אחרי פריסה, בלי שום הגדרה: הזמנות, מלאי, הגדרות, מנהלים והתראות Push.
 *
 * מבנה המפתחות בחנות "ybcrave":
 *   products/<id>          מוצר
 *   pimg/<id>              תמונת מוצר (data URL)
 *   meta/settings          הגדרות החנות
 *   meta/secrets           מפתחות שהשרת יוצר לעצמו (חתימת התחברות + Push). לעולם לא נשלח החוצה.
 *   orders/<id>            הזמנה (id מתחיל בזמן יצירה, כך שהרשימה ממוינת)
 *   proofs/<id>            צילום אישור תשלום (רק מנהלים)
 *   num/<date>/<n>         שריון מספר הזמנה ייחודי ליום (onlyIfNew, בלי מונה)
 *   admins/<id>            מנהל: שם, תפקיד, קוד אישי מוצפן
 *   push/admin/<hash>      מנוי התראות של מכשיר מנהל
 *   push/order/<id>        מנוי התראות של לקוח להזמנה מסוימת
 *   guard/ph|dv/<hash>     הזמנות אחרונות של טלפון / מכשיר (הגבלת הטרדות)
 *   cust/<hash>            כמה הזמנות של המספר הזה כבר הגיעו ("לקוח חדש" אצל המנהלים)
 *   meta/blocks            מזמינים שהמנהלים חסמו
 */
import crypto from 'node:crypto'
import * as webpush from 'web-push'
import { purgeCache } from '@netlify/functions'
import { db } from './store.mjs'
import { SEED_PRODUCTS, DEFAULT_CATEGORIES, REMOVED_CATEGORIES } from '../../src/data/catalog.js'
import { DEFAULT_SETTINGS, withSettingsDefaults } from '../../src/services/defaults.js'
import { priceCart } from '../../src/lib/pricing.js'
import { MAX_PER_ITEM, MAX_ITEMS, nameProblem, LINKISH } from '../../src/lib/limits.js'

const env = (k) => globalThis.Netlify?.env?.get?.(k) ?? process.env[k]
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers },
  })
const fail = (status, error, extra = {}) => json({ error, ...extra }, status)

// ---------- סודות שהשרת מייצר לעצמו ----------
let secretsCache = null
async function secrets() {
  if (secretsCache) return secretsCache
  const store = db()
  let s = await store.get('meta/secrets', { type: 'json' })
  if (!s) {
    const v = webpush.generateVAPIDKeys()
    const fresh = { authSecret: crypto.randomBytes(32).toString('hex'), vapidPublic: v.publicKey, vapidPrivate: v.privateKey }
    const { modified } = await store.setJSON('meta/secrets', fresh, { onlyIfNew: true })
    s = modified ? fresh : await store.get('meta/secrets', { type: 'json' })
  }
  secretsCache = s
  return s
}

// ---------- טוקן מנהל חתום ----------
const b64 = (buf) => Buffer.from(buf).toString('base64url')
// כל הכניסות של המנהלים שנוצרו לפני הרגע הזה בוטלו (לבקשת המנהלים, 23.11.2026):
// כולם נכנסים מחדש עם הקוד האישי שלהם. הקודים עצמם לא השתנו.
const SESSIONS_VALID_FROM = Date.parse('2026-11-23T15:14:00Z')
const TOKEN_MS = 1000 * 60 * 60 * 24 * 60

async function signToken(payload) {
  const { authSecret } = await secrets()
  const body = b64(JSON.stringify({ iat: Date.now(), ...payload }))
  const sig = b64(crypto.createHmac('sha256', authSecret).update(body).digest())
  return `${body}.${sig}`
}
async function readAdmin(req) {
  const h = req.headers.get('authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const { authSecret } = await secrets()
  const expect = b64(crypto.createHmac('sha256', authSecret).update(body).digest())
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null
  let p
  try {
    p = JSON.parse(Buffer.from(body, 'base64url').toString())
  } catch {
    return null
  }
  if (!p.exp || p.exp < Date.now()) return null
  if ((p.iat || p.exp - TOKEN_MS) < SESSIONS_VALID_FROM) return null
  const admin = await db().get(`admins/${p.sub}`, { type: 'json' })
  if (!admin) return null
  // אחרי החלפת קוד כל הכניסות הישנות מתבטלות
  if ((p.v || 0) !== (admin.v || 0)) return null
  return { id: admin.id, name: admin.name, role: admin.role, mustChangePin: !admin.pinV2, v: admin.v || 0 }
}

// ---------- מנהלים ----------
const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex')
const samePin = (pin, a) => {
  const h = hashPin(pin, a.salt)
  return h.length === a.hash.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(a.hash))
}
/** קוד חזק: 6–8 ספרות, לא הקוד ההתחלתי, לא ספרה אחת חוזרת ולא רצף */
function pinProblem(pin) {
  const s = String(pin || '')
  if (!/^\d{6,8}$/.test(s)) return 'הקוד צריך להיות 6 עד 8 ספרות'
  if (/^(\d)\1+$/.test(s)) return 'קוד עם אותה ספרה שוב ושוב קל מדי לניחוש'
  if ('01234567890123456789'.includes(s) || '98765432109876543210'.includes(s)) return 'קוד של ספרות ברצף קל מדי לניחוש'
  if (/^(\d\d)\1+$/.test(s) || /^(\d\d\d)\1$/.test(s) || s.includes(env('ADMIN_PIN') || '2580')) return 'בחרו קוד פחות צפוי'
  return null
}

// הגנה מניחוש קודים: 5 טעויות מאותה כתובת = נעילה ל-15 דקות; 40 טעויות בכלל ב-10 דקות = נעילה כללית ל-10 דקות
const LOCK = { ipMax: 5, ipWindow: 15 * 60_000, ipLock: 15 * 60_000, allMax: 40, allWindow: 10 * 60_000, allLock: 10 * 60_000 }
async function lockState(ipKey) {
  const store = db()
  const [ip, all] = await Promise.all([store.get(ipKey, { type: 'json' }), store.get('auth/all', { type: 'json' })])
  const now = Date.now()
  const until = Math.max(ip?.until || 0, all?.until || 0)
  return { ip, all, locked: until > now, minutes: Math.ceil((until - now) / 60_000) }
}
async function recordFail(ipKey, st) {
  const store = db()
  const now = Date.now()
  const bumpRec = (rec, max, windowMs, lockMs) => {
    const fresh = !rec || now - rec.first > windowMs
    const n = fresh ? 1 : rec.n + 1
    return { n, first: fresh ? now : rec.first, until: n >= max ? now + lockMs : rec?.until || 0 }
  }
  await Promise.all([
    store.setJSON(ipKey, bumpRec(st.ip, LOCK.ipMax, LOCK.ipWindow, LOCK.ipLock)),
    store.setJSON('auth/all', bumpRec(st.all, LOCK.allMax, LOCK.allWindow, LOCK.allLock)),
  ])
}

async function listAdmins() {
  const store = db()
  const { blobs } = await store.list({ prefix: 'admins/' })
  const all = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })))
  return all.filter(Boolean)
}
async function ensureOwner() {
  const admins = await listAdmins()
  if (admins.length) return admins
  const salt = crypto.randomBytes(16).toString('hex')
  const owner = { id: 'owner', name: 'מנהל ראשי', role: 'owner', salt, hash: hashPin(env('ADMIN_PIN') || '2580', salt), addedAt: Date.now() }
  await db().setJSON('admins/owner', owner, { onlyIfNew: true })
  return listAdmins()
}
const publicAdmin = (a) => ({ id: a.id, name: a.name, role: a.role, addedAt: a.addedAt || 0 })

export async function login(req, ctx) {
  if (req.method !== 'POST') return fail(405, 'method')
  const ip = ctx?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown'
  const { authSecret } = await secrets()
  const ipKey = `auth/ip/${crypto.createHmac('sha256', authSecret).update(ip).digest('hex').slice(0, 24)}`
  const st = await lockState(ipKey)
  if (st.locked) return fail(429, `יותר מדי ניסיונות. נסו שוב בעוד ${st.minutes} דקות`)
  const { pin } = await req.json().catch(() => ({}))
  const admins = await ensureOwner()
  const match = /^\d{4,8}$/.test(String(pin || '')) ? admins.find((a) => samePin(pin, a)) : null
  if (!match) {
    await recordFail(ipKey, st)
    return fail(401, 'קוד שגוי')
  }
  await db().delete(ipKey)
  const token = await signToken({ sub: match.id, v: match.v || 0, exp: Date.now() + 1000 * 60 * 60 * 24 * 60 })
  return json({ token, admin: { ...publicAdmin(match), mustChangePin: !match.pinV2 } })
}

// ---------- בדיקת קלט ----------
const SAFE_IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
const ORDER_STATUSES = ['awaiting_payment', 'preparing', 'ready', 'on_the_way', 'delivered', 'rejected', 'cancelled']
const str = (v, n) => String(v ?? '').trim().slice(0, n)
const SAFE_URL = /^(\/[\w\-./]*|https:\/\/[^\s"'<>]{1,500})$/
const COLOR = /^#[0-9a-fA-F]{3,8}$/

function cleanProduct(p, cur, id) {
  const out = { ...cur, id }
  if ('name' in p) out.name = str(p.name, 80)
  if ('note' in p) out.note = str(p.note, 160)
  if ('category' in p) out.category = str(p.category, 40)
  if ('price' in p) {
    const n = Number(p.price)
    if (Number.isFinite(n) && n >= 0 && n <= 1000) out.price = n
  }
  if ('stock' in p && ['in', 'low', 'out'].includes(p.stock)) out.stock = p.stock
  if ('sort' in p && Number.isFinite(Number(p.sort))) out.sort = Number(p.sort)
  if ('bagEligible' in p) out.bagEligible = Boolean(p.bagEligible)
  if ('imageUrl' in p) out.imageUrl = SAFE_URL.test(String(p.imageUrl || '')) ? String(p.imageUrl) : ''
  if ('comboSlots' in p) out.comboSlots = Array.isArray(p.comboSlots) ? JSON.parse(JSON.stringify(p.comboSlots.slice(0, 6))) : null
  if ('art' in p && p.art && typeof p.art === 'object') {
    out.art = {
      shape: str(p.art.shape, 20),
      c1: COLOR.test(p.art.c1) ? p.art.c1 : '#999999',
      c2: COLOR.test(p.art.c2) ? p.art.c2 : '#EEEEEE',
      label: str(p.art.label, 20),
      glyph: str(p.art.glyph, 4),
    }
  }
  if (!out.name) out.name = 'מוצר'
  if (!Number.isFinite(out.price)) out.price = 0
  return out
}

function cleanSettings(p) {
  const out = {}
  if ('storeOpen' in p) out.storeOpen = Boolean(p.storeOpen)
  for (const k of ['transferPhone', 'whatsappNumber']) if (k in p) out[k] = str(p[k], 20)
  for (const k of ['payboxLink', 'bitLink']) if (k in p) out[k] = p[k] === '' || SAFE_URL.test(String(p[k])) ? String(p[k] || '') : ''
  if (Array.isArray(p.supportPhones)) out.supportPhones = p.supportPhones.slice(0, 5).map((x) => str(x, 20)).filter(Boolean)
  if (Array.isArray(p.categories)) {
    out.categories = p.categories.slice(0, 30).map((c) => ({
      id: str(c.id, 40).replace(/[^\w-]/g, '') || crypto.randomBytes(3).toString('hex'),
      name: str(c.name, 40),
      ...(c.desc ? { desc: str(c.desc, 120) } : {}),
      ...(c.hidden ? { hidden: true } : {}),
    }))
  }
  if (Array.isArray(p.deals)) {
    out.deals = p.deals.slice(0, 40).map((d) => {
      const type = d.type === 'bundle' ? 'bundle' : 'price'
      const price = Math.min(1000, Math.max(0, Number(d.price) || 0))
      return {
        id: str(d.id, 40).replace(/[^\w-]/g, '') || crypto.randomBytes(4).toString('hex'),
        title: str(d.title, 40) || 'מבצע',
        type,
        productIds: (Array.isArray(d.productIds) ? d.productIds : []).slice(0, 200).map((x) => str(x, 80)).filter((x) => /^[\w-]+$/.test(x)),
        price,
        qty: type === 'bundle' ? Math.min(20, Math.max(2, Math.floor(Number(d.qty) || 2))) : 1,
        active: d.active !== false,
        endsAt: Number(d.endsAt) > 0 ? Number(d.endsAt) : null,
        createdAt: Number(d.createdAt) || Date.now(),
      }
    })
  }
  if (Array.isArray(p.costLog)) {
    out.costLog = p.costLog.slice(-500).map((x) => ({ id: str(x.id, 40), amount: Number(x.amount) || 0, note: str(x.note, 80), at: Number(x.at) || Date.now() }))
  }
  return out
}

// ---------- קטלוג והגדרות ----------
async function getSettings() {
  return withSettingsDefaults(await db().get('meta/settings', { type: 'json' }))
}
async function listProducts() {
  const store = db()
  let { blobs } = await store.list({ prefix: 'products/' })
  if (!blobs.length && !(await store.get('meta/seeded'))) {
    await Promise.all(SEED_PRODUCTS.map((p) => store.setJSON(`products/${p.id}`, p, { onlyIfNew: true })))
    await store.set('meta/seeded', String(Date.now()))
    ;({ blobs } = await store.list({ prefix: 'products/' }))
  }
  const all = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })))
  return all.filter((p) => p && !REMOVED_CATEGORIES.includes(p.category)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
}
const publicSettings = (s) => {
  const { costLog, ...rest } = s
  return rest
}

// ---------- התראות Push ----------
async function pushTo(key, payload) {
  const store = db()
  const rec = await store.get(key, { type: 'json' })
  if (!rec?.sub) return
  const s = await secrets()
  webpush.setVapidDetails(env('PUSH_SUBJECT') || 'mailto:noreply@yb-crave.app', s.vapidPublic, s.vapidPrivate)
  try {
    // urgency high: אנדרואיד מעיר את הטלפון מיד, גם במצב חיסכון בסוללה
    await webpush.sendNotification(rec.sub, JSON.stringify(payload), { TTL: 60 * 60, urgency: 'high' })
  } catch (e) {
    if (e?.statusCode === 404 || e?.statusCode === 410) await store.delete(key)
  }
}
async function pushAdmins(payload) {
  const { blobs } = await db().list({ prefix: 'push/admin/' })
  await Promise.all(blobs.map((b) => pushTo(b.key, payload)))
}
const later = (ctx, p) => (ctx?.waitUntil ? ctx.waitUntil(p.catch(() => {})) : p.catch(() => {}))

// ---------- עדכונים מהירים ----------
// לכל סוג נתונים יש "גרסה" (c = קטלוג והגדרות, o = הזמנות) שמשתנה בכל כתיבה.
// הטלפונים בודקים את הגרסאות כל כמה שניות דרך ה-CDN (בלי להפעיל את השרת),
// ומושכים נתונים רק כשמשהו השתנה. אחרי כל כתיבה מנקים את העותק ב-CDN כדי שהשינוי ייראה מיד.
// הניקוי ב-CDN עובד (נבדק באתר החי), אז הזמן הזה הוא רק רשת ביטחון
const REV_TTL = 60
const purge = async (tags) => {
  try {
    await purgeCache({ tags })
    return 'ok'
  } catch (e) {
    console.log('purge failed:', e?.message)
    return e?.message || 'error'
  }
}
async function bump(ctx, kind) {
  await db().set(`rev/${kind}`, String(Date.now()))
  later(ctx, purge(kind === 'c' ? ['rev', 'catalog'] : ['rev']))
}

const CUSTOMER_PUSH = {
  preparing: (o) => ({ title: 'התשלום אושר', body: `מכינים לך את הזמנה #${o.number}` }),
  ready: (o) => ({ title: 'ההזמנה מוכנה', body: `הזמנה #${o.number} מוכנה, עוד רגע יוצאים אליך` }),
  on_the_way: (o) => ({ title: 'בדרך אליך', body: `הזמנה #${o.number} בדרך לחדר ${o.customer.room}` }),
  delivered: () => ({ title: 'נמסר. בתיאבון!', body: 'תודה שקנית ב-Y&B CRAVE. מחכים לך בפעם הבאה' }),
  rejected: (o) => ({ title: 'התשלום לא אושר', body: o.rejectReason ? `הסיבה: ${o.rejectReason}` : `לגבי הזמנה #${o.number}` }),
}
const THANKS_PUSH = (o) => ({
  title: 'תודה שקנית ב-Y&B!',
  body: `קיבלנו את הזמנה #${o.number}. נעדכן אותך כשהיא מוכנה וכשהיא בדרך לחדר ${o.customer.room}`,
})

// ---------- מלאי לפי כמות ----------
// מוצר עם qty (מספר) = מלאי שנספר: כל הזמנה מורידה, ב-0 הוא "אזל", עד 3 "נשארו אחרונים".
// qty ריק = בלי ספירה (המנהל קובע ידנית במלאי / אזל).
const LOW_AT = 3
const stockFromQty = (qty) => (qty <= 0 ? 'out' : qty <= LOW_AT ? 'low' : 'in')
const tracked = (p) => Number.isInteger(p?.qty)

/** עדכון מוצר בבטחה: כותב רק אם אף אחד לא שינה אותו באמצע (למשל הזמנה שהורידה מהמלאי) */
async function updateProduct(id, fn) {
  const store = db()
  for (let i = 0; i < 8; i += 1) {
    const res = await store.getWithMetadata(`products/${id}`, { type: 'json' })
    const cur = res?.data || null
    const next = fn(cur)
    if (next === undefined) return { ok: true, product: cur, unchanged: true }
    if (next && next.error) return { ok: false, ...next, product: cur }
    const w = cur ? await store.setJSON(`products/${id}`, next, { onlyIfMatch: res.etag }) : await store.setJSON(`products/${id}`, next, { onlyIfNew: true })
    if (w.modified) return { ok: true, product: next }
  }
  return { ok: false, error: 'busy' }
}

/** שינוי כמות במלאי. delta שלילי = נמכר */
function adjustStock(id, delta, { allowShort = false } = {}) {
  return updateProduct(id, (p) => {
    if (!p || !tracked(p)) return undefined
    const want = p.qty + delta
    if (want < 0 && !allowShort) return { error: 'short', left: p.qty, name: p.name }
    const qty = Math.max(0, want)
    return { ...p, qty, stock: stockFromQty(qty) }
  })
}

async function returnStock(order) {
  for (const [id, n] of order.stock || []) await adjustStock(id, n, { allowShort: true })
}
async function takeStockAgain(order) {
  for (const [id, n] of order.stock || []) await adjustStock(id, -n, { allowShort: true })
}

// ---------- הזמנות ----------
const PHONE_RE = /^0(5\d|7\d)\d{7}$|^0[23489]\d{7}$/
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })

async function reserveNumber() {
  const store = db()
  const day = today()
  for (let i = 0; i < 25; i++) {
    const n = 100 + Math.floor(Math.random() * 900)
    const { modified } = await store.set(`num/${day}/${n}`, '1', { onlyIfNew: true })
    if (modified) return n
  }
  return 1000 + Math.floor(Math.random() * 9000)
}


// ---------- הגנה מהטרדות ----------
// לכל מספר טלפון ולכל מכשיר: עד 2 הזמנות פתוחות בבת אחת ועד 4 הזמנות בשעה.
// מנהל יכול לחסום מזמין מתוך ההזמנה: המספר והמכשיר שלו לא יוכלו להזמין יותר.
// לא מגבילים לפי כתובת רשת: בפנימייה / בבית ספר כולם יוצאים מאותה כתובת.
const GUARD = { openMax: 2, hourMax: 4 }
const OPEN = ['awaiting_payment', 'preparing', 'ready', 'on_the_way']
const DEVICE_RE = /^[A-Za-z0-9_-]{16,64}$/
const DAY = 86_400_000

async function hashOf(kind, value) {
  const { authSecret } = await secrets()
  return crypto.createHmac('sha256', authSecret).update(`${kind}:${value}`).digest('hex').slice(0, 24)
}

/** עדכון JSON בבטחה גם כששתי בקשות מגיעות יחד. fn מחזיר undefined = בלי שינוי */
async function updateJSON(key, fn) {
  const store = db()
  for (let i = 0; i < 8; i += 1) {
    const res = await store.getWithMetadata(key, { type: 'json' })
    const cur = res?.data ?? null
    const next = fn(cur)
    if (next === undefined) return cur
    const w = res ? await store.setJSON(key, next, { onlyIfMatch: res.etag }) : await store.setJSON(key, next, { onlyIfNew: true })
    if (w.modified) return next
  }
  return null
}

async function readBlocks() {
  return (await db().get('meta/blocks', { type: 'json' }))?.list || []
}

/** 'open' / 'hour' אם צריך לעצור, אחרת null */
async function guardCheck(keys) {
  const store = db()
  const now = Date.now()
  for (const k of keys) {
    const recent = ((await store.get(k, { type: 'json' }))?.recent || []).filter((x) => now - x.at < DAY)
    if (recent.filter((x) => now - x.at < 3_600_000).length >= GUARD.hourMax) return 'hour'
    const orders = await Promise.all(recent.slice(-8).map((x) => store.get(`orders/${x.id}`, { type: 'json' })))
    if (orders.filter((o) => o && OPEN.includes(o.status)).length >= GUARD.openMax) return 'open'
  }
  return null
}
function guardRecord(keys, id) {
  const at = Date.now()
  return Promise.all(keys.map((k) => updateJSON(k, (cur) => ({ recent: [...(cur?.recent || []).filter((x) => at - x.at < DAY), { id, at }].slice(-20) }))))
}

/** פעם אחת: סופרים הזמנות שכבר הגיעו לכל מספר, כדי שלקוחות ותיקים לא יופיעו כ"חדשים" */
async function backfillCustomers() {
  const store = db()
  const { modified } = await store.set('meta/custV1', String(Date.now()), { onlyIfNew: true })
  if (!modified) return
  const counts = {}
  for (const o of await listOrders(0)) {
    if (o.status !== 'delivered' || !o.customer?.phone) continue
    const ph = await hashOf('ph', o.customer.phone)
    counts[ph] = (counts[ph] || 0) + 1
  }
  await Promise.all(Object.entries(counts).map(([ph, d]) => store.setJSON(`cust/${ph}`, { d })))
}

async function createOrder(req, ctx) {
  const body = await req.json().catch(() => null)
  if (!body?.order) return fail(400, 'הזמנה לא תקינה')
  const settings = await getSettings()
  if (!settings.storeOpen) return fail(403, 'החנות סגורה כרגע')
  const o = body.order
  const c = o.customer || {}
  const badName = nameProblem(c.name)
  if (badName) return fail(400, badName)
  if (!PHONE_RE.test(String(c.phone || ''))) return fail(400, 'מספר טלפון לא תקין')
  const room = String(c.room || '').trim()
  if (!room || room.length > 20 || LINKISH.test(room)) return fail(400, 'מספר חדר לא תקין')
  if (LINKISH.test(String(c.note || ''))) return fail(400, 'בלי קישורים בהערה')
  if (!Array.isArray(o.lines) || !o.lines.length || o.lines.length > 60) return fail(400, 'ההזמנה ריקה')
  const method = o.payment?.method
  if (!['paybox', 'bit', 'cash'].includes(method)) return fail(400, 'אמצעי תשלום לא תקין')
  const proof = typeof body.proof === 'string' && SAFE_IMAGE.test(body.proof) ? body.proof : null
  if (method === 'paybox' && !proof) return fail(400, 'צריך לצרף צילום של אישור התשלום')
  if (proof && proof.length > 900_000) return fail(413, 'התמונה גדולה מדי')

  // חסומים, ומי ששולח יותר מדי
  const device = typeof body.device === 'string' && DEVICE_RE.test(body.device) ? body.device : ''
  const ph = await hashOf('ph', c.phone)
  const dv = device ? await hashOf('dv', device) : ''
  if ((await readBlocks()).some((x) => x.ph === ph || (dv && x.dv === dv))) {
    const help = settings.supportPhones?.[0]
    // מספר הטלפון מבודד (LRI/PDI) ובלי שבירת שורה במקף, כדי שלא יתהפך בתוך עברית
    const num = help ? `\u2066${String(help).replace(/-/g, '\u2011')}\u2069` : ''
    return fail(403, `אי אפשר להזמין מהמכשיר הזה.${num ? ` אם זו טעות: ${num}` : ''}`, { code: 'BLOCKED' })
  }
  const guardKeys = [`guard/ph/${ph}`, ...(dv ? [`guard/dv/${dv}`] : [])]
  const tooMany = await guardCheck(guardKeys)
  if (tooMany === 'open') return fail(429, 'כבר יש 2 הזמנות בטיפול. אפשר להזמין שוב אחרי שאחת מהן תגיע.', { code: 'TOO_MANY_OPEN' })
  if (tooMany === 'hour') return fail(429, 'יותר מדי הזמנות בזמן קצר. נסו שוב מאוחר יותר.', { code: 'TOO_MANY' })

  // בדיקת מחירים מול הקטלוג בשרת
  const products = Object.fromEntries((await listProducts()).map((p) => [p.id, p]))
  const raw = []
  for (const l of o.lines) {
    if (l.kind === 'bag') return fail(400, 'שקית בהרכבה כבר לא זמינה. מוחקים אותה מההזמנה ומנסים שוב.')
    const qty = Math.max(1, Math.min(MAX_PER_ITEM + 1, Math.floor(Number(l.qty) || 0)))
    const p = products[l.productId]
    if (!p) return fail(409, `המוצר "${String(l.name || '').slice(0, 40)}" כבר לא קיים. רעננו את הדף.`)
    if (p.stock === 'out') return fail(409, `"${p.name}" אזל בינתיים`)
    raw.push({
      kind: 'product',
      productId: p.id,
      name: String(p.name).slice(0, 80),
      qty,
      details: Array.isArray(l.details) ? l.details.slice(0, 8).map((d) => String(d).slice(0, 60)) : [],
    })
  }
  // המחיר נקבע כאן, לפי המחירים והמבצעים שבשרת — לא לפי מה שהטלפון שלח
  // הורדה מהמלאי (רק מוצרים שנספרים). אם משהו חסר — מחזירים את מה שכבר נלקח ומסבירים
  const want = {}
  for (const l of raw) want[l.productId] = (want[l.productId] || 0) + l.qty
  if (Object.values(want).some((n) => n > MAX_PER_ITEM)) return fail(400, `אפשר עד ${MAX_PER_ITEM} מכל מוצר בהזמנה אחת`)
  if (Object.values(want).reduce((a, n) => a + n, 0) > MAX_ITEMS) return fail(400, `אפשר עד ${MAX_ITEMS} פריטים בהזמנה אחת`)
  const taken = []
  for (const [pid, n] of Object.entries(want)) {
    if (!tracked(products[pid])) continue
    const r = await adjustStock(pid, -n)
    if (!r.ok) {
      for (const [tid, tn] of taken) await adjustStock(tid, tn, { allowShort: true })
      if (r.error === 'short') return fail(409, r.left > 0 ? `המלאי של "${r.name}" מוגבל. מעדכנים כמות ושולחים שוב.` : `"${r.name}" אזל בינתיים`)
      return fail(503, 'עומס רגעי. נסו שוב בעוד רגע')
    }
    taken.push([pid, n])
  }
  const priced = priceCart(raw, products, settings.deals)
  const lines = priced.lines.map((l) => ({ kind: 'product', productId: l.productId, name: l.name, unitPrice: l.unitPrice, basePrice: l.basePrice, qty: l.qty, details: l.details }))
  const total = priced.total

  const id = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`
  const token = crypto.randomBytes(18).toString('base64url')
  const number = await reserveNumber()
  await backfillCustomers()
  const delivered = (await db().get(`cust/${ph}`, { type: 'json' }))?.d || 0
  const order = {
    id,
    number,
    createdAt: Date.now(),
    dateKey: today(),
    customer: {
      name: String(c.name).trim().slice(0, 60),
      phone: String(c.phone),
      room,
      note: String(c.note || '').trim().slice(0, 200),
    },
    lines,
    stock: taken,
    subtotal: priced.subtotal,
    discounts: priced.discounts,
    total,
    payment: { method, hasProof: Boolean(proof), changeFor: method === 'cash' ? String(o.payment?.changeFor || '').slice(0, 10) : '' },
    status: method === 'cash' ? 'preparing' : 'awaiting_payment',
    paid: false,
    rejectReason: '',
    statusAt: Date.now(),
    trust: { delivered },
    guard: { ph, dv },
    _token: token,
  }
  const store = db()
  if (proof) await store.set(`proofs/${id}`, proof)
  await store.setJSON(`orders/${id}`, order)
  await guardRecord(guardKeys, id)
  await bump(ctx, 'o')
  if (taken.length) await bump(ctx, 'c')
  const pm = { paybox: 'PayBox', bit: 'Bit', cash: 'מזומן' }[method]
  later(ctx, pushAdmins({ title: `הזמנה חדשה #${number}`, body: `${order.customer.name}, חדר ${order.customer.room}: ${total} ₪ ב-${pm}`, url: '/admin', tag: `order-${id}`, kind: 'admin-order' }))
  return json({ id, number, token, createdAt: order.createdAt })
}

const strip = ({ _token, guard, ...o }) => o

async function getOrderForCustomer(id, req) {
  const t = new URL(req.url).searchParams.get('t') || ''
  const o = await db().get(`orders/${id}`, { type: 'json' })
  if (!o || !t || t.length !== o._token.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(o._token))) return fail(404, 'לא נמצא')
  return json(strip(o))
}

async function saveCustomerPush(id, req, ctx) {
  const { t, subscription } = await req.json().catch(() => ({}))
  const store = db()
  const o = await store.get(`orders/${id}`, { type: 'json' })
  if (!o || t !== o._token || !subscription?.endpoint) return fail(404, 'לא נמצא')
  const first = !(await store.get(`push/order/${id}`))
  await store.setJSON(`push/order/${id}`, { sub: subscription, at: Date.now() })
  // בפעם הראשונה: "תודה שקנית" ישר לטלפון
  if (first) later(ctx, pushTo(`push/order/${id}`, { ...THANKS_PUSH(o), url: '/', tag: `order-${id}` }))
  return json({ ok: true })
}

async function listOrders(days, { raw = false } = {}) {
  const store = db()
  const { blobs } = await store.list({ prefix: 'orders/' })
  const cutoff = days ? Date.now() - days * 86400000 : 0
  const keys = blobs.map((b) => b.key).filter((k) => parseInt(k.slice(7).split('-')[0], 36) >= cutoff)
  const all = await Promise.all(keys.map((k) => store.get(k, { type: 'json' })))
  return all.filter(Boolean).map(raw ? (o) => o : strip).sort((a, b) => b.createdAt - a.createdAt)
}

// ---------- ראוטר ----------
export async function handle(req, ctx) {
  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const [a, b, c, d] = parts
  const m = req.method
  try {
    // ---- ציבורי ----
    if (a === 'health') {
      const s = await secrets()
      return json({ ok: true, vapidPublicKey: s.vapidPublic })
    }
    if (a === 'rev' && m === 'GET') {
      const store = db()
      const [c, o] = await Promise.all([store.get('rev/c'), store.get('rev/o')])
      return json({ c: c || '0', o: o || '0' }, 200, {
        'cache-control': 'no-store',
        'netlify-cdn-cache-control': `public, durable, s-maxage=${REV_TTL}`,
        'netlify-cache-tag': 'rev',
      })
    }
    if (a === 'catalog' && m === 'GET') {
      const [products, settings] = await Promise.all([listProducts(), getSettings()])
      // עם ?v=<גרסה> כל גרסה נשמרת ב-CDN בנפרד, כך שגרסה חדשה תמיד טרייה
      const versioned = url.searchParams.has('v')
      return json({ products, settings: publicSettings(settings) }, 200, {
        'cache-control': 'public, max-age=0, must-revalidate',
        'netlify-cdn-cache-control': versioned ? 'public, durable, s-maxage=86400' : 'public, durable, s-maxage=20',
        'netlify-vary': 'query=v',
        'netlify-cache-tag': 'catalog',
      })
    }
    if (a === 'img' && b && m === 'GET') {
      const data = await db().get(`pimg/${b}`)
      if (!data) return fail(404, 'אין תמונה')
      const [head, payload] = data.split(',')
      const type = head.slice(5, head.indexOf(';'))
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return fail(404, 'אין תמונה')
      return new Response(Buffer.from(payload, 'base64'), {
        headers: {
          'content-type': type,
          'x-content-type-options': 'nosniff',
          'content-security-policy': "default-src 'none'; img-src 'self'; sandbox",
          'cache-control': 'public, max-age=31536000, immutable',
          'netlify-cdn-cache-control': 'public, durable, max-age=31536000, immutable',
        },
      })
    }
    if (a === 'orders') {
      if (!b && m === 'POST') return await createOrder(req, ctx)
      if (b && !c && m === 'GET') return await getOrderForCustomer(b, req)
      if (b && c === 'push' && m === 'POST') return await saveCustomerPush(b, req, ctx)
    }

    // ---- מנהלים ----
    if (a === 'admin') {
      const admin = await readAdmin(req)
      if (!admin) return fail(401, 'צריך להתחבר מחדש')
      const store = db()
      const isOwner = admin.role === 'owner'
      // קוד ישן/חלש: קודם מחליפים קוד, ורק אחר כך אפשר לעשות משהו
      if (admin.mustChangePin && !(b === 'me' && ((!c && m === 'GET') || (c === 'pin' && m === 'POST')))) {
        return fail(403, 'צריך לבחור קוד אישי חדש', { code: 'WEAK_PIN' })
      }

      if (b === 'me' && m === 'GET') return json({ admin })
      if (b === 'catalog' && m === 'GET') {
        const [products, settings] = await Promise.all([listProducts(), getSettings()])
        return json({ products, settings })
      }
      if (b === 'orders' && !c && m === 'GET') return json({ orders: await listOrders(Number(url.searchParams.get('days')) || 0) })
      if (b === 'orders' && c && !d && m === 'PATCH') {
        const o = await store.get(`orders/${c}`, { type: 'json' })
        if (!o) return fail(404, 'לא נמצא')
        const patch = (await req.json().catch(() => null)) || {}
        const next = { ...o, statusAt: Date.now() }
        if ('status' in patch) {
          if (!ORDER_STATUSES.includes(patch.status)) return fail(400, 'סטטוס לא מוכר')
          next.status = patch.status
        }
        if ('paid' in patch) next.paid = Boolean(patch.paid)
        if ('rejectReason' in patch) next.rejectReason = String(patch.rejectReason || '').slice(0, 200)
        // הזמנה שנדחתה/בוטלה מחזירה את המוצרים למלאי; אם מחזירים אותה לפעילה — לוקחים שוב
        let stockMoved = false
        const off = ['rejected', 'cancelled'].includes(next.status)
        if (o.stock?.length && off && !o.stockReturned) {
          await returnStock(o)
          next.stockReturned = true
          stockMoved = true
        } else if (o.stock?.length && !off && o.stockReturned) {
          await takeStockAgain(o)
          next.stockReturned = false
          stockMoved = true
        }
        await store.setJSON(`orders/${c}`, next)
        // כמה הזמנות של המספר הזה הגיעו (מוצג למנהלים: "לקוח חדש" / "קיבל כבר N")
        if ((next.status === 'delivered') !== (o.status === 'delivered')) {
          const ph = o.guard?.ph || (await hashOf('ph', o.customer.phone))
          const step = next.status === 'delivered' ? 1 : -1
          await updateJSON(`cust/${ph}`, (cur) => ({ d: Math.max(0, (cur?.d || 0) + step) }))
        }
        await bump(ctx, 'o')
        if (stockMoved) await bump(ctx, 'c')
        if (patch.status && patch.status !== o.status && CUSTOMER_PUSH[patch.status]) {
          later(ctx, pushTo(`push/order/${c}`, { ...CUSTOMER_PUSH[patch.status](next), url: '/', tag: `order-${c}` }))
        }
        return json({ order: strip(next) })
      }
      // חסימת מזמין: המספר והמכשיר שלו לא יוכלו להזמין, וההזמנות הפתוחות שלו מתבטלות
      if (b === 'orders' && c && d === 'block' && m === 'POST') {
        const o = await store.get(`orders/${c}`, { type: 'json' })
        if (!o) return fail(404, 'לא נמצא')
        const ph = o.guard?.ph || (await hashOf('ph', o.customer.phone))
        const dv = o.guard?.dv || ''
        const entry = { id: crypto.randomBytes(6).toString('hex'), ph, dv, name: o.customer.name, phone: o.customer.phone, room: o.customer.room, at: Date.now(), by: admin.name }
        await updateJSON('meta/blocks', (cur) => {
          const list = cur?.list || []
          if (list.some((x) => x.ph === ph && x.dv === dv)) return undefined
          return { list: [...list, entry].slice(-300) }
        })
        const mine = (x) => x.customer?.phone === o.customer.phone || x.guard?.ph === ph || (dv && x.guard?.dv === dv)
        const open = (await listOrders(7, { raw: true })).filter((x) => OPEN.includes(x.status) && mine(x))
        let stockMoved = false
        for (const x of open) {
          const next = { ...x, status: 'cancelled', paid: false, statusAt: Date.now() }
          if (x.stock?.length && !x.stockReturned) {
            await returnStock(x)
            next.stockReturned = true
            stockMoved = true
          }
          await store.setJSON(`orders/${x.id}`, next)
        }
        await bump(ctx, 'o')
        if (stockMoved) await bump(ctx, 'c')
        return json({ ok: true, cancelled: open.length })
      }
      if (b === 'blocks' && !c && m === 'GET') {
        return json({ blocks: (await readBlocks()).map(({ ph, dv, ...x }) => x).reverse() })
      }
      if (b === 'blocks' && c && m === 'DELETE') {
        await updateJSON('meta/blocks', (cur) => ({ list: (cur?.list || []).filter((x) => x.id !== c) }))
        return json({ ok: true })
      }
      if (b === 'orders' && c && m === 'DELETE') {
        const o = await store.get(`orders/${c}`, { type: 'json' })
        if (o?.stock?.length && !o.stockReturned && o.status !== 'delivered') {
          await returnStock(o)
          await bump(ctx, 'c')
        }
        await Promise.all([store.delete(`orders/${c}`), store.delete(`proofs/${c}`), store.delete(`push/order/${c}`)])
        await bump(ctx, 'o')
        return json({ ok: true })
      }
      if (b === 'proof' && c && m === 'GET') return json({ dataUrl: (await store.get(`proofs/${c}`)) || null })
      if (b === 'purge-proofs' && m === 'POST') {
        const orders = await listOrders(0)
        const cutoff = Date.now() - 7 * 86400000
        const old = orders.filter((o) => o.createdAt < cutoff && o.payment?.hasProof && ['delivered', 'rejected', 'cancelled'].includes(o.status))
        await Promise.all(
          old.map(async (o) => {
            await store.delete(`proofs/${o.id}`)
            const full = await store.get(`orders/${o.id}`, { type: 'json' })
            if (full) await store.setJSON(`orders/${o.id}`, { ...full, payment: { ...full.payment, hasProof: false } })
          }),
        )
        if (old.length) await bump(ctx, 'o')
        return json({ count: old.length })
      }
      if (b === 'products' && c && !d && m === 'PUT') {
        if (!/^[\w-]{1,80}$/.test(c)) return fail(400, 'מזהה לא תקין')
        const p = (await req.json().catch(() => null)) || {}
        // הכמות במלאי משתנה רק דרך /qty (כדי שעריכה של מחיר לא תדרוס מכירות שקרו באמצע)
        const r = await updateProduct(c, (cur) => {
          const next = cleanProduct(p, cur || {}, c)
          if (tracked(cur)) {
            next.qty = cur.qty
            next.stock = stockFromQty(cur.qty)
          } else delete next.qty
          return next
        })
        if (!r.ok) return fail(503, 'עומס רגעי. נסו שוב')
        await bump(ctx, 'c')
        return json({ product: r.product })
      }
      if (b === 'products' && c && d === 'qty' && m === 'PUT') {
        const { qty } = (await req.json().catch(() => null)) || {}
        const n = qty === null || qty === '' || qty === undefined ? null : Math.floor(Number(qty))
        if (n !== null && (!Number.isFinite(n) || n < 0 || n > 99999)) return fail(400, 'כמות לא תקינה')
        const r = await updateProduct(c, (cur) => {
          if (!cur) return { error: 'missing' }
          if (n === null) {
            const { qty: _drop, ...rest } = cur
            return { ...rest, stock: cur.stock === 'out' && tracked(cur) ? 'in' : cur.stock }
          }
          return { ...cur, qty: n, stock: stockFromQty(n) }
        })
        if (!r.ok) return fail(r.error === 'missing' ? 404 : 503, r.error === 'missing' ? 'לא נמצא' : 'עומס רגעי. נסו שוב')
        await bump(ctx, 'c')
        return json({ product: r.product })
      }
      if (b === 'products' && c && !d && m === 'DELETE') {
        await Promise.all([store.delete(`products/${c}`), store.delete(`pimg/${c}`)])
        await bump(ctx, 'c')
        return json({ ok: true })
      }
      // פעולה על כמה מוצרים יחד: מחיקה או עדכון מחיר/מלאי
      if (b === 'products-bulk' && m === 'POST') {
        const { ids, action, patch } = (await req.json().catch(() => null)) || {}
        if (!Array.isArray(ids) || !ids.length || ids.length > 300) return fail(400, 'לא נבחרו מוצרים')
        const clean = ids.map(String).filter((x) => /^[\w-]{1,80}$/.test(x))
        if (action === 'delete') {
          await Promise.all(clean.flatMap((id) => [store.delete(`products/${id}`), store.delete(`pimg/${id}`)]))
        } else if (action === 'update') {
          const allowed = {}
          if (patch && 'price' in patch) {
            const n = Number(patch.price)
            if (Number.isNaN(n) || n < 0 || n > 1000) return fail(400, 'מחיר לא תקין')
            allowed.price = n
          }
          if (patch && ['in', 'low', 'out'].includes(patch.stock)) allowed.stock = patch.stock
          let setQty
          if (patch && 'qty' in patch) {
            setQty = patch.qty === null || patch.qty === '' ? null : Math.floor(Number(patch.qty))
            if (setQty !== null && (!Number.isFinite(setQty) || setQty < 0 || setQty > 99999)) return fail(400, 'כמות לא תקינה')
          }
          if (!Object.keys(allowed).length && setQty === undefined) return fail(400, 'אין מה לעדכן')
          await Promise.all(
            clean.map(async (id) => {
              await updateProduct(id, (cur) => {
                if (!cur) return undefined
                const next = { ...cur, ...allowed }
                if (setQty === null) {
                  delete next.qty
                } else if (setQty !== undefined) {
                  next.qty = setQty
                  next.stock = stockFromQty(setQty)
                } else if (tracked(cur)) next.stock = stockFromQty(cur.qty)
                return next
              })
            }),
          )
        } else return fail(400, 'פעולה לא מוכרת')
        await bump(ctx, 'c')
        return json({ ok: true, count: clean.length })
      }
      if (b === 'products' && c && d === 'image' && m === 'PUT') {
        const { dataUrl } = await req.json()
        const cur = await store.get(`products/${c}`, { type: 'json' })
        if (!cur) return fail(404, 'לא נמצא')
        if (dataUrl) {
          if (!SAFE_IMAGE.test(String(dataUrl)) || dataUrl.length > 400_000) return fail(400, 'תמונה לא תקינה')
          await store.set(`pimg/${c}`, dataUrl)
        } else await store.delete(`pimg/${c}`)
        const next = { ...cur, imageV: dataUrl ? Date.now() : 0 }
        await store.setJSON(`products/${c}`, next)
        await bump(ctx, 'c')
        return json({ product: next })
      }
      if (b === 'seed' && m === 'POST') {
        await Promise.all(SEED_PRODUCTS.map((p) => store.setJSON(`products/${p.id}`, p, { onlyIfNew: true })))
        await bump(ctx, 'c')
        return json({ ok: true })
      }
      if (b === 'settings' && m === 'PATCH') {
        const patch = cleanSettings((await req.json().catch(() => null)) || {})
        const next = { ...(await getSettings()), ...patch }
        await store.setJSON('meta/settings', next)
        await bump(ctx, 'c')
        return json({ settings: next })
      }
      if (b === 'admins' && !c && m === 'GET') return json({ admins: (await listAdmins()).map(publicAdmin) })
      if (b === 'admins' && !c && m === 'POST') {
        if (!isOwner) return fail(403, 'רק מנהל ראשי יכול להוסיף מנהלים')
        const { name, pin, role } = (await req.json().catch(() => null)) || {}
        if (!String(name || '').trim()) return fail(400, 'צריך שם')
        const problem = pinProblem(pin)
        if (problem) return fail(400, problem)
        const admins = await listAdmins()
        if (admins.some((x) => samePin(pin, x))) return fail(409, 'הקוד הזה כבר תפוס. בחרו קוד אחר.')
        const id = crypto.randomBytes(6).toString('hex')
        const salt = crypto.randomBytes(16).toString('hex')
        const rec = { id, name: String(name).trim().slice(0, 40), role: role === 'owner' ? 'owner' : 'admin', salt, hash: hashPin(pin, salt), addedAt: Date.now(), v: 0, pinV2: true }
        await store.setJSON(`admins/${id}`, rec)
        return json({ admin: publicAdmin(rec) })
      }
      if (b === 'admins' && c && m === 'DELETE') {
        if (!isOwner) return fail(403, 'רק מנהל ראשי יכול להסיר מנהלים')
        if (c === admin.id) return fail(400, 'אי אפשר להסיר את עצמך')
        await store.delete(`admins/${c}`)
        return json({ ok: true })
      }
      if (b === 'me' && c === 'pin' && m === 'POST') {
        const { pin } = (await req.json().catch(() => null)) || {}
        const problem = pinProblem(pin)
        if (problem) return fail(400, problem)
        const admins = await listAdmins()
        const cur = admins.find((x) => x.id === admin.id)
        if (samePin(pin, cur)) return fail(400, 'זה הקוד הנוכחי. בחרו קוד חדש')
        if (admins.some((x) => x.id !== admin.id && samePin(pin, x))) return fail(409, 'הקוד הזה כבר תפוס')
        const salt = crypto.randomBytes(16).toString('hex')
        // גרסה חדשה: כל הכניסות הקודמות (בטלפונים אחרים) מתבטלות
        const rec = { ...cur, salt, hash: hashPin(pin, salt), v: (cur.v || 0) + 1, pinV2: true }
        await store.setJSON(`admins/${admin.id}`, rec)
        const token = await signToken({ sub: rec.id, v: rec.v, exp: Date.now() + 1000 * 60 * 60 * 24 * 60 })
        return json({ ok: true, token, admin: { ...publicAdmin(rec), mustChangePin: false } })
      }
      if (b === 'push' && m === 'POST') {
        const { subscription } = await req.json()
        if (!subscription?.endpoint) return fail(400, 'מנוי לא תקין')
        const key = crypto.createHash('sha256').update(subscription.endpoint).digest('hex').slice(0, 32)
        await store.setJSON(`push/admin/${key}`, { sub: subscription, adminId: admin.id, at: Date.now() })
        return json({ ok: true })
      }
      if (b === 'push-test' && m === 'POST') {
        // בדיקה רק למכשיר שהפעיל עכשיו, לא לכל המנהלים
        const { endpoint } = await req.json().catch(() => ({}))
        const payload = { title: 'בדיקת התראות', body: 'ככה תיראה התראה על הזמנה חדשה', url: '/admin' }
        if (endpoint) await pushTo(`push/admin/${crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 32)}`, payload)
        else await pushAdmins(payload)
        return json({ ok: true })
      }
    }
    return fail(404, 'לא נמצא')
  } catch (e) {
    console.error(e)
    return fail(500, 'שגיאת שרת. נסו שוב.')
  }
}

export const _internals = { DEFAULT_CATEGORIES, DEFAULT_SETTINGS }
