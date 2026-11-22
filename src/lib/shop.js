import { pad2, dateKey } from './utils.js'

export const STOCK = {
  in: { label: 'במלאי', color: '#B5F23A' },
  low: { label: 'נשארו אחרונים', color: '#FFB000' },
  out: { label: 'אזל', color: '#E5212B' },
}

export const effectiveStock = (p) => {
  if (!p) return 'out'
  if (p.stock === 'out' || (typeof p.qty === 'number' && p.qty <= 0)) return 'out'
  if (p.stock === 'low' || (typeof p.qty === 'number' && p.qty <= 3)) return 'low'
  return 'in'
}

export const isAvailable = (p) => effectiveStock(p) !== 'out'

export const ORDER_STATUS = {
  new: { label: 'חדש', track: 'התקבלה', step: 0, color: '#5B7CFF' },
  packing: { label: 'באריזה', track: 'אורזים לך', step: 1, color: '#FFB000' },
  ready: { label: 'מוכן', track: 'בדרך להפסקה!', step: 2, color: '#B5F23A' },
  delivered: { label: 'נמסר', track: 'נמסר. בתיאבון!', step: 3, color: '#B5F23A' },
  cancelled: { label: 'בוטל', track: 'ההזמנה בוטלה', step: -1, color: '#E5212B' },
}

export const PAYMENT = {
  bit: { label: 'Bit', color: '#3EC6E0' },
  paybox: { label: 'PayBox', color: '#5B7CFF' },
  cash: { label: 'מזומן', color: '#B5F23A' },
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const atTime = (base, hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number)
  const d = new Date(base)
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

/**
 * מחשב מה מצב החנות עכשיו ולאילו הפסקות אפשר להזמין.
 * מחזיר את ההפסקות הפתוחות של היום, ואם כולן עברו — של יום הלימודים הבא.
 */
export function getSchedule(settings, now = new Date()) {
  const breaks = [...(settings.breaks || [])].filter(Boolean).sort()
  const cutoff = Number(settings.cutoffMinutes) || 0
  const days = settings.schoolDays?.length ? settings.schoolDays : [0, 1, 2, 3, 4]

  if (!settings.storeOpen) return { open: false, reason: 'closed', slots: [], next: null }
  if (!breaks.length) return { open: false, reason: 'nobreaks', slots: [], next: null }

  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(now)
    day.setDate(now.getDate() + offset)
    if (!days.includes(day.getDay())) continue
    const slots = breaks
      .map((t) => {
        const breakAt = atTime(day, t)
        const closesAt = new Date(breakAt.getTime() - cutoff * 60000)
        return { time: t, breakAt, closesAt }
      })
      .filter((s) => s.closesAt > now)
      .map((s) => {
        const dayLabel = offset === 0 ? '' : offset === 1 ? 'מחר' : `ביום ${DAY_NAMES[s.breakAt.getDay()]}`
        return {
          ...s,
          id: `${dateKey(s.breakAt)}_${s.time}`,
          dateKey: dateKey(s.breakAt),
          dayLabel,
          label: dayLabel ? `${dayLabel} ${s.time}` : `הפסקת ${s.time}`,
          today: offset === 0,
        }
      })
    if (slots.length) return { open: true, reason: offset === 0 ? 'today' : 'later', slots, next: slots[0] }
  }
  return { open: false, reason: 'nobreaks', slots: [], next: null }
}

export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`
}

export function couponDiscount(coupons, code, subtotal) {
  if (!code) return { valid: false, amount: 0 }
  const c = (coupons || []).find((x) => x.active && x.code.trim().toUpperCase() === code.trim().toUpperCase())
  if (!c) return { valid: false, amount: 0, error: 'הקוד הזה לא קיים או שפג תוקפו' }
  if (c.minTotal && subtotal < c.minTotal) return { valid: false, amount: 0, error: `הקוד עובד מעל ${c.minTotal} ₪` }
  const amount = c.kind === 'percent' ? Math.round(subtotal * (Number(c.value) / 100) * 10) / 10 : Number(c.value)
  return { valid: true, amount: Math.min(subtotal, amount), coupon: c }
}

export function buildWhatsAppText(order) {
  const lines = []
  lines.push(`🍬 הזמנה חדשה ב-Y&B CRAVE  #${order.number}`)
  lines.push('')
  lines.push(`👤 ${order.customer.name} | כיתה ${order.customer.classroom}`)
  lines.push(`⏰ ${order.customer.slotLabel}`)
  lines.push(`📍 ${order.customer.meetPoint}`)
  lines.push('')
  const groups = {}
  for (const l of order.lines) {
    const key = order.groupMode ? l.owner || 'בלי שם' : '_'
    ;(groups[key] ||= []).push(l)
  }
  for (const [owner, ls] of Object.entries(groups)) {
    if (owner !== '_') lines.push(`— ${owner}:`)
    for (const l of ls) {
      lines.push(`• ${l.qty}× ${l.name} — ${l.unitPrice * l.qty} ₪`)
      if (l.details?.length) lines.push(`   (${l.details.join(', ')})`)
    }
  }
  lines.push('')
  if (order.discount) lines.push(`קופון ${order.couponCode}: -${order.discount} ₪`)
  if (order.deposit) lines.push(`פיקדון (חוזר): ${order.deposit} ₪`)
  lines.push(`💰 סה"כ לתשלום: ${order.total} ₪`)
  const pm = PAYMENT[order.payment.method]?.label || order.payment.method
  if (order.payment.method === 'cash') {
    lines.push(`💵 מזומן בעת המסירה${order.payment.changeFor ? ` | עודף מ-${order.payment.changeFor}` : ''}`)
  } else {
    lines.push(`📲 שולם ב-${pm}${order.payment.note ? ` | אסמכתא: ${order.payment.note}` : ''}`)
  }
  if (order.note) lines.push(`📝 ${order.note}`)
  return lines.join('\n')
}

export const waLink = (number, text) =>
  `https://wa.me/${String(number || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
