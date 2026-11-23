/* Service Worker של Y&B CRAVE — רק בשביל התראות Push (בלי שמירת קבצים במטמון) */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// מונה ההזמנות שלא נקראו (העיגול על האייקון של האפליקציה, איפה שנתמך)
const META = 'ybc-meta'
async function readBadge() {
  try {
    const res = await (await caches.open(META)).match('/__badge')
    return res ? Number(await res.text()) || 0 : 0
  } catch {
    return 0
  }
}
async function writeBadge(n) {
  try {
    await (await caches.open(META)).put('/__badge', new Response(String(n)))
    if (n > 0) await self.navigator.setAppBadge?.(n)
    else await self.navigator.clearAppBadge?.()
  } catch {
    /* לא נתמך */
  }
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Y&B CRAVE', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Y&B CRAVE'
  const badge = data.kind === 'admin-order' ? readBadge().then((n) => writeBadge(n + 1)) : Promise.resolve()
  event.waitUntil(
    badge.then(() => self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/brand/icon-192.png',
      badge: '/brand/badge-96.png',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      dir: 'rtl',
      lang: 'he',
      vibrate: [120, 60, 120],
      data: { url: data.url || '/' },
    })),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate?.(url)
          return c.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
