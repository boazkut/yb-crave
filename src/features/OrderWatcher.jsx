import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocal, LS_KEYS } from '../state/useLocal.js'
import { useData } from '../state/DataContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { storage } from '../services/storageService.js'
import { ORDER_STATUS, isAvailable } from '../lib/shop.js'

const TWO_DAYS = 1000 * 60 * 60 * 48

/**
 * רץ ברקע בחנות:
 * 1. עוקב אחרי ההזמנות האחרונות של הטלפון הזה ומציג "פס מעקב" צף.
 * 2. מזכה ניקוב בכרטיסייה כשהזמנה מאושרת (שולמה או נמסרה).
 * 3. מקפיץ הודעה כשמוצר שביקשתם "תודיעו לי" חוזר למלאי.
 */
export function OrderWatcher() {
  const [myOrders] = useLocal(LS_KEYS.myOrders, [])
  const [, setLoyalty] = useLocal(LS_KEYS.loyalty, { punches: 0, credited: [] })
  const [notifyList, setNotifyList] = useLocal(LS_KEYS.notify, [])
  const { products, byId } = useData()
  const ui = useUI()
  const [live, setLive] = useState({})

  const recent = (myOrders || []).filter((o) => Date.now() - o.createdAt < TWO_DAYS).slice(0, 5)
  const recentKey = recent.map((o) => o.id).join(',')

  useEffect(() => {
    const unsubs = recent.map((o) =>
      storage.subscribeOrder(o.id, (order) => {
        setLive((m) => ({ ...m, [o.id]: order }))
        if (order && order.status !== 'cancelled' && (order.paid || order.status === 'delivered')) {
          setLoyalty((l) => {
            const credited = l.credited || []
            if (credited.includes(o.id)) return l
            return { punches: (l.punches || 0) + 1, credited: [...credited, o.id].slice(-50) }
          })
        }
      }),
    )
    return () => unsubs.forEach((u) => u && u())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentKey])

  // "תודיעו לי כשחוזר"
  const warned = useRef(new Set())
  useEffect(() => {
    const back = (notifyList || []).filter((id) => byId[id] && isAvailable(byId[id]))
    if (!back.length) return
    back.forEach((id) => {
      if (warned.current.has(id)) return
      warned.current.add(id)
      ui.toast(`🔔 חזר למלאי: ${byId[id].name}`)
    })
    setNotifyList((l) => l.filter((id) => !back.includes(id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

  const active = recent
    .map((o) => live[o.id])
    .find((o) => o && o.status !== 'delivered' && o.status !== 'cancelled')

  return (
    <AnimatePresence>
      {active && (
        <motion.button
          type="button"
          key={active.id}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={() => ui.openSheet('track', active.id)}
          className="fixed inset-x-0 bottom-[86px] z-40 mx-auto flex w-[calc(100%-24px)] max-w-md items-center justify-between gap-2 rounded-[8px] border-2 border-coal bg-lime px-3.5 py-2 text-coal shadow-[4px_4px_0_0_#0E0D0B]"
        >
          <span className="flex items-center gap-2 text-sm font-extrabold">
            <span className="h-2 w-2 animate-blink rounded-full bg-coal" />
            הזמנה #{active.number}: {ORDER_STATUS[active.status]?.track}
          </span>
          <span className="text-xs font-bold underline underline-offset-2">למעקב</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
