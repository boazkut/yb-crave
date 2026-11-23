/**
 * מבצעים ותמחור — אותו קוד רץ בעגלה של הלקוח ובשרת (שם הוא הקובע).
 *
 * סוגי מבצע:
 *   price  — מחיר מבצע: כל מוצר ברשימה נמכר ב-price ליחידה (רק אם זה זול מהמחיר הרגיל)
 *   bundle — כמות במחיר: כל qty יחידות מהרשימה (אפשר לערבב) ב-price ביחד. למשל 3 ב-10 ₪, או 1+1
 *
 * מבנה: { id, title, type, productIds: [], price, qty, active, endsAt }
 */

const round = (n) => Math.round(n * 100) / 100

export function isDealActive(d, now = Date.now()) {
  return Boolean(d && d.active !== false && (!d.endsAt || d.endsAt > now) && Array.isArray(d.productIds) && d.productIds.length && Number(d.price) > 0)
}

export const activeDeals = (deals, now = Date.now()) => (Array.isArray(deals) ? deals.filter((d) => isDealActive(d, now)) : [])

/** מחיר מבצע למוצר (הזול מבין המבצעים הפעילים), או null */
export function saleFor(product, deals, now = Date.now()) {
  if (!product) return null
  let best = null
  for (const d of activeDeals(deals, now)) {
    if (d.type !== 'price' || !d.productIds.includes(product.id)) continue
    const price = Number(d.price)
    if (price < Number(product.price) && (!best || price < best.price)) best = { price, deal: d }
  }
  return best
}

/** מבצע כמות שהמוצר משתתף בו (הראשון), או null */
export function bundleFor(product, deals, now = Date.now()) {
  if (!product) return null
  return activeDeals(deals, now).find((d) => d.type === 'bundle' && d.productIds.includes(product.id)) || null
}

/** טקסט קצר למבצע כמות: "3 ב-10 ₪" או "1+1" */
export function bundleLabel(d, unitPrice) {
  if (d.qty === 2 && unitPrice && Math.abs(Number(d.price) - unitPrice) < 0.01) return '1+1'
  return `${d.qty} ב-${Number(d.price)} ₪`
}

/**
 * מחשב עגלה: מחיר לכל שורה (כולל מחיר מבצע), הנחות של מבצעי כמות, וסה"כ.
 * lines: [{ productId, qty, ... }], byId: { [id]: product }
 */
export function priceCart(lines, byId, deals, now = Date.now()) {
  const act = activeDeals(deals, now)
  const priced = (lines || []).map((l) => {
    const p = byId[l.productId]
    const base = p ? Number(p.price) : Number(l.unitPrice) || 0
    const sale = p ? saleFor(p, act, now) : null
    return { ...l, basePrice: base, unitPrice: sale ? sale.price : base, saleDealId: sale ? sale.deal.id : null }
  })
  const subtotal = round(priced.reduce((s, l) => s + l.unitPrice * l.qty, 0))

  // מבצעי כמות: יחידה משתתפת רק במבצע אחד, ולא אם כבר יש לה מחיר מבצע
  const left = priced.map((l) => (l.saleDealId ? 0 : l.qty))
  const discounts = []
  const hints = []
  for (const d of act.filter((x) => x.type === 'bundle' && Number(x.qty) >= 2)) {
    const set = new Set(d.productIds)
    const units = []
    priced.forEach((l, i) => {
      if (set.has(l.productId)) for (let k = 0; k < left[i]; k += 1) units.push({ i, price: l.unitPrice })
    })
    units.sort((a, b) => b.price - a.price)
    const qty = Number(d.qty)
    const groups = Math.floor(units.length / qty)
    let amount = 0
    let used = 0
    for (let g = 0; g < groups; g += 1) {
      const chunk = units.slice(g * qty, (g + 1) * qty)
      const sum = chunk.reduce((s, u) => s + u.price, 0)
      if (sum > Number(d.price)) {
        amount += sum - Number(d.price)
        chunk.forEach((u) => (left[u.i] -= 1))
        used += 1
      }
    }
    if (amount > 0) discounts.push({ dealId: d.id, title: d.title, amount: round(amount), times: used })
    const rest = units.length - used * qty
    if (rest > 0 && rest < qty) hints.push({ dealId: d.id, title: d.title, need: qty - rest })
  }
  const discount = round(discounts.reduce((s, x) => s + x.amount, 0))
  return { lines: priced, subtotal, discounts, discount, total: round(Math.max(0, subtotal - discount)), hints }
}
