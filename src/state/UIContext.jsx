import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { uid } from '../lib/utils.js'

const UICtx = createContext(null)

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [sheet, setSheet] = useState(null)

  const toast = useCallback((text) => {
    const id = uid('t_')
    // אותה הודעה פעמיים ברצף לא נערמת: מחליפים את הישנה
    setToasts((t) => [...t.filter((x) => x.text !== text).slice(-1), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])
  const openSheet = useCallback((name, payload = null) => setSheet({ name, payload }), [])
  const closeSheet = useCallback(() => setSheet(null), [])

  const value = useMemo(() => ({ toasts, toast, sheet, openSheet, closeSheet }), [toasts, toast, sheet, openSheet, closeSheet])
  return <UICtx.Provider value={value}>{children}</UICtx.Provider>
}

export const useUI = () => useContext(UICtx)
