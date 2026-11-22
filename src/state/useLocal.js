import { useCallback, useEffect, useState } from 'react'
import { readLS, writeLS } from '../lib/utils.js'

/**
 * state ששמור בטלפון של הלקוח ומסונכרן בין כל הקומפוננטות שמשתמשות באותו מפתח.
 * משמש לרשימת ההזמנות של הטלפון הזה ולפרטי הלקוח השמורים.
 */
const EVT = 'ybc:local'

export function useLocal(key, initial) {
  const [value, setValue] = useState(() => readLS(key, initial))

  useEffect(() => {
    const sync = (e) => {
      if (!e.detail || e.detail === key) setValue(readLS(key, initial))
    }
    const syncStorage = (e) => {
      if (e.key === key) setValue(readLS(key, initial))
    }
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', syncStorage)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', syncStorage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const update = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(readLS(key, initial)) : next
      writeLS(key, resolved)
      setValue(resolved)
      window.dispatchEvent(new CustomEvent(EVT, { detail: key }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  return [value, update]
}

export const LS_KEYS = {
  myOrders: 'ybc2:myOrders',
  profile: 'ybc2:profile',
}
