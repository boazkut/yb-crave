// מזהה אקראי של המכשיר (לא מזהה אישי). השרת משתמש בו כדי להגביל מכשיר שמציף בהזמנות,
// וכדי שחסימה של מנהל תתפוס גם אם מחליפים מספר טלפון.
const KEY = 'ybc:dev'
const OK = /^[A-Za-z0-9_-]{16,64}$/

export function deviceId() {
  try {
    let v = localStorage.getItem(KEY)
    if (!v || !OK.test(v)) {
      const bytes = crypto.getRandomValues(new Uint8Array(18))
      v = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      localStorage.setItem(KEY, v)
    }
    return v
  } catch {
    return ''
  }
}
