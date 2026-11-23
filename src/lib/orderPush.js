import { storage } from '../services/storageService.js'
import { readLS, writeLS } from './utils.js'
import { silentSubscription, subscribePush } from './push.js'

/** ההזמנות בטלפון הזה שכבר מחוברות להתראות */
export const PUSH_ORDERS = 'ybc2:pushOrders'

function mark(orderId) {
  const list = readLS(PUSH_ORDERS, [])
  if (!list.includes(orderId)) writeLS(PUSH_ORDERS, [orderId, ...list].slice(0, 20))
  window.dispatchEvent(new CustomEvent('ybc:local', { detail: PUSH_ORDERS }))
}

/**
 * אחרי הזמנה: אם הלקוח אישר התראות (השאלה קפצה בלחיצה על "שליחת ההזמנה"),
 * מחברים את ההזמנה להתראות בשקט. השרת שולח מיד "תודה שקנית".
 */
export async function connectOrderPush(orderId, permissionPromise) {
  try {
    if (!storage.saveOrderPush) return false
    const p = await permissionPromise
    if (p !== 'granted') return false
    const sub = await silentSubscription(storage.vapidPublicKey)
    if (!sub) return false
    await storage.saveOrderPush(orderId, sub)
    mark(orderId)
    return true
  } catch {
    return false
  }
}

/** הפעלה ידנית מכפתור (מבקש הרשאה אם צריך) */
export async function enableOrderPushManually(orderId) {
  const sub = await subscribePush(storage.vapidPublicKey)
  await storage.saveOrderPush(orderId, sub)
  mark(orderId)
}
