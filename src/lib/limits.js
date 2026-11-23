// גבולות להזמנה אחת. משותף לאפליקציה ולשרת, כדי ששניהם יגידו אותו דבר.
export const MAX_PER_ITEM = 10
export const MAX_ITEMS = 40

// שם שנראה כמו שם: לפחות 2 אותיות, בלי קישורים, בלי "אאאאא"
export function nameProblem(raw) {
  const n = String(raw || '').trim()
  if (n.length < 2 || n.length > 40) return 'צריך שם מלא'
  if ((n.match(/\p{L}/gu) || []).length < 2) return 'צריך שם אמיתי'
  if (LINKISH.test(n) || /(.)\1{3,}/u.test(n)) return 'צריך שם אמיתי'
  return null
}
export const LINKISH = /https?:|www\.|\.(com|co|il|net|org|io|me|ly)\b|@|t\.me/i
