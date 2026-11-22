export const ils = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100
  return `${Number.isInteger(v) ? v : v.toFixed(2)} ₪`
}

export const uid = (prefix = '') =>
  prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

export const pad2 = (n) => String(n).padStart(2, '0')

export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

export async function sha256(text) {
  const data = new TextEncoder().encode(String(text))
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  // גיבוי לסביבה לא מאובטחת (http) — hash פשוט
  let h = 0
  for (const b of data) h = (Math.imul(31, h) + b) | 0
  return 'weak' + (h >>> 0).toString(16)
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    document.body.removeChild(ta)
    return ok
  }
}

export const readLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export const writeLS = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* אחסון מלא או חסום — ממשיכים בלי לשמור */
  }
}

export const vibrate = (ms = 12) => {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* לא נתמך */
  }
}

export const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
