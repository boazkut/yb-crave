import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { storage } from '../services/storageService.js'
import { useLocal } from '../state/useLocal.js'
import { readLS, vibrate, writeLS } from '../lib/utils.js'
import { pushSupport, setAppBadge, silentSubscription, subscribePush } from '../lib/push.js'
import { chime } from './ui.jsx'

/**
 * ההזמנות של אזור המנהלים, במקום אחד לכל הטאבים:
 * - מה עוד לא נקרא בטלפון הזה (העיגול עם המספר בטאב ועל האייקון)
 * - הודעה גדולה למעלה + צליל כשנכנסת הזמנה חדשה, בכל טאב
 * - חיבור שקט להתראות לטלפון בכל כניסה, כדי שלא יפסיקו להגיע
 */
const Ctx = createContext(null)
const SEEN = 'ybc2:seenOrderIds'
export const ACTIVE = ['awaiting_payment', 'preparing', 'ready', 'on_the_way']

export function AdminOrdersProvider({ children }) {
  const [orders, setOrders] = useState(null)
  const [seen, setSeen] = useState(() => readLS(SEEN, null))
  const [incoming, setIncoming] = useState(null)
  const [sound] = useLocal('ybc2:adminSound', true)
  const [pushOn, setPushOn] = useState(false)
  const known = useRef(null)

  useEffect(() => storage.subscribeOrders(setOrders, { days: 7 }), [])

  // פעם ראשונה בטלפון הזה: כל מה שכבר קיים נחשב כנקרא
  useEffect(() => {
    if (orders && seen === null) {
      const ids = orders.map((o) => o.id)
      writeLS(SEEN, ids)
      setSeen(ids)
    }
  }, [orders, seen])

  // הזמנה חדשה בזמן שהאפליקציה פתוחה
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

  const unreadIds = useMemo(() => {
    if (!orders || !seen) return new Set()
    return new Set(orders.filter((o) => ACTIVE.includes(o.status) && !seen.includes(o.id)).map((o) => o.id))
  }, [orders, seen])

  // העיגול על האייקון של האפליקציה
  useEffect(() => {
    if (orders && seen) setAppBadge(unreadIds.size)
  }, [unreadIds.size, orders, seen])

  const markSeen = useCallback((id) => {
    setSeen((prev) => {
      if (!prev || prev.includes(id)) return prev
      const next = [id, ...prev].slice(0, 400)
      writeLS(SEEN, next)
      return next
    })
  }, [])

  // התראות לטלפון: בכל כניסה מחדשים את המנוי בשקט (אם כבר אישרו), כדי שימשיכו להגיע
  useEffect(() => {
    if (!storage.saveAdminPush) return
    silentSubscription(storage.vapidPublicKey).then(async (sub) => {
      if (!sub) return
      try {
        await storage.saveAdminPush(sub)
        setPushOn(true)
      } catch {
        /* ננסה בכניסה הבאה */
      }
    })
  }, [])

  const enablePush = useCallback(async () => {
    const sub = await subscribePush(storage.vapidPublicKey)
    await storage.saveAdminPush(sub)
    await storage.testAdminPush(sub.endpoint).catch(() => {})
    setPushOn(true)
  }, [])

  const clearIncoming = useCallback(() => setIncoming(null), [])

  const value = useMemo(
    () => ({
      orders,
      unreadIds,
      markSeen,
      incoming,
      clearIncoming,
      pushOn,
      pushSupported: Boolean(storage.saveAdminPush) && pushSupport() !== 'unsupported',
      enablePush,
    }),
    [orders, unreadIds, markSeen, incoming, clearIncoming, pushOn, enablePush],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAdminOrders = () => useContext(Ctx)

/** מסמן הזמנה כנקראה אחרי שהכרטיס שלה היה על המסך שנייה */
export function useSeenOnView(id) {
  const ctx = useAdminOrders()
  const ref = useRef(null)
  const unread = ctx?.unreadIds.has(id)
  const markSeen = ctx?.markSeen
  useEffect(() => {
    const el = ref.current
    if (!unread || !el || !markSeen || typeof IntersectionObserver === 'undefined') return undefined
    let t = 0
    const io = new IntersectionObserver(
      ([e]) => {
        clearTimeout(t)
        if (e.isIntersecting && !document.hidden) t = setTimeout(() => markSeen(id), 1200)
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => {
      clearTimeout(t)
      io.disconnect()
    }
  }, [id, unread, markSeen])
  return { ref, unread: Boolean(unread) }
}
