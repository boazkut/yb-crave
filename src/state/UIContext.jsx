import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { uid } from '../lib/utils.js'

const UICtx = createContext(null)

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [flights, setFlights] = useState([])
  const [bump, setBump] = useState(0)
  const [sheet, setSheet] = useState(null) // { name, payload }
  const cartTargetRef = useRef(null)

  const toast = useCallback((text, tone = 'default') => {
    const id = uid('t_')
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
  }, [])

  const fly = useCallback((fromEl, color = '#B5F23A') => {
    const target = cartTargetRef.current
    if (!fromEl || !target) {
      setBump((b) => b + 1)
      return
    }
    const a = fromEl.getBoundingClientRect()
    const b = target.getBoundingClientRect()
    setFlights((f) => [
      ...f,
      {
        id: uid('f_'),
        color,
        from: { x: a.left + a.width / 2, y: a.top + a.height / 2 },
        to: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
      },
    ])
  }, [])

  const landFlight = useCallback((id) => {
    setFlights((f) => f.filter((x) => x.id !== id))
    setBump((b) => b + 1)
  }, [])

  const openSheet = useCallback((name, payload = null) => setSheet({ name, payload }), [])
  const closeSheet = useCallback(() => setSheet(null), [])

  const value = useMemo(
    () => ({ toasts, toast, flights, fly, landFlight, bump, cartTargetRef, sheet, openSheet, closeSheet }),
    [toasts, toast, flights, fly, landFlight, bump, sheet, openSheet, closeSheet],
  )
  return <UICtx.Provider value={value}>{children}</UICtx.Provider>
}

export const useUI = () => useContext(UICtx)
