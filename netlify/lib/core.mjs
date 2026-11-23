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
 */
import crypto from 'node:crypto'
import * as webpush from 'web-push'
import { purgeCache } from '@netlify/functions'
import { db } from './store.mjs'
import { SEED_PRODUCTS, DEFAULT_CATEGORIES, REMOVED_CATEGORIES } from '../../src/data/catalog.js'
import { DEFAULT_SETTINGS, withSettingsDefaults } from '../../src/services/defaults.js'

const env = (k) => globalThis.Netlify?.env?.get?.(k) ?? process.env[k]
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } })
const fail = (status, error) => json({ error }, status)

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
async function signToken(payload) {
  const { authSecret } = await secrets()
  const body = b64(JSON.stringify(payload))
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
  const admin = await db().get(`admins/${p.sub}`, { type: 'json' })
  return admin ? { id: admin.id, name: admin.name, role: admin.role } : null
}

// ---------- מנהלים ----------
const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex')
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

export async function login(req) {
  if (req.method !== 'POST') return fail(405, 'method')
  const { pin } = await req.json().catch(() => ({}))
  if (!pin || String(pin).length < 4) return fail(400, 'קוד שגוי')
  const admins = await ensureOwner()
  const match = admins.find((a) => {
    const h = hashPin(pin, a.salt)
    return h.length === a.hash.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(a.hash))
  })
  if (!match) return fail(401, 'קוד שגוי')
  const token = await signToken({ sub: match.id, exp: Date.now() + 1000 * 60 * 60 * 24 * 60 })
  return json({ token, admin: publicAdmin(match) })
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
    await webpush.sendNotification(rec.sub, JSON.stringify(payload), { TTL: 60 * 60 })
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
const REV_TTL = 5
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
  rejected: (o) => ({ title: 'התשלום לא אושר', body: o.rejectReason ? `הסיבה: ${o.rejectReason}` : `לגבי הזמנה #${o.number}` }),
}

// ---------- הזמנות ----------
const PHONE_RE = /^0(5\d|7\d)\d{7}$|^0[23489]\d{7}$/
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
const BAG_PRICES = [5, 10]

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

async function createOrder(req, ctx) {
  const body = await req.json().catch(() => null)
  if (!body?.order) return fail(400, 'הזמנה לא תקינה')
  const settings = await getSettings()
  if (!settings.storeOpen) return fail(403, 'החנות סגורה כרגע')
  const o = body.order
  const c = o.customer || {}
  if (!String(c.name || '').trim()) return fail(400, 'חסר שם')
  if (!PHONE_RE.test(String(c.phone || ''))) return fail(400, 'מספר טלפון לא תקין')
  if (!String(c.room || '').trim()) return fail(400, 'חסר מספר חדר')
  if (!Array.isArray(o.lines) || !o.lines.length || o.lines.length > 60) return fail(400, 'ההזמנה ריקה')
  const method = o.payment?.method
  if (!['paybox', 'bit', 'cash'].includes(method)) return fail(400, 'אמצעי תשלום לא תקין')
  const proof = typeof body.proof === 'string' && body.proof.startsWith('data:image/') ? body.proof : null
  if (method === 'paybox' && !proof) return fail(400, 'צריך לצרף צילום של אישור התשלום')
  if (proof && proof.length > 900_000) return fail(413, 'התמונה גדולה מדי')

  // בדיקת מחירים מול הקטלוג בשרת
  const products = Object.fromEntries((await listProducts()).map((p) => [p.id, p]))
  const lines = []
  for (const l of o.lines) {
    const qty = Math.max(1, Math.min(50, Math.floor(Number(l.qty) || 0)))
    let unitPrice
    if (l.kind === 'bag') {
      unitPrice = Number(l.unitPrice)
      if (!BAG_PRICES.includes(unitPrice)) return fail(400, 'מחיר שקית לא תקין')
    } else {
      const p = products[l.productId]
      if (!p) return fail(409, `המוצר "${l.name}" כבר לא קיים. רעננו את הדף.`)
      if (p.stock === 'out') return fail(409, `"${p.name}" אזל בינתיים`)
      unitPrice = Number(p.price)
    }
    lines.push({
      kind: l.kind === 'bag' ? 'bag' : l.kind === 'combo' ? 'combo' : 'product',
      productId: l.productId || null,
      name: String(l.kind === 'bag' ? l.name : products[l.productId]?.name || l.name).slice(0, 80),
      unitPrice,
      qty,
      details: Array.isArray(l.details) ? l.details.slice(0, 8).map((d) => String(d).slice(0, 60)) : [],
    })
  }
  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)

  const id = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`
  const token = crypto.randomBytes(18).toString('base64url')
  const number = await reserveNumber()
  const order = {
    id,
    number,
    createdAt: Date.now(),
    dateKey: today(),
    customer: {
      name: String(c.name).trim().slice(0, 60),
      phone: String(c.phone),
      room: String(c.room).trim().slice(0, 20),
      note: String(c.note || '').trim().slice(0, 200),
    },
    lines,
    total,
    payment: { method, hasProof: Boolean(proof), changeFor: method === 'cash' ? String(o.payment?.changeFor || '').slice(0, 10) : '' },
    status: method === 'cash' ? 'preparing' : 'awaiting_payment',
    paid: false,
    rejectReason: '',
    statusAt: Date.now(),
    _token: token,
  }
  const store = db()
  if (proof) await store.set(`proofs/${id}`, proof)
  await store.setJSON(`orders/${id}`, order)
  await bump(ctx, 'o')
  const pm = { paybox: 'PayBox', bit: 'Bit', cash: 'מזומן' }[method]
  later(ctx, pushAdmins({ title: `הזמנה חדשה #${number}`, body: `${order.customer.name}, חדר ${order.customer.room}: ${total} ₪ ב-${pm}`, url: '/admin', tag: `order-${id}` }))
  return json({ id, number, token, createdAt: order.createdAt })
}

const strip = ({ _token, ...o }) => o

async function getOrderForCustomer(id, req) {
  const t = new URL(req.url).searchParams.get('t') || ''
  const o = await db().get(`orders/${id}`, { type: 'json' })
  if (!o || !t || t.length !== o._token.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(o._token))) return fail(404, 'לא נמצא')
  return json(strip(o))
}

async function saveCustomerPush(id, req) {
  const { t, subscription } = await req.json().catch(() => ({}))
  const o = await db().get(`orders/${id}`, { type: 'json' })
  if (!o || t !== o._token || !subscription?.endpoint) return fail(404, 'לא נמצא')
  await db().setJSON(`push/order/${id}`, { sub: subscription, at: Date.now() })
  return json({ ok: true })
}

async function listOrders(days) {
  const store = db()
  const { blobs } = await store.list({ prefix: 'orders/' })
  const cutoff = days ? Date.now() - days * 86400000 : 0
  const keys = blobs.map((b) => b.key).filter((k) => parseInt(k.slice(7).split('-')[0], 36) >= cutoff)
  const all = await Promise.all(keys.map((k) => store.get(k, { type: 'json' })))
  return all.filter(Boolean).map(strip).sort((a, b) => b.createdAt - a.createdAt)
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
    if (a === 'diag' && m === 'GET') {
      const result = await purge(['diag'])
      return json({ purgeToken: Boolean(env('NETLIFY_PURGE_API_TOKEN')), purge: result }, 200, { 'cache-control': 'no-store' })
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
      const type = head.slice(5, head.indexOf(';')) || 'image/webp'
      return new Response(Buffer.from(payload, 'base64'), {
        headers: {
          'content-type': type,
          'cache-control': 'public, max-age=31536000, immutable',
          'netlify-cdn-cache-control': 'public, durable, max-age=31536000, immutable',
        },
      })
    }
    if (a === 'orders') {
      if (!b && m === 'POST') return await createOrder(req, ctx)
      if (b && !c && m === 'GET') return await getOrderForCustomer(b, req)
      if (b && c === 'push' && m === 'POST') return await saveCustomerPush(b, req)
    }

    // ---- מנהלים ----
    if (a === 'admin') {
      const admin = await readAdmin(req)
      if (!admin) return fail(401, 'צריך להתחבר מחדש')
      const store = db()
      const isOwner = admin.role === 'owner'

      if (b === 'me' && m === 'GET') return json({ admin })
      if (b === 'catalog' && m === 'GET') {
        const [products, settings] = await Promise.all([listProducts(), getSettings()])
        return json({ products, settings })
      }
      if (b === 'orders' && !c && m === 'GET') return json({ orders: await listOrders(Number(url.searchParams.get('days')) || 0) })
      if (b === 'orders' && c && !d && m === 'PATCH') {
        const o = await store.get(`orders/${c}`, { type: 'json' })
        if (!o) return fail(404, 'לא נמצא')
        const patch = await req.json()
        const allowed = ['status', 'paid', 'rejectReason']
        const next = { ...o, statusAt: Date.now() }
        for (const k of allowed) if (k in patch) next[k] = patch[k]
        await store.setJSON(`orders/${c}`, next)
        await bump(ctx, 'o')
        if (patch.status && patch.status !== o.status && CUSTOMER_PUSH[patch.status]) {
          later(ctx, pushTo(`push/order/${c}`, { ...CUSTOMER_PUSH[patch.status](next), url: '/', tag: `order-${c}` }))
        }
        return json({ order: strip(next) })
      }
      if (b === 'orders' && c && m === 'DELETE') {
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
        const p = await req.json()
        const cur = (await store.get(`products/${c}`, { type: 'json' })) || {}
        const next = { ...cur, ...p, id: c }
        await store.setJSON(`products/${c}`, next)
        await bump(ctx, 'c')
        return json({ product: next })
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
          if (!Object.keys(allowed).length) return fail(400, 'אין מה לעדכן')
          await Promise.all(
            clean.map(async (id) => {
              const cur = await store.get(`products/${id}`, { type: 'json' })
              if (cur) await store.setJSON(`products/${id}`, { ...cur, ...allowed })
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
          if (!String(dataUrl).startsWith('data:image/') || dataUrl.length > 400_000) return fail(400, 'תמונה לא תקינה')
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
        const patch = await req.json()
        const next = { ...(await getSettings()), ...patch }
        await store.setJSON('meta/settings', next)
        await bump(ctx, 'c')
        return json({ settings: next })
      }
      if (b === 'admins' && !c && m === 'GET') return json({ admins: (await listAdmins()).map(publicAdmin) })
      if (b === 'admins' && !c && m === 'POST') {
        if (!isOwner) return fail(403, 'רק מנהל ראשי יכול להוסיף מנהלים')
        const { name, pin, role } = await req.json()
        if (!String(name || '').trim() || !/^\d{4,8}$/.test(String(pin || ''))) return fail(400, 'צריך שם וקוד של 4–8 ספרות')
        const admins = await listAdmins()
        if (admins.some((x) => hashPin(pin, x.salt) === x.hash)) return fail(409, 'הקוד הזה כבר תפוס. בחרו קוד אחר.')
        const id = crypto.randomBytes(6).toString('hex')
        const salt = crypto.randomBytes(16).toString('hex')
        const rec = { id, name: String(name).trim().slice(0, 40), role: role === 'owner' ? 'owner' : 'admin', salt, hash: hashPin(pin, salt), addedAt: Date.now() }
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
        const { pin } = await req.json()
        if (!/^\d{4,8}$/.test(String(pin || ''))) return fail(400, 'קוד של 4–8 ספרות')
        const admins = await listAdmins()
        if (admins.some((x) => x.id !== admin.id && hashPin(pin, x.salt) === x.hash)) return fail(409, 'הקוד הזה כבר תפוס')
        const cur = admins.find((x) => x.id === admin.id)
        const salt = crypto.randomBytes(16).toString('hex')
        await store.setJSON(`admins/${admin.id}`, { ...cur, salt, hash: hashPin(pin, salt) })
        return json({ ok: true })
      }
      if (b === 'push' && m === 'POST') {
        const { subscription } = await req.json()
        if (!subscription?.endpoint) return fail(400, 'מנוי לא תקין')
        const key = crypto.createHash('sha256').update(subscription.endpoint).digest('hex').slice(0, 32)
        await store.setJSON(`push/admin/${key}`, { sub: subscription, adminId: admin.id, at: Date.now() })
        return json({ ok: true })
      }
      if (b === 'push-test' && m === 'POST') {
        await pushAdmins({ title: 'בדיקת התראות', body: 'ככה תיראה התראה על הזמנה חדשה', url: '/admin' })
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
