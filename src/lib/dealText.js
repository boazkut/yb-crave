/** טקסטים למבצעים (רק בצד הלקוח) */
export function dealText(d) {
  if (d.type === 'price') return `מחיר מבצע: ${Number(d.price)} ₪ ליחידה`
  return `כל ${d.qty} מוצרים מהמבצע ב-${Number(d.price)} ₪ ביחד (אפשר לערבב)`
}

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const hm = (d) => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' })
const dayKey = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })

export function endsText(endsAt, now = Date.now()) {
  if (!endsAt) return ''
  const end = new Date(endsAt)
  const today = new Date(now)
  const tomorrow = new Date(now + 86_400_000)
  if (dayKey(end) === dayKey(today)) return `עד היום ב-${hm(end)}`
  if (dayKey(end) === dayKey(tomorrow)) return `עד מחר ב-${hm(end)}`
  if (endsAt - now < 6 * 86_400_000) return `עד יום ${DAYS[new Date(end.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })).getDay()]} ב-${hm(end)}`
  return `עד ${end.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' })}`
}
