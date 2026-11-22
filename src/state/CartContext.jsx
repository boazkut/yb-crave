import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readLS, writeLS, uid } from '../lib/utils.js'

const CartCtx = createContext(null)
const KEY = 'ybc2:cart'

/** שורת עגלה: { key, kind: 'product'|'bag'|'combo', productId, name, unitPrice, qty, details: [], art, imageUrl } */
export function CartProvider({ children }) {
  const [lines, setLines] = useState(() => readLS(KEY, []))

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
    const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
    const qtyOf = (productId) => lines.filter((l) => l.kind === 'product' && l.productId === productId).reduce((s, l) => s + l.qty, 0)
    return { lines, count, total, qtyOf, addProduct, addCustom, setQty, decProduct, clear }
  }, [lines, addProduct, addCustom, setQty, decProduct, clear])

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export const useCart = () => useContext(CartCtx)
