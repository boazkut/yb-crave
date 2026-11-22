import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readLS, writeLS, uid } from '../lib/utils.js'

const CartCtx = createContext(null)
const KEY = 'ybc:cart'

/**
 * שורת עגלה:
 * { key, kind: 'product'|'bag'|'combo'|'reward', productId?, name, unitPrice, qty, owner, details: [], deposit, art, category }
 */
export function CartProvider({ children }) {
  const saved = readLS(KEY, null)
  const [lines, setLines] = useState(saved?.lines || [])
  const [groupMode, setGroupMode] = useState(Boolean(saved?.groupMode))
  const [couponCode, setCouponCode] = useState(saved?.couponCode || '')

  useEffect(() => {
    writeLS(KEY, { lines, groupMode, couponCode })
  }, [lines, groupMode, couponCode])

  const addProduct = useCallback((p, qty = 1) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.kind === 'product' && l.productId === p.id && !l.owner)
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: l.qty + qty } : l))
      return [
        ...ls,
        {
          key: uid('l_'),
          kind: 'product',
          productId: p.id,
          name: p.name,
          unitPrice: Number(p.price),
          qty,
          owner: '',
          details: [],
          deposit: Number(p.deposit) || 0,
          art: p.art,
          imageUrl: p.imageUrl || '',
          category: p.category,
        },
      ]
    })
  }, [])

  const addCustom = useCallback((line) => {
    setLines((ls) => [...ls, { key: uid('l_'), qty: 1, owner: '', details: [], deposit: 0, ...line }])
  }, [])

  const setQty = useCallback((key, qty) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.key !== key) : ls.map((l) => (l.key === key ? { ...l, qty } : l))))
  }, [])

  const remove = useCallback((key) => setLines((ls) => ls.filter((l) => l.key !== key)), [])

  const setOwner = useCallback((key, owner) => {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, owner } : l)))
  }, [])

  // מפצל יחידה אחת מהשורה לשורה חדשה — כדי לרשום עליה שם של חבר אחר
  const splitOne = useCallback((key) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.key === key)
      if (i < 0 || ls[i].qty < 2) return ls
      const copy = { ...ls[i], key: uid('l_'), qty: 1, owner: '' }
      const next = ls.map((l, j) => (j === i ? { ...l, qty: l.qty - 1 } : l))
      next.splice(i + 1, 0, copy)
      return next
    })
  }, [])

  const replaceAll = useCallback((newLines) => setLines(newLines.map((l) => ({ ...l, key: uid('l_') }))), [])
  const clear = useCallback(() => {
    setLines([])
    setCouponCode('')
  }, [])

  const value = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0)
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
    const deposit = lines.reduce((s, l) => s + (l.deposit || 0) * l.qty, 0)
    const qtyOf = (productId) => lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.qty, 0)
    const hasReward = lines.some((l) => l.kind === 'reward')
    return {
      lines,
      count,
      subtotal,
      deposit,
      qtyOf,
      hasReward,
      groupMode,
      setGroupMode,
      couponCode,
      setCouponCode,
      addProduct,
      addCustom,
      setQty,
      remove,
      setOwner,
      splitOne,
      replaceAll,
      clear,
    }
  }, [lines, groupMode, couponCode, addProduct, addCustom, setQty, remove, setOwner, splitOne, replaceAll, clear])

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export const useCart = () => useContext(CartCtx)
