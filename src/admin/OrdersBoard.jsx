import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { storage } from '../services/storageService.js'
import { ORDER_STATUS, PAYMENT, buildWhatsAppText } from '../lib/shop.js'
import { copyText, dateKey, ils, vibrate } from '../lib/utils.js'
import { Card, Segmented, beep, timeAgo, unlockAudio, useAdminToast } from './adminUi.jsx'
import { useLocal } from '../state/useLocal.js'

export function useOrders() {
  const [orders, setOrders] = useState(null)
  useEffect(() => storage.subscribeOrders(setOrders), [])
  return orders
}

const FLOW = ['new', 'packing', 'ready', 'delivered']

function OrderCard({ order: o, fresh }) {
  const toast = useAdminToast()
  const [menu, setMenu] = useState(false)
  const pay = PAYMENT[o.payment?.method] || PAYMENT.cash
  const st = ORDER_STATUS[o.status] || ORDER_STATUS.new

  const update = async (patch, msg) => {
    try {
      await storage.updateOrder(o.id, patch)
      if (msg) toast(msg)
      vibrate(10)
    } catch {
      toast('העדכון נכשל, נסו שוב')
    }
  }

  const groups = useMemo(() => {
    const g = {}
    for (const l of o.lines || []) {
      const k = o.groupMode ? l.owner || 'בלי שם' : ''
      ;(g[k] ||= []).push(l)
    }
    return g
  }, [o])

  return (
    <motion.article
      layout
      initial={fresh ? { scale: 0.9, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className={`rounded-[8px] border-2 bg-coal-2 p-3.5 ${fresh ? 'border-lime' : 'border-paper/12'} ${
        o.status === 'cancelled' ? 'opacity-50' : ''
      }`}
      style={{ boxShadow: `4px 4px 0 0 ${st.color}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="display text-2xl leading-none" dir="ltr">
              #{o.number}
            </span>
            <span className="rounded-[4px] bg-paper px-1.5 py-0.5 text-[11px] font-black text-coal">{o.customer?.slotLabel}</span>
          </div>
          <p className="mt-1.5 text-base font-extrabold leading-tight">
            {o.customer?.name} <span className="text-paper/60">| {o.customer?.classroom}</span>
          </p>
          <p className="text-xs text-paper/55">
            {o.customer?.meetPoint} | {timeAgo(o.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-[4px] border-2 border-coal px-2 py-0.5 text-xs font-black text-coal" style={{ background: pay.color }}>
            {pay.label}
          </span>
          <span className="display text-xl leading-none">{ils(o.total)}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2 rounded-[6px] bg-coal p-2.5 text-sm">
        {Object.entries(groups).map(([owner, ls]) => (
          <div key={owner}>
            {owner && <p className="mb-0.5 text-xs font-black text-lime">{owner}</p>}
            <ul className="space-y-1">
              {ls.map((l, i) => (
                <li key={i}>
                  <span className="font-extrabold">{l.qty}×</span> {l.name}
                  {l.details?.length > 0 && <span className="block pr-5 text-xs leading-snug text-paper/55">{l.details.join(', ')}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {o.note && <p className="border-t border-paper/10 pt-2 text-xs font-bold text-[#FFB000]">📝 {o.note}</p>}
        {o.payment?.method === 'cash' && o.payment.changeFor && o.payment.changeFor !== 'בדיוק' && (
          <p className="text-xs font-bold text-lime">💵 צריך עודף מ-{o.payment.changeFor}</p>
        )}
        {o.payment?.note && <p className="text-xs text-paper/60">אסמכתא: {o.payment.note}</p>}
        {o.discount > 0 && <p className="text-xs text-paper/60">קופון {o.couponCode}: -{ils(o.discount)}</p>}
        {o.deposit > 0 && <p className="text-xs text-paper/60">כולל פיקדון {ils(o.deposit)} (להחזיר כשהמטען חוזר)</p>}
      </div>

      <button
        type="button"
        onClick={() => update({ paid: !o.paid }, o.paid ? 'סומן כממתין' : 'סומן כשולם')}
        className={`mt-3 w-full rounded-[6px] border-2 px-3 py-2.5 text-sm font-extrabold ${
          o.paid ? 'border-coal bg-lime text-coal' : 'border-[#FFB000] bg-[#FFB000]/10 text-[#FFB000]'
        }`}
      >
        {o.paid ? 'שולם ✅' : o.payment?.method === 'cash' ? 'ממתין לתשלום במזומן ⏳' : `ממתין לאימות ${pay.label} ⏳`}
      </button>

      <div className="mt-2">
        <Segmented
          size="sm"
          value={o.status}
          onChange={(v) => update({ status: v }, `סטטוס: ${ORDER_STATUS[v].label}`)}
          options={FLOW.map((s) => ({ value: s, label: ORDER_STATUS[s].label, color: ORDER_STATUS[s].color }))}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          className="text-xs font-bold text-paper/55 underline"
          onClick={async () => toast((await copyText(buildWhatsAppText(o))) ? 'פירוט ההזמנה הועתק' : 'ההעתקה נכשלה')}
        >
          העתק פירוט
        </button>
        <button type="button" className="text-xs font-bold text-paper/55 underline" onClick={() => setMenu((m) => !m)}>
          עוד פעולות
        </button>
      </div>
      <AnimatePresence>
        {menu && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 flex gap-2">
              {o.status !== 'cancelled' ? (
                <button type="button" className="btn-ghost flex-1 py-2 text-xs" onClick={() => update({ status: 'cancelled' }, 'ההזמנה בוטלה')}>
                  ביטול הזמנה
                </button>
              ) : (
                <button type="button" className="btn-ghost flex-1 py-2 text-xs" onClick={() => update({ status: 'new' }, 'ההזמנה שוחזרה')}>
                  שחזור הזמנה
                </button>
              )}
              <button
                type="button"
                className="btn-ghost flex-1 border-cola/50 py-2 text-xs text-cola"
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
    </motion.article>
  )
}

export function OrdersBoard() {
  const orders = useOrders()
  const [filter, setFilter] = useState('active')
  const [sound, setSound] = useLocal('ybc:adminSound', true)
  const known = useRef(null)
  const [fresh, setFresh] = useState(new Set())

  // התראה על הזמנה חדשה
  useEffect(() => {
    if (!orders) return
    const ids = new Set(orders.map((o) => o.id))
    if (known.current) {
      const added = orders.filter((o) => !known.current.has(o.id) && o.status === 'new')
      if (added.length) {
        if (sound) beep()
        vibrate([80, 60, 80])
        setFresh((f) => new Set([...f, ...added.map((o) => o.id)]))
        setTimeout(() => setFresh(new Set()), 8000)
      }
    }
    known.current = ids
  }, [orders, sound])

  const today = dateKey()
  const list = useMemo(() => {
    if (!orders) return []
    const f = {
      active: (o) => ['new', 'packing', 'ready'].includes(o.status),
      today: (o) => o.dateKey === today || o.customer?.slotDate === today,
      all: () => true,
    }[filter]
    const l = orders.filter(f)
    if (filter === 'active') {
      return [...l].sort(
        (a, b) =>
          String(a.customer?.slotDate + a.customer?.slotTime).localeCompare(String(b.customer?.slotDate + b.customer?.slotTime)) ||
          a.createdAt - b.createdAt,
      )
    }
    return l
  }, [orders, filter, today])

  if (!orders) return <p className="py-10 text-center text-paper/60">טוענים הזמנות...</p>

  const counts = {
    new: orders.filter((o) => o.status === 'new').length,
    unpaid: orders.filter((o) => !o.paid && o.status !== 'cancelled' && o.status !== 'delivered').length,
  }

  let lastSlot = null
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-3xl leading-none">הזמנות</h1>
        <button
          type="button"
          onClick={() => {
            unlockAudio()
            setSound(!sound)
            if (!sound) beep()
          }}
          className="btn-ghost px-3 py-2 text-xs"
        >
          {sound ? '🔔 צליל פעיל' : '🔕 בלי צליל'}
        </button>
      </div>
      <div className="flex gap-2 text-sm font-extrabold">
        <span className="rounded-[6px] bg-pen/20 px-3 py-1.5 text-[#9DB0FF]">{counts.new} חדשות</span>
        <span className="rounded-[6px] bg-[#FFB000]/15 px-3 py-1.5 text-[#FFB000]">{counts.unpaid} לא שולמו</span>
      </div>
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: 'פעילות' },
          { value: 'today', label: 'היום' },
          { value: 'all', label: 'הכל' },
        ]}
      />

      {list.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-paper/60">
            {filter === 'active' ? 'אין הזמנות פתוחות. רגע טוב לסדר את המלאי.' : 'אין הזמנות להצגה.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((o) => {
            const slot = filter === 'active' ? o.customer?.slotLabel : null
            const header = slot && slot !== lastSlot
            lastSlot = slot
            return (
              <div key={o.id}>
                {header && <h3 className="display mb-2 mt-2 text-lg text-lime">{slot}</h3>}
                <OrderCard order={o} fresh={fresh.has(o.id)} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
