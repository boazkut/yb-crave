import { lazy, Suspense, useEffect, useRef } from 'react'
import { MotionConfig } from 'framer-motion'
import { DataProvider, useData } from './state/DataContext.jsx'
import { CartProvider } from './state/CartContext.jsx'
import { UIProvider, useUI } from './state/UIContext.jsx'
import { navigate, usePath } from './lib/router.js'
import { flashSplash, hideBootSplash } from './lib/splash.js'
import { Storefront } from './Storefront.jsx'

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

// בזמן טעינה מסך הפתיחה (מ-index.html) כבר מכסה הכל
function Splash() {
  return <div className="min-h-dvh" />
}

const AWAY_MS = 3000

/**
 * מי שיוצא מהאפליקציה וחוזר: רואה את הסמל לשנייה ומתחיל מחדש מדף הבית.
 * לא בזמן תשלום (חוזרים מ-PayBox/Bit כדי לצרף צילום) ולא באזור המנהלים.
 */
function useFreshStartOnReturn() {
  const ui = useUI()
  const sheet = useRef(ui.sheet)
  sheet.current = ui.sheet
  const close = ui.closeSheet
  useEffect(() => {
    let hiddenAt = 0
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
        return
      }
      const away = hiddenAt ? Date.now() - hiddenAt : 0
      hiddenAt = 0
      if (away < AWAY_MS) return
      if (window.location.pathname.startsWith('/admin')) return
      if (sheet.current?.name === 'checkout') return
      flashSplash()
      close()
      navigate('/', { replace: true })
      window.scrollTo(0, 0)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [close])
}

function Routes() {
  const path = usePath()
  const { ready } = useData()
  useFreshStartOnReturn()
  useEffect(() => {
    if (ready) hideBootSplash()
  }, [ready])
  if (!ready) return <Splash />
  if (path.startsWith('/admin')) {
    return (
      <Suspense fallback={<Splash />}>
        <AdminApp />
      </Suspense>
    )
  }
  return <Storefront path={path} />
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <DataProvider>
        <UIProvider>
          <CartProvider>
            <Routes />
          </CartProvider>
        </UIProvider>
      </DataProvider>
    </MotionConfig>
  )
}
