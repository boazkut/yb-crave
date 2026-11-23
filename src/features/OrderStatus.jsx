import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellRing, Check, ChevronLeft, CircleX, Footprints, MessageCircle, PackageCheck, PartyPopper, Phone, ShoppingBag } from 'lucide-react'
import { Sheet, useScrollLock } from '../components/Overlays.jsx'
import { useData } from '../state/DataContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useLocal, LS_KEYS } from '../state/useLocal.js'
import { storage } from '../services/storageService.js'
import { ACTIVE_STATUSES, ORDER_STATUS, PAYMENT, statusLabel, waLink } from '../lib/shop.js'
import { ils, readLS, vibrate, writeLS } from '../lib/utils.js'
import { localNotify, pushSupport } from '../lib/push.js'
import { PUSH_ORDERS, enableOrderPushManually } from '../lib/orderPush.js'
import { celebrate } from '../lib/celebrate.js'

export function useOrder(id) {
  const [order, setOrder] = useState(undefined)
  useEffect(() => {
    if (!id) return undefined
    setOrder(undefined)
    return storage.subscribeOrder(id, setOrder)
  }, [id])
  return order
}

const STEPS = [
  { key: 'awaiting_payment', label: 'ממתין לאישור תשלום', cash: 'ההזמנה התקבלה' },
  { key: 'preparing', label: 'תשלום אושר, מכינים לך', cash: 'מכינים לך' },
  { key: 'ready', label: 'ההזמנה מוכנה' },
  { key: 'on_the_way', label: 'בדרך לחדר שלך' },
  { key: 'delivered', label: 'נמסר' },
]

/** טלפונים לבעיות — מוצגים בתחתית האתר ובמסך ההזמנה */
export function SupportPhones({ light = false, className = '' }) {
  const { settings } = useData()
  const phones = settings.supportPhones || []
  if (!phones.length) return null
  return (
    <div className={className}>
      <p className={`mb-2 text-[13px] ${light ? 'text-white/80' : 'text-muted'}`}>בעיה בהזמנה? מתקשרים אלינו</p>
      <div className="flex flex-wrap gap-2">
        {phones.map((ph) => (
          <a
            key={ph}
            href={`tel:${ph.replace(/\D/g, '')}`}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[14px] font-semibold ${light ? 'bg-white/90 text-ink' : 'border border-line bg-white'}`}
          >
            <Phone size={15} />
            <span dir="ltr">{ph}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

function NotifyCard({ orderId }) {
  const ui = useUI()
  const [connected] = useLocal(PUSH_ORDERS, [])
  const [busy, setBusy] = useState(false)
  if (!storage.saveOrderPush) return null
  const support = pushSupport()
  if (support === 'unsupported') return null

  const enable = async () => {
    setBusy(true)
    try {
      await enableOrderPushManually(orderId)
      ui.toast('מעולה. נודיע לך כשההזמנה מוכנה וכשהיא בדרך')
    } catch (e) {
      ui.toast(e.message)
    } finally {
      setBusy(false)
    }
  }

  if ((connected || []).includes(orderId)) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#E7F6EC] px-4 py-3 text-[14px] text-[#15803D]">
        <BellRing size={18} /> התראות פעילות: נודיע לך כשמוכן וכשיוצאים לחדר
      </div>
    )
  }
  return (
    <div className="mt-4 rounded-2xl border border-line p-4">
      <p className="font-semibold">רוצים התראה לטלפון?</p>
      <p className="mt-0.5 text-[13px] text-muted">
        {support === 'ios-install'
          ? 'באייפון: לוחצים "שיתוף" ← "הוספה למסך הבית", פותחים מהאייקון ומפעילים כאן.'
          : support === 'denied'
            ? 'ההתראות חסומות בדפדפן. אפשר לאפשר אותן בהגדרות האתר (המנעול ליד הכתובת).'
            : 'נשלח לך התראה כשההזמנה מוכנה וכשהיא יוצאת לחדר.'}
      </p>
      {support === 'ok' && (
        <button type="button" onClick={enable} disabled={busy} className="btn-primary mt-3 w-full">
          <Bell size={17} /> {busy ? 'מפעילים...' : 'הפעלת התראות'}
        </button>
      )}
    </div>
  )
}

export function OrderStatus({ orderId, onClose }) {
  const order = useOrder(orderId)
  const { settings } = useData()

  if (order === undefined) {
    return (
      <Sheet title="ההזמנה שלך" onClose={onClose}>
        <p className="py-12 text-center text-muted">טוענים...</p>
      </Sheet>
    )
  }
  if (order === null) {
    return (
      <Sheet title="ההזמנה שלך" onClose={onClose}>
        <p className="py-12 text-center text-muted">לא מצאנו את ההזמנה הזאת.</p>
      </Sheet>
    )
  }

  const st = ORDER_STATUS[order.status] || ORDER_STATUS.awaiting_payment
  const failed = order.status === 'rejected' || order.status === 'cancelled'
  const cash = order.payment?.method === 'cash'
  const help = waLink(settings.whatsappNumber, `היי, לגבי הזמנה #${order.number}`)

  return (
    <Sheet title="ההזמנה שלך" onClose={onClose}>
      <div className="rounded-2xl bg-tile p-5 text-center">
        <p className="text-sm text-muted">מספר הזמנה</p>
        <p className="mt-1 text-5xl font-extrabold tabular-nums" dir="ltr">
          #{order.number}
        </p>
        <p className={`mt-3 text-lg font-semibold ${failed ? 'text-danger' : ''}`}>{statusLabel(order)}</p>
      </div>

      {failed ? (
        <div className="mt-4 rounded-2xl border border-danger/25 bg-white p-4">
          <div className="flex items-start gap-3">
            <CircleX size={22} className="mt-0.5 shrink-0 text-danger" />
            <div>
              <p className="font-semibold">{order.status === 'rejected' ? 'התשלום לא אושר' : 'ההזמנה בוטלה'}</p>
              {order.rejectReason && <p className="mt-1 text-sm text-muted">הסיבה: {order.rejectReason}</p>}
              <p className="mt-2 text-sm text-muted">אפשר לכתוב לנו ונסדר את זה.</p>
            </div>
          </div>
          <a href={help} target="_blank" rel="noreferrer" className="btn-secondary mt-3 w-full">
            <MessageCircle size={18} /> כתבו לנו בוואטסאפ
          </a>
        </div>
      ) : (
        <>
        {ACTIVE_STATUSES.includes(order.status) && <NotifyCard orderId={order.id} />}
        <ol className="mt-5 space-y-0">
          {STEPS.map((s, i) => {
            const done = st.step > i || order.status === 'delivered'
            const current = st.step === i && order.status !== 'delivered'
            const label = cash && s.cash ? s.cash : s.label
            return (
              <li key={s.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full border ${
                      done ? 'border-ink bg-ink text-white' : current ? 'border-ink bg-white' : 'border-line bg-white'
                    }`}
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : current ? <span className="h-2 w-2 animate-pulse rounded-full bg-ink" /> : null}
                  </span>
                  {i < STEPS.length - 1 && <span className={`h-6 w-px ${done ? 'bg-ink' : 'bg-line'}`} />}
                </div>
                <p className={`pt-1 text-[15px] ${done || current ? 'font-medium' : 'text-muted'}`}>{label}</p>
              </li>
            )
          })}
        </ol>
        </>
      )}

      <div className="mt-5 rounded-2xl border border-line p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">משלוח לחדר</span>
          <span className="font-medium">{order.customer.room}</span>
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="text-muted">תשלום</span>
          <span className="font-medium">
            {PAYMENT[order.payment.method]?.label}
            {cash && order.payment.changeFor && order.payment.changeFor !== 'בדיוק' ? `, עודף מ-${order.payment.changeFor}` : ''}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {order.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {l.qty} × {l.name}
                {l.details?.length > 0 && <span className="block text-[12px] text-muted">{l.details.join(', ')}</span>}
              </span>
              <span className="shrink-0 tabular-nums text-muted">{ils(l.unitPrice * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-bold">
          <span>סה&quot;כ</span>
          <span>{ils(order.total)}</span>
        </div>
      </div>

      <SupportPhones className="mt-5" />
      <button type="button" onClick={onClose} className="btn-secondary mt-4 w-full">
        חזרה לחנות
      </button>
    </Sheet>
  )
}

/** מה מציגים במסך הגדול כשההזמנה מתקדמת */
const TAKEOVER = {
  preparing: (o) => ({
    Icon: Check,
    title: o.payment?.method === 'cash' ? 'ההזמנה התקבלה!' : 'התשלום אושר!',
    sub: 'מתחילים להכין לך את ההזמנה.',
  }),
  ready: () => ({ Icon: PackageCheck, title: 'ההזמנה מוכנה!', sub: 'עוד רגע יוצאים אליך.' }),
  on_the_way: (o) => ({ Icon: Footprints, title: `בדרך לחדר ${o.customer?.room || ''}!`, sub: 'כדאי להיות בחדר, אנחנו כמעט שם.' }),
  delivered: () => ({ Icon: PartyPopper, title: 'נמסר. בתיאבון!', sub: 'תודה שהזמנת מ-Y&B.' }),
  rejected: (o) => ({ Icon: CircleX, title: 'התשלום לא אושר', sub: o.rejectReason ? `הסיבה: ${o.rejectReason}` : 'כתבו לנו ונסדר את זה.', danger: true }),
  cancelled: () => ({ Icon: CircleX, title: 'ההזמנה בוטלה', sub: 'אם זו טעות, כתבו לנו.', danger: true }),
}

const SEEN_KEY = 'ybc2:seenStatus'

/** פס התקדמות: שולם, מוכן, בדרך, נמסר */
function ProgressBar({ order, light = false }) {
  const step = ORDER_STATUS[order.status]?.step ?? 0
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? (light ? 'bg-white' : 'bg-ink') : light ? 'bg-white/20' : 'bg-line'}`} />
      ))}
    </div>
  )
}

/** מסך מלא כשההזמנה מתקדמת — כדי שהלקוח יראה את זה בגדול */
function OrderTakeover({ order, onClose, onDetails }) {
  useScrollLock()
  const t = TAKEOVER[order.status](order)
  const { Icon } = t
  return createPortal(
    <motion.div
      className={`fixed inset-0 z-[95] flex flex-col items-center justify-center px-6 text-center text-white ${t.danger ? 'bg-[#B42318]' : 'bg-ink'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="alertdialog"
      aria-modal="true"
      aria-label={t.title}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="grid h-28 w-28 place-items-center rounded-full bg-white text-ink"
      >
        <Icon size={56} strokeWidth={2.2} className={t.danger ? 'text-[#B42318]' : ''} />
      </motion.div>
      <p className="mt-6 text-[15px] text-white/70" dir="ltr">
        #{order.number}
      </p>
      <h2 className="mt-1 text-[40px] font-extrabold leading-[1.05] tracking-tight">{t.title}</h2>
      <p className="mt-3 max-w-xs text-[17px] leading-relaxed text-white/85">{t.sub}</p>
      {!t.danger && (
        <div className="mt-8 w-full max-w-xs">
          <ProgressBar order={order} light />
        </div>
      )}
      <div className="safe-bottom absolute inset-x-0 bottom-0 mx-auto grid w-full max-w-sm gap-2 px-6 pb-6">
        <button type="button" onClick={onClose} className="btn bg-white py-4 text-[17px] text-ink">
          אחלה
        </button>
        <button type="button" onClick={onDetails} className="btn py-3 text-[15px] text-white/80">
          לפרטי ההזמנה
        </button>
      </div>
    </motion.div>,
    document.body,
  )
}

/** הזמנה פעילה של הטלפון הזה — כרטיס מעל סרגל ההזמנה, ומסך מלא כשהיא מתקדמת */
export function ActiveOrderPill() {
  const [mine] = useLocal(LS_KEYS.myOrders, [])
  const latest = (mine || []).find((o) => Date.now() - o.createdAt < 1000 * 60 * 60 * 24)
  const order = useOrder(latest?.id)
  const ui = useUI()
  const [takeover, setTakeover] = useState(null)
  const show = order && (ACTIVE_STATUSES.includes(order.status) || order.status === 'rejected')

  useEffect(() => {
    if (!order) return
    const seen = readLS(SEEN_KEY, {})
    const last = seen[order.id]
    if (last === order.status) return
    if (last && TAKEOVER[order.status]) {
      setTakeover(order)
      vibrate([120, 80, 120])
      if (order.status === 'ready' || order.status === 'delivered') celebrate()
      if (document.hidden) localNotify(`הזמנה #${order.number}`, statusLabel(order))
    }
    // שומרים רק את 10 ההזמנות האחרונות
    const keep = Object.fromEntries(Object.entries(seen).slice(-10))
    writeLS(SEEN_KEY, { ...keep, [order.id]: order.status })
  }, [order])

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.button
            key={order.id}
            type="button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={() => ui.openSheet('status', order.id)}
            className="pointer-events-auto mx-auto mb-2 block w-full max-w-lg rounded-2xl bg-white px-4 py-3.5 text-right shadow-[0_6px_20px_rgba(0,0,0,.18)]"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[13px] text-muted">ההזמנה שלך #{order.number}</span>
                <span className={`block truncate text-[18px] font-extrabold ${order.status === 'rejected' ? 'text-danger' : ''}`}>{statusLabel(order)}</span>
              </span>
              <ChevronLeft size={20} className="shrink-0 text-muted" />
            </span>
            {order.status !== 'rejected' && (
              <span className="mt-2.5 block">
                <ProgressBar order={order} />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {takeover && (
          <OrderTakeover
            key={`${takeover.id}-${takeover.status}`}
            order={takeover}
            onClose={() => setTakeover(null)}
            onDetails={() => {
              setTakeover(null)
              ui.openSheet('status', takeover.id)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export function CartBar() {
  const cart = useCart()
  const ui = useUI()
  const { settings } = useData()
  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3">
      <ActiveOrderPill />
      <AnimatePresence>
        {cart.count > 0 && settings.storeOpen && (
          <motion.button
            type="button"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            onClick={() => ui.openSheet('checkout')}
            className="pointer-events-auto mx-auto flex w-full max-w-lg items-center gap-3 rounded-2xl bg-ink px-4 py-3.5 text-white"
            aria-label={`פתיחת ההזמנה, ${cart.count} פריטים`}
          >
            <span className="grid h-7 min-w-7 place-items-center rounded-full bg-white/15 px-2 text-sm font-semibold tabular-nums">{cart.count}</span>
            <span className="flex flex-1 items-center gap-2 text-[16px] font-semibold">
              <ShoppingBag size={18} strokeWidth={2} />
              להזמנה
            </span>
            <span className="text-[16px] font-bold tabular-nums">{ils(cart.total)}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
