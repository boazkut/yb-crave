import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, BellRing, Check, ImageOff, MessageCircle, MoreHorizontal, Phone, X } from 'lucide-react'
import { useData } from '../state/DataContext.jsx'
import { storage } from '../services/storageService.js'
import { ORDER_STATUS, PAYMENT, formatPhone, toWhatsApp, waLink } from '../lib/shop.js'
import { ils } from '../lib/utils.js'
import { useLocal } from '../state/useLocal.js'
import { pushSupport, subscribePush } from '../lib/push.js'
import { Section, Segmented, StatusBadge, chime, timeAgo, unlockAudio, useToast } from './ui.jsx'
import { vibrate } from '../lib/utils.js'

export function useAllOrders(days = 7) {
  const [orders, setOrders] = useState(null)
  useEffect(() => storage.subscribeOrders(setOrders, { days }), [days])
  return orders
}

function AdminPushCard() {
  const toast = useToast()
  const [on, setOn] = useLocal('ybc2:adminPushOn', false)
  const [busy, setBusy] = useState(false)
  if (!storage.saveAdminPush) return null
  const support = pushSupport()
  if (support === 'unsupported') return null
  const enable = async () => {
    setBusy(true)
    try {
      const sub = await subscribePush(storage.vapidPublicKey)
      await storage.saveAdminPush(sub)
      await storage.testAdminPush()
      setOn(true)
      toast('התראות פעילות. שלחנו התראת בדיקה')
    } catch (e) {
      toast(e.message)
    } finally {
      setBusy(false)
    }
  }
  if (on) return null
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white">
        <BellRing size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">התראה על כל הזמנה חדשה</p>
        <p className="text-[13px] text-muted">
          {support === 'ios-install' ? 'באייפון: "שיתוף" ← "הוספה למסך הבית", ואז מפעילים מהאייקון.' : 'גם כשהאתר סגור. מפעילים פעם אחת בכל טלפון.'}
        </p>
      </div>
      {support !== 'ios-install' && (
        <button type="button" onClick={enable} disabled={busy} className="btn-primary shrink-0 px-3 py-2.5 text-sm">
          {busy ? '...' : 'הפעלה'}
        </button>
      )}
    </div>
  )
}

export const paymentState = (o) => (o.paid ? 'approved' : o.status === 'rejected' ? 'rejected' : o.status === 'cancelled' ? 'cancelled' : 'pending')
const PAY_STATE_LABEL = { approved: 'אושר', pending: 'ממתין', rejected: 'נדחה', cancelled: 'בוטל' }

const REASONS = ['הסכום לא תואם', 'התמונה לא ברורה', 'לא מצאנו את ההעברה']

function useProof(order) {
  const [src, setSrc] = useState(undefined)
  useEffect(() => {
    if (!order.payment?.hasProof) return setSrc(null)
    let alive = true
    storage
      .getProof(order.id)
      .then((d) => alive && setSrc(d))
      .catch(() => alive && setSrc(null))
    return () => {
      alive = false
    }
  }, [order.id, order.payment?.hasProof])
  return src
}

function RejectForm({ onSubmit, onCancel, dark = false }) {
  const [reason, setReason] = useState('')
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={`rounded-full border px-3 py-1.5 text-[13px] ${
              reason === r ? 'border-ink bg-ink text-white' : dark ? 'border-white/30 text-white' : 'border-line bg-white'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="סיבה קצרה ללקוח" className="field py-2.5 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className={dark ? 'btn border border-white/30 text-white' : 'btn-secondary'}>
          ביטול
        </button>
        <button type="button" disabled={!reason.trim()} onClick={() => onSubmit(reason.trim())} className="btn bg-danger text-white">
          דחיית התשלום
        </button>
      </div>
    </div>
  )
}

function Lightbox({ order, src, onClose, onApprove, onReject }) {
  const [rejecting, setRejecting] = useState(false)
  const pending = order.status === 'awaiting_payment'
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`אישור תשלום להזמנה ${order.number}`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm">
          <p className="font-semibold">
            הזמנה #{order.number}, {order.customer.name}
          </p>
          <p className="text-white/60">
            צריך להופיע: {ils(order.total)} ב-{PAYMENT[order.payment.method]?.label}
          </p>
        </div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="סגירה">
          <X size={20} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        <img src={src} alt="צילום אישור התשלום" className="max-h-full max-w-full rounded-lg object-contain" />
      </div>
      {pending && (
        <div className="safe-bottom space-y-2 px-4 pt-3">
          {rejecting ? (
            <RejectForm dark onCancel={() => setRejecting(false)} onSubmit={(r) => (onReject(r), onClose())} />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRejecting(true)} className="btn border border-white/30 text-white">
                דחה תשלום
              </button>
              <button type="button" onClick={() => (onApprove(), onClose())} className="btn bg-white text-ink">
                <Check size={18} /> אשר תשלום
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>,
    document.body,
  )
}

function OrderCard({ order: o }) {
  const toast = useToast()
  const proof = useProof(o)
  const [box, setBox] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [menu, setMenu] = useState(false)
  const wa = toWhatsApp(o.customer.phone)

  const update = async (patch, msg) => {
    try {
      await storage.updateOrder(o.id, patch)
      toast(msg)
    } catch {
      toast('העדכון נכשל. בדקו הרשאות וחיבור.')
    }
  }
  const approve = () => update({ status: 'preparing', paid: true, rejectReason: '' }, `התשלום של #${o.number} אושר`)
  const reject = (reason) => update({ status: 'rejected', paid: false, rejectReason: reason }, `התשלום של #${o.number} נדחה`)

  const fresh = Date.now() - o.createdAt < 3 * 60_000 && ['awaiting_payment', 'preparing'].includes(o.status)
  return (
    <article id={`order-${o.id}`} className={`card scroll-mt-24 p-4 ${fresh ? 'border-ink ring-2 ring-ink' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[34px] font-extrabold leading-none tabular-nums" dir="ltr">
              #{o.number}
            </span>
            <StatusBadge status={o.status}>{ORDER_STATUS[o.status]?.admin}</StatusBadge>
            {fresh && <span className="rounded-full bg-ink px-2 py-0.5 text-[12px] font-bold text-white">חדש</span>}
          </div>
          <p className="mt-2 text-[19px] font-bold leading-tight">{o.customer.name}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className="rounded-lg bg-ink px-2.5 py-1 text-[17px] font-extrabold text-white">חדר {o.customer.room}</span>
            {timeAgo(o.createdAt)}
          </p>
        </div>
        <div className="shrink-0 text-left">
          <p className="text-[26px] font-extrabold leading-none">{ils(o.total)}</p>
          <p className="mt-1 text-[14px] font-medium text-muted">{PAYMENT[o.payment?.method]?.label}</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <a href={`tel:${o.customer.phone}`} className="btn-secondary flex-1 px-3 py-2 text-sm" dir="ltr">
          <Phone size={15} /> {formatPhone(o.customer.phone)}
        </a>
        {wa && (
          <a href={waLink(wa)} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-2 text-sm" aria-label="וואטסאפ ללקוח">
            <MessageCircle size={16} />
          </a>
        )}
      </div>

      <ul className="mt-3 space-y-1.5 rounded-xl bg-tile px-3.5 py-3 text-[17px]">
        {o.lines.map((l, i) => (
          <li key={i}>
            <span className="font-semibold">{l.qty}×</span> {l.name}
            {l.details?.length > 0 && <span className="block pr-6 text-[13px] text-muted">{l.details.join(', ')}</span>}
          </li>
        ))}
        {o.customer.note && <li className="border-t border-line pt-1.5 text-[15px] font-medium">הערה: {o.customer.note}</li>}
        {o.payment?.method === 'cash' && o.payment.changeFor && o.payment.changeFor !== 'בדיוק' && (
          <li className="text-[15px] font-medium">עודף מ-{o.payment.changeFor}</li>
        )}
      </ul>

      {o.payment?.method !== 'cash' && (
        <div className="mt-3 flex items-center gap-3">
          {proof ? (
            <button type="button" onClick={() => setBox(true)} className="shrink-0" aria-label="הגדלת צילום התשלום">
              <img src={proof} alt="" className="h-16 w-16 rounded-lg border border-line object-cover" />
            </button>
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-line text-muted">
              {proof === undefined ? '...' : <ImageOff size={18} />}
            </span>
          )}
          <p className="text-[13px] text-muted">
            {proof ? 'לחצו על התמונה כדי לבדוק את ההעברה' : proof === null ? 'לא צורף צילום. בדקו באפליקציה.' : 'טוען צילום...'}
            {o.status === 'rejected' && o.rejectReason && <span className="block text-danger">נדחה: {o.rejectReason}</span>}
          </p>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {o.status === 'awaiting_payment' &&
          (rejecting ? (
            <RejectForm onCancel={() => setRejecting(false)} onSubmit={(r) => (reject(r), setRejecting(false))} />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRejecting(true)} className="btn-danger py-4 text-[16px]">
                דחה תשלום
              </button>
              <button type="button" onClick={approve} className="btn-primary py-4 text-[16px]">
                <Check size={18} /> אשר תשלום
              </button>
            </div>
          ))}
        {o.status === 'preparing' && (
          <button type="button" onClick={() => update({ status: 'ready' }, `#${o.number} מוכן. הלקוח קיבל התראה`)} className="btn-primary w-full py-4 text-[17px]">
            ההזמנה מוכנה
          </button>
        )}
        {o.status === 'ready' && (
          <button type="button" onClick={() => update({ status: 'on_the_way' }, `#${o.number} בדרך. הלקוח קיבל התראה`)} className="btn-primary w-full py-4 text-[17px]">
            יצאנו לחדר {o.customer.room}
          </button>
        )}
        {o.status === 'on_the_way' && (
          <button type="button" onClick={() => update({ status: 'delivered', paid: true }, `#${o.number} נמסר`)} className="btn-primary w-full py-4 text-[17px]">
            סמן כנמסר{o.payment?.method === 'cash' ? ' (המזומן התקבל)' : ''}
          </button>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={() => setMenu((m) => !m)} className="btn-ghost px-2 py-1.5 text-[13px]" aria-expanded={menu}>
            <MoreHorizontal size={16} /> עוד
          </button>
        </div>
        <AnimatePresence>
          {menu && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-2 gap-2">
                {['delivered', 'rejected', 'cancelled'].includes(o.status) ? (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => update({ status: o.paid || o.payment?.method === 'cash' ? 'preparing' : 'awaiting_payment', rejectReason: '' }, 'ההזמנה חזרה לטיפול')}
                  >
                    החזרה לטיפול
                  </button>
                ) : (
                  <button type="button" className="btn-secondary text-sm" onClick={() => update({ status: 'cancelled', paid: false }, 'ההזמנה בוטלה')}>
                    ביטול הזמנה
                  </button>
                )}
                <button
                  type="button"
                  className="btn-danger text-sm"
                  onClick={async () => {
                    if (!window.confirm(`למחוק לגמרי את הזמנה #${o.number}?`)) return
                    await storage.deleteOrder(o.id)
                    toast('ההזמנה נמחקה')
                  }}
                >
                  מחיקה
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {box && proof && <Lightbox order={o} src={proof} onClose={() => setBox(false)} onApprove={approve} onReject={reject} />}
      </AnimatePresence>
    </article>
  )
}

function Transfers({ orders }) {
  const list = orders.filter((o) => o.status !== 'cancelled')
  const sums = {}
  for (const m of Object.keys(PAYMENT)) {
    const ms = list.filter((o) => o.payment?.method === m)
    sums[m] = {
      approved: ms.filter((o) => o.paid).reduce((s, o) => s + o.total, 0),
      pending: ms.filter((o) => paymentState(o) === 'pending').reduce((s, o) => s + o.total, 0),
      count: ms.length,
    }
  }
  return (
    <div className="space-y-4">
      <Section title="סיכום העברות">
        <div className="divide-y divide-line">
          {Object.entries(sums).map(([m, s]) => (
            <div key={m} className="flex items-center justify-between py-2.5 text-sm">
              <span className="font-medium">
                {PAYMENT[m].label} <span className="text-muted">({s.count})</span>
              </span>
              <span className="text-left">
                <span className="font-semibold">{ils(s.approved)}</span>
                {s.pending > 0 && <span className="block text-[12px] text-muted">עוד {ils(s.pending)} ממתינים</span>}
              </span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="כל התשלומים">
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map((o) => {
              const ps = paymentState(o)
              return (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold" dir="ltr">
                      #{o.number}
                    </span>{' '}
                    {o.customer.name}
                    <span className="block text-[12px] text-muted">
                      {PAYMENT[o.payment?.method]?.label} | {timeAgo(o.createdAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-left">
                    <span className="font-semibold">{ils(o.total)}</span>
                    <span className={`block text-[12px] ${ps === 'approved' ? 'text-[#1F7A43]' : ps === 'pending' ? 'text-[#9A5B00]' : 'text-danger'}`}>
                      {PAY_STATE_LABEL[ps]}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">אין עדיין תשלומים.</p>
        )}
      </Section>
    </div>
  )
}

const ACTIVE = ['awaiting_payment', 'preparing', 'ready', 'on_the_way']
const HISTORY = {
  delivered: (o) => o.status === 'delivered',
  rejected: (o) => o.status === 'rejected' || o.status === 'cancelled',
}

/** פתיחה וסגירה של החנות — בראש העמוד הראשון */
function StoreSwitch() {
  const { settings } = useData()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const open = settings.storeOpen
  const flip = async () => {
    setBusy(true)
    try {
      await storage.updateSettings({ storeOpen: !open })
      toast(open ? 'החנות נסגרה. אפשר להסתכל, אי אפשר להזמין' : 'החנות נפתחה')
    } catch {
      toast('לא הצלחנו לעדכן. בדקו חיבור')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className={`flex items-center gap-3 rounded-2xl p-4 ${open ? 'bg-[#E7F6EC]' : 'bg-[#FDECEA]'}`}>
      <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${open ? 'bg-[#1F9D55]' : 'bg-danger'}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[20px] font-extrabold leading-tight">{open ? 'החנות פתוחה' : 'החנות סגורה'}</p>
        <p className="text-[13px] text-muted">{open ? 'מקבלים הזמנות עכשיו' : 'רואים את המוצרים, אי אפשר להזמין'}</p>
      </div>
      <button
        type="button"
        onClick={flip}
        disabled={busy}
        aria-pressed={open}
        className={`btn shrink-0 px-5 py-3.5 text-[16px] ${open ? 'border border-danger/30 bg-white text-danger' : 'bg-[#1F9D55] text-white'}`}
      >
        {busy ? '...' : open ? 'סגירת החנות' : 'פתיחת החנות'}
      </button>
    </section>
  )
}

/** הודעה גדולה כשנכנסת הזמנה חדשה בזמן שהעמוד פתוח */
function NewOrderBanner({ order, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 9000)
    return () => clearTimeout(t)
  }, [order.id, onClose])
  return (
    <motion.button
      type="button"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      onClick={() => {
        document.getElementById(`order-${order.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        onClose()
      }}
      className="fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-ink px-4 py-4 text-right text-white shadow-[0_10px_30px_rgba(0,0,0,.3)]"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-ink">
        <BellRing size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[22px] font-extrabold leading-tight">הזמנה חדשה #{order.number}</span>
        <span className="block truncate text-[15px] text-white/80">
          {order.customer.name}, חדר {order.customer.room} | {ils(order.total)}
        </span>
      </span>
    </motion.button>
  )
}

export function OrdersTab() {
  const orders = useAllOrders()
  const [history, setHistory] = useState('delivered')
  const [sound, setSound] = useLocal('ybc2:adminSound', true)
  const [incoming, setIncoming] = useState(null)
  const known = useRef(null)

  useEffect(() => {
    if (!orders) return
    if (known.current) {
      const fresh = orders.filter((o) => !known.current.has(o.id))
      if (fresh.length) {
        if (sound) chime()
        vibrate([200, 100, 200])
        setIncoming(fresh[0])
      }
    }
    known.current = new Set(orders.map((o) => o.id))
  }, [orders, sound])

  const active = useMemo(() => (orders || []).filter((o) => ACTIVE.includes(o.status)).sort((a, b) => b.createdAt - a.createdAt), [orders])
  const waiting = active.filter((o) => o.status === 'awaiting_payment').length
  const closeBanner = useMemo(() => () => setIncoming(null), [])

  return (
    <div className="space-y-4">
      <StoreSwitch />
      <AdminPushCard />

      <div className="flex items-end justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[28px] font-extrabold leading-none">הזמנות {active.length > 0 && <span className="tabular-nums">({active.length})</span>}</h1>
          {waiting > 0 && <p className="mt-1 text-[14px] font-semibold text-[#9A5B00]">{waiting} מחכות לאישור תשלום</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            unlockAudio()
            setSound(!sound)
          }}
          className="btn-ghost px-2 py-2 text-[13px]"
        >
          {sound ? <Bell size={16} /> : <BellOff size={16} />}
          {sound ? 'צליל פעיל' : 'בלי צליל'}
        </button>
      </div>

      {!orders ? (
        <p className="py-10 text-center text-muted">טוענים הזמנות...</p>
      ) : active.length ? (
        active.map((o) => <OrderCard key={o.id} order={o} />)
      ) : (
        <div className="card px-4 py-10 text-center">
          <p className="text-lg font-bold">אין הזמנות פתוחות</p>
          <p className="mt-1 text-sm text-muted">הזמנה חדשה תופיע כאן בגדול, עם צליל והתראה.</p>
        </div>
      )}

      {orders && (
        <div className="space-y-3 pt-4">
          <h2 className="text-lg font-bold">היסטוריה</h2>
          <Segmented
            value={history}
            onChange={setHistory}
            options={[
              { value: 'delivered', label: 'נמסרו' },
              { value: 'rejected', label: 'נדחו ובוטלו' },
              { value: 'transfers', label: 'העברות' },
            ]}
          />
          {history === 'transfers' ? (
            <Transfers orders={orders} />
          ) : (
            (() => {
              const list = orders.filter(HISTORY[history])
              return list.length ? list.map((o) => <OrderCard key={o.id} order={o} />) : <p className="py-6 text-center text-sm text-muted">אין כאן הזמנות.</p>
            })()
          )}
        </div>
      )}

      <AnimatePresence>{incoming && <NewOrderBanner key={incoming.id} order={incoming} onClose={closeBanner} />}</AnimatePresence>
    </div>
  )
}
