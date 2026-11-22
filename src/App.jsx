import { lazy, Suspense } from 'react'
import { MotionConfig } from 'framer-motion'
import { DataProvider, useData } from './state/DataContext.jsx'
import { CartProvider } from './state/CartContext.jsx'
import { UIProvider } from './state/UIContext.jsx'
import { usePath } from './lib/router.js'
import { Storefront } from './Storefront.jsx'

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <p className="display animate-pulse text-3xl text-paper/60">Y&amp;B CRAVE</p>
    </div>
  )
}

function Routes() {
  const path = usePath()
  const { ready } = useData()
  if (!ready) return <Splash />
  if (path.startsWith('/admin')) {
    return (
      <Suspense fallback={<Splash />}>
        <AdminApp />
      </Suspense>
    )
  }
  return <Storefront />
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
