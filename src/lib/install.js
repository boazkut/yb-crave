import { useEffect, useState } from 'react'
import { isIOS, isStandalone } from './push.js'

/**
 * התקנת האתר כאפליקציה.
 * באנדרואיד Chrome הופך את האתר לאפליקציה מותקנת (עם אייקון, התראות ועדכונים אוטומטיים) בלחיצה אחת.
 * באייפון מתקינים דרך "שיתוף" ← "הוספה למסך הבית".
 */
let deferred = null
let installed = false
const subs = new Set()
const notify = () => subs.forEach((f) => f())

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    notify()
  })
}

export async function promptInstall() {
  if (!deferred) return 'unavailable'
  const e = deferred
  deferred = null
  e.prompt()
  const { outcome } = await e.userChoice.catch(() => ({ outcome: 'dismissed' }))
  if (outcome === 'accepted') installed = true
  notify()
  return outcome
}

const isAndroid = () => /android/i.test(navigator.userAgent)

export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    subs.add(f)
    return () => subs.delete(f)
  }, [])
  return {
    standalone: isStandalone(),
    installed,
    canPrompt: Boolean(deferred),
    ios: isIOS(),
    android: isAndroid(),
  }
}
