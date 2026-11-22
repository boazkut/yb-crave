import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellRing, Check, ChevronLeft, CircleX, MessageCircle, Phone, ShoppingBag } from 'lucide-react'
import { Sheet } from '../components/Overlays.jsx'
import { useData } from '../state/DataContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useLocal, LS_KEYS } from '../state/useLocal.js'
import { storage } from '../services/storageService.js'
import { ACTIVE_STATUSES, ORDER_STATUS, PAYMENT, statusLabel, waLink } from '../lib/shop.js'
import { ils, vibrate } from '../lib/utils.js'
import { localNotify, pushSupport, subscribePush } from '../lib/push.js'

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
  const [state, setState] = useState(() => (typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'maybe' : 'idle'))
  const [busy, setBusy] = useState(false)
  if (!storage.saveOrderPush) return null
  const support = pushSupport()
  if (support === 'unsupported') return null

  const enable = async () => {
    setBusy(true)
    try {
      const sub = await subscribePush(storage.vapidPublicKey)
      await storage.saveOrderPush(orderId, sub)
      setState('on')
      ui.toast('מעולה. נודיע לך כשההזמנה מוכנה וכשהיא בדרך')
    } catch (e) {
      ui.toast(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (state === 'on') {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#E7F6EC] px-4 py-3 text-[14px] text-[#15803D]">
        <BellRing size={18} /> התראות פעילות להזמנה הזאת
      </div>
    )
  }
  return (
    <div className="mt-4 rounded-2xl border border-line p-4">
      <p className="font-semibold">רוצים התראה לטלפון?</p>
      <p className="mt-0.5 text-[13px] text-muted">
        {support === 'ios-install'
          ? 'באייפון: לוחצים "שיתוף" ← "הוספה למסך הבית", פותחים מהאייקון ומפעילים כאן.'
          : 'נשלח לך התראה כשההזמנה מוכנה וכשהיא יוצאת לחדר.'}
      </p>
      {support !== 'ios-install' && (
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

/** הזמנה פעילה של הטלפון הזה — מוצגת כפס קטן מעל סרגל ההזמנה */
export function ActiveOrderPill() {
  const [mine] = useLocal(LS_KEYS.myOrders, [])
  const latest = (mine || []).find((o) => Date.now() - o.createdAt < 1000 * 60 * 60 * 24)
  const order = useOrder(latest?.id)
  const ui = useUI()
  const show = order && (ACTIVE_STATUSES.includes(order.status) || order.status === 'rejected')
  const prev = useRef(null)
  useEffect(() => {
    if (!order) return
    const key = `${order.id}:${order.status}`
    if (prev.current && prev.current !== key && prev.current.startsWith(order.id)) {
      const text = statusLabel(order)
      ui.toast(`הזמנה #${order.number}: ${text}`)
      vibrate([80, 60, 80])
      if (document.hidden) localNotify(`הזמנה #${order.number}`, text)
    }
    prev.current = key
  }, [order, ui])

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key={order.id}
          type="button"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          onClick={() => ui.openSheet('status', order.id)}
          className="pointer-events-auto mx-auto mb-2 flex w-full max-w-lg items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-right shadow-[0_4px_16px_rgba(0,0,0,.06)]"
        >
          <span className="min-w-0">
            <span className="block text-[13px] text-muted">הזמנה #{order.number}</span>
            <span className={`block truncate text-[15px] font-semibold ${order.status === 'rejected' ? 'text-danger' : ''}`}>{statusLabel(order)}</span>
          </span>
          <ChevronLeft size={18} className="shrink-0 text-muted" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export function CartBar() {
  const cart = useCart()
  const ui = useUI()
  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3">
      <ActiveOrderPill />
      <AnimatePresence>
        {cart.count > 0 && (
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
