import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readLS, writeLS, uid } from '../lib/utils.js'
import { priceCart } from '../lib/pricing.js'
import { useData } from './DataContext.jsx'

const CartCtx = createContext(null)
const KEY = 'ybc2:cart'

/** שורת עגלה: { key, kind: 'product', productId, name, unitPrice, qty, details: [], art, imageUrl } */
export function CartProvider({ children }) {
  // שקית בהרכבה הוסרה — שורות ישנות כאלה יורדות מהעגלה
  const [lines, setLines] = useState(() => (readLS(KEY, []) || []).filter((l) => l.kind !== 'bag'))
  const { byId, settings } = useData()

  useEffect(() => writeLS(KEY, lines), [lines])

  const addProduct = useCallback((p) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.kind === 'product' && l.productId === p.id)
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l))
      return [
        ...ls,
        { key: uid('l_'), kind: 'product', productId: p.id, name: p.name, unitPrice: Number(p.price), qty: 1, details: [], art: p.art, imageUrl: p.imageUrl || '' },
      ]
    })
  }, [])

  const addCustom = useCallback((line) => setLines((ls) => [...ls, { key: uid('l_'), qty: 1, details: [], ...line }]), [])

  const setQty = useCallback((key, qty) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.key !== key) : ls.map((l) => (l.key === key ? { ...l, qty } : l))))
  }, [])

  const decProduct = useCallback((productId) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.kind === 'product' && l.productId === productId)
      if (i < 0) return ls
      return ls[i].qty <= 1 ? ls.filter((_, j) => j !== i) : ls.map((l, j) => (j === i ? { ...l, qty: l.qty - 1 } : l))
    })
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0)
    // מחירים עדכניים מהקטלוג + מבצעים (השרת מחשב בדיוק אותו דבר)
    const priced = priceCart(lines, byId, settings.deals)
    const qtyOf = (productId) => lines.filter((l) => l.kind === 'product' && l.productId === productId).reduce((s, l) => s + l.qty, 0)
    return {
      lines: priced.lines,
      count,
      subtotal: priced.subtotal,
      discounts: priced.discounts,
      discount: priced.discount,
      hints: priced.hints,
      total: priced.total,
      qtyOf,
      addProduct,
      addCustom,
      setQty,
      decProduct,
      clear,
    }
  }, [lines, byId, settings.deals, addProduct, addCustom, setQty, decProduct, clear])

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export const useCart = () => useContext(CartCtx)
