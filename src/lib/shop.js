export const STOCK = {
  in: { label: 'במלאי' },
  low: { label: 'נשארו אחרונים' },
  out: { label: 'אזל' },
}

export const isAvailable = (p) => Boolean(p) && p.stock !== 'out'

/**
 * מחזור החיים של הזמנה:
 * awaiting_payment → preparing → ready → on_the_way → delivered
 * או rejected (תשלום נדחה, עם סיבה) / cancelled (בוטלה ע"י מנהל)
 */
export const ORDER_STATUS = {
  awaiting_payment: { label: 'ממתין לאישור תשלום', admin: 'ממתין לאישור', step: 0 },
  preparing: { label: 'תשלום אושר, מכינים לך', cashLabel: 'ההזמנה התקבלה, מכינים לך', admin: 'בהכנה', step: 1 },
  ready: { label: 'ההזמנה מוכנה', admin: 'מוכן', step: 2 },
  on_the_way: { label: 'בדרך לחדר שלך', admin: 'בדרך לחדר', step: 3 },
  delivered: { label: 'נמסר. בתיאבון', admin: 'נמסר', step: 4 },
  rejected: { label: 'התשלום נדחה', admin: 'נדחה', step: -1 },
  cancelled: { label: 'ההזמנה בוטלה', admin: 'בוטל', step: -1 },
}

export const statusLabel = (order) => {
  const s = ORDER_STATUS[order?.status] || ORDER_STATUS.awaiting_payment
  if (order?.status === 'preparing' && order?.payment?.method === 'cash') return s.cashLabel
  return s.label
}

export const PAYMENT = {
  paybox: { label: 'PayBox' },
  bit: { label: 'Bit' },
  cash: { label: 'מזומן' },
}

export const ACTIVE_STATUSES = ['awaiting_payment', 'preparing', 'ready', 'on_the_way']

/** מספר טלפון ישראלי: נייד 05X / 07X (10 ספרות) או קווי 02/03/04/08/09 (9 ספרות), כולל +972 */
export function normalizeIsraeliPhone(input) {
  let d = String(input || '').replace(/[^\d+]/g, '')
  if (d.startsWith('+972')) d = '0' + d.slice(4)
  else if (d.startsWith('972')) d = '0' + d.slice(3)
  d = d.replace(/\D/g, '')
  if (/^0(5\d|7\d)\d{7}$/.test(d)) return d
  if (/^0[23489]\d{7}$/.test(d)) return d
  return null
}

export const formatPhone = (p) => {
  const d = String(p || '')
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
  return d
}

export const toWhatsApp = (phone) => {
  const d = normalizeIsraeliPhone(phone)
  return d ? `972${d.slice(1)}` : ''
}

export const waLink = (number, text = '') =>
  `https://wa.me/${String(number || '').replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export const orderTotal = (lines) => lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)

// מה שהקונה רואה כשמנסה להוסיף מעבר למלאי (בלי לגלות כמה נשאר)
export const LIMITED = 'המלאי מוגבל, אי אפשר להוסיף עוד מזה'
