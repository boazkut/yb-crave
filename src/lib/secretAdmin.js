import { useRef } from 'react'
import { navigate } from './router.js'
import { vibrate } from './utils.js'

/**
 * כניסה נסתרת לאזור המנהלים:
 * לוחצים פעם אחת על הלוגו Y&B, ותוך 4 שניות לוחצים פעמיים מהר על "פתוח עכשיו" / "סגור".
 * אין שום רמז ויזואלי באתר. (הכתובת /admin עדיין עובדת, ומוגנת בסיסמה.)
 */
export function useSecretAdmin() {
  const armedAt = useRef(0)
  const lastTap = useRef(0)

  const onLogo = () => {
    armedAt.current = Date.now()
    lastTap.current = 0
  }

  const onStatus = () => {
    const now = Date.now()
    if (now - armedAt.current > 4000) {
      lastTap.current = 0
      return
    }
    if (lastTap.current && now - lastTap.current < 600) {
      armedAt.current = 0
      lastTap.current = 0
      vibrate(25)
      navigate('/admin')
      return
    }
    lastTap.current = now
  }

  return { onLogo, onStatus }
}
