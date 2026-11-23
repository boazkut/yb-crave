/**
 * התראות Push בדפדפן.
 * אנדרואיד: עובד ישר מהדפדפן.
 * אייפון: עובד רק אחרי "הוספה למסך הבית" (iOS 16.4 ומעלה), ופותחים את האתר מהאייקון.
 */
const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true

export function pushSupport() {
  if (!('serviceWorker' in navigator)) return 'unsupported'
  if (!('PushManager' in window) || !('Notification' in window)) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return 'ok'
}

let regPromise = null
export function registerSW() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null)
  regPromise ||= navigator.serviceWorker.register('/sw.js').catch(() => null)
  return regPromise
}

/** מבקש הרשאה ומחזיר מנוי Push (JSON) או זורק שגיאה בעברית */
export async function subscribePush(vapidPublicKey) {
  const s = pushSupport()
  if (s === 'ios-install') throw new Error('באייפון: לוחצים "שיתוף" ← "הוספה למסך הבית", פותחים את האתר מהאייקון, ואז מפעילים התראות.')
  if (s === 'denied') throw new Error('ההתראות חסומות בדפדפן. אפשר לאפשר אותן בהגדרות האתר.')
  if (s !== 'ok' || !vapidPublicKey) throw new Error('הדפדפן הזה לא תומך בהתראות.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('לא אישרתם התראות.')
  const reg = (await registerSW()) || (await navigator.serviceWorker.ready)
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapidPublicKey) })
  return sub.toJSON()
}

/** התראה מקומית כשהאתר פתוח (למשל כשסטטוס ההזמנה משתנה) */
export async function localNotify(title, body) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const reg = await registerSW()
    if (reg?.showNotification) reg.showNotification(title, { body, icon: '/brand/icon-192.png', badge: '/brand/badge-96.png', dir: 'rtl', lang: 'he' })
  } catch {
    /* לא קריטי */
  }
}
