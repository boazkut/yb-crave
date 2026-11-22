import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sheet } from '../components/Overlays.jsx'
import { useData } from '../state/DataContext.jsx'
import { storage } from '../services/storageService.js'
import { ORDER_STATUS, PAYMENT, buildWhatsAppText, waLink } from '../lib/shop.js'
import { ils } from '../lib/utils.js'

const STEPS = [
  { key: 'new', label: 'התקבלה', icon: '🧾' },
  { key: 'packing', label: 'אורזים לך', icon: '🛍️' },
  { key: 'ready', label: 'בדרך להפסקה!', icon: '🏃' },
]

export function useOrder(id) {
  const [order, setOrder] = useState(undefined)
  useEffect(() => {
    if (!id) return undefined
    return storage.subscribeOrder(id, setOrder)
  }, [id])
  return order
}

export function OrderTracking({ orderId, onClose }) {
  const order = useOrder(orderId)
  const { settings, mode } = useData()

  if (order === undefined) {
    return (
      <Sheet title="מעקב הזמנה" onClose={onClose}>
        <p className="py-10 text-center text-paper/60">טוענים את ההזמנה...</p>
      </Sheet>
    )
  }
  if (order === null) {
    return (
      <Sheet title="מעקב הזמנה" onClose={onClose}>
        <p className="py-10 text-center text-paper/60">לא מצאנו את ההזמנה הזאת. אולי היא נמחקה.</p>
      </Sheet>
    )
  }

  const st = ORDER_STATUS[order.status] || ORDER_STATUS.new
  const step = st.step
  const cancelled = order.status === 'cancelled'
  const delivered = order.status === 'delivered'
  const wa = waLink(settings.whatsappNumber, buildWhatsAppText(order))

  return (
    <Sheet title="מעקב הזמנה" onClose={onClose}>
      <div className="text-center">
        <p className="text-sm font-bold text-paper/60">מספר הזמנה</p>
        <motion.p
          initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: -2, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          className="display mx-auto mt-1 inline-block border-[3px] border-coal bg-lime px-4 pb-1 text-6xl leading-none text-coal shadow-[5px_5px_0_0_#0E0D0B]"
          dir="ltr"
        >
          #{order.number}
        </motion.p>
        <p className="display mt-4 text-3xl leading-tight">{cancelled ? 'ההזמנה בוטלה' : delivered ? 'נמסר. בתיאבון!' : st.track}</p>
        <p className="mt-1 text-sm text-paper/60">
          {order.customer.slotLabel}, {order.customer.meetPoint}
        </p>
      </div>

      {!cancelled && (
        <div className="relative mt-7 px-2">
          <div className="absolute inset-x-6 top-[22px] h-1.5 rounded-full bg-paper/10" />
          <motion.div
            className="absolute right-6 top-[22px] h-1.5 rounded-full bg-lime"
            initial={{ width: 0 }}
            animate={{ width: `calc((100% - 48px) * ${Math.min(step, 2) / 2})` }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          />
          <ol className="relative flex justify-between">
            {STEPS.map((s, i) => {
              const done = step >= i
              const current = step === i && !delivered
              return (
                <li key={s.key} className="flex w-20 flex-col items-center text-center">
                  <motion.span
                    animate={current ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                    transition={current ? { repeat: Infinity, duration: 1.4 } : {}}
                    className={`grid h-12 w-12 place-items-center rounded-full border-[3px] text-xl ${
                      done ? 'border-coal bg-lime' : 'border-paper/20 bg-coal-2 grayscale'
                    }`}
                  >
                    {s.icon}
                  </motion.span>
                  <span className={`mt-2 text-xs font-extrabold leading-tight ${done ? '' : 'text-paper/40'}`}>{s.label}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <div className="mt-7 rounded-[6px] bg-coal p-3.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-paper/60">תשלום</span>
          <span className="font-extrabold">
            {PAYMENT[order.payment.method]?.label}{' '}
            {order.paid ? (
              <span className="text-lime">שולם ✓</span>
            ) : order.payment.method === 'cash' ? (
              <span className="text-paper/60">במסירה{order.payment.changeFor && order.payment.changeFor !== 'בדיוק' ? `, עודף מ-${order.payment.changeFor}` : ''}</span>
            ) : (
              <span className="text-[#FFB000]">ממתין לאימות</span>
            )}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5 border-t border-paper/10 pt-3 text-sm">
          {order.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {l.qty}× {l.name}
                {l.owner && <span className="text-paper/50"> ({l.owner})</span>}
                {l.details?.length > 0 && <span className="block text-xs text-paper/45">{l.details.join(', ')}</span>}
              </span>
              <span className="shrink-0 tabular-nums text-paper/70">{l.unitPrice ? ils(l.unitPrice * l.qty) : 'חינם'}</span>
            </li>
          ))}
        </ul>
        {order.discount > 0 && (
          <div className="mt-3 flex justify-between border-t border-paper/10 pt-3 text-sm text-lime">
            <span>קופון {order.couponCode}</span>
            <span className="tabular-nums">-{ils(order.discount)}</span>
          </div>
        )}
        {order.deposit > 0 && (
          <div className="mt-1.5 flex justify-between text-sm text-paper/70">
            <span>פיקדון (חוזר אליך)</span>
            <span className="tabular-nums">{ils(order.deposit)}</span>
          </div>
        )}
        <div className="mt-3 flex justify-between border-t border-paper/10 pt-3">
          <span className="font-bold">סה&quot;כ</span>
          <span className="display text-xl">{ils(order.total)}</span>
        </div>
      </div>

      <a href={wa} target="_blank" rel="noreferrer" className="btn mt-4 w-full bg-[#25D366] text-coal">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
        </svg>
        שליחת הפירוט ל-Y&amp;B בוואטסאפ
      </a>
      <p className="mt-2 text-center text-xs text-paper/50">
        {mode === 'local'
          ? 'מומלץ לשלוח, ככה Y&B מקבלים את ההזמנה ישר לטלפון.'
          : 'ההזמנה כבר אצלנו במערכת. הוואטסאפ הוא גיבוי למקרה הצורך.'}
      </p>
      <button type="button" onClick={onClose} className="btn-ghost mb-2 mt-4 w-full">
        חזרה לחנות
      </button>
    </Sheet>
  )
}
