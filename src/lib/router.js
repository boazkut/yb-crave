import { useEffect, useState } from 'react'

const EVT = 'ybc:navigate'

export function navigate(path, { replace = false } = {}) {
  if (window.location.pathname === path) return
  if (replace) window.history.replaceState({}, '', path)
  else window.history.pushState({}, '', path)
  window.dispatchEvent(new Event(EVT))
  window.scrollTo(0, 0)
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener('popstate', sync)
    window.addEventListener(EVT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(EVT, sync)
    }
  }, [])
  return path
}
