import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useData } from './state/DataContext.jsx'
import { useUI } from './state/UIContext.jsx'
import { Logo, StoreStatus } from './components/TopBar.jsx'
import { BackgroundVideo } from './components/BackgroundVideo.jsx'
import { BagBuilderCard, CategoryCard, CategoryHeader, ClosedNotice, ProductGrid, lookOf } from './components/Catalog.jsx'
import { Toasts } from './components/Overlays.jsx'
import { InstallCard } from './components/InstallCard.jsx'
import { CheckoutSheet } from './features/Checkout.jsx'
import { BagBuilder, ComboBuilder } from './features/Builders.jsx'
import { CartBar, OrderStatus, SupportPhones } from './features/OrderStatus.jsx'
import { navigate } from './lib/router.js'
import { useSecretAdmin } from './lib/secretAdmin.js'

// מוצר שאזל נשאר באותו מקום — רק מסומן
const sortProducts = (list) => [...list].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))

/** רקע כהה לדף ולסרגל הסטטוס בזמן שהחנות פתוחה על המסך */
function useStorefrontChrome() {
  useEffect(() => {
    const html = document.documentElement
    html.classList.add('storefront')
    const meta = document.querySelector('meta[name="theme-color"]')
    const prev = meta?.getAttribute('content')
    meta?.setAttribute('content', '#161616')
    return () => {
      html.classList.remove('storefront')
      if (meta && prev) meta.setAttribute('content', prev)
    }
  }, [])
}

function Home({ byCategory }) {
  const { categories, products, settings } = useData()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const secret = useSecretAdmin()
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  const q = query.trim()
  const results = useMemo(() => (q ? sortProducts(products.filter((p) => p.name.includes(q))) : []), [products, q])

  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-4">
        <div className="flex select-none items-center gap-3 [-webkit-touch-callout:none]">
          <span onClick={secret.onLogo}>
            <Logo light />
          </span>
          <span onClick={secret.onStatus}>
            <StoreStatus pill />
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (searchOpen) setQuery('')
            setSearchOpen(!searchOpen)
          }}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink"
          aria-label={searchOpen ? 'סגירת חיפוש' : 'חיפוש'}
          aria-expanded={searchOpen}
        >
          {searchOpen ? <X size={18} /> : <Search size={18} />}
        </button>
      </header>

      {searchOpen && (
        <div className="relative mx-auto mt-3 max-w-5xl px-4">
          <Search size={18} className="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש מוצר"
            className="field border-transparent pr-10"
            enterKeyHint="search"
            aria-label="חיפוש מוצר"
          />
        </div>
      )}

      {q ? (
        <main className="mx-auto max-w-5xl px-4 pt-5">
          <ClosedNotice className="mb-3" />
          <p className="mb-3 text-sm font-medium text-white">
            {results.length ? `${results.length} תוצאות` : 'לא מצאנו מוצר כזה'}
          </p>
          <ProductGrid products={results} />
        </main>
      ) : (
        <>
          <section className="mx-auto max-w-5xl px-5 pb-8 pt-12 text-white sm:pt-20">
            <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-tight [text-shadow:0_2px_18px_rgba(0,0,0,.35)] sm:text-6xl">
              צנח הסוכר?
              <br />
              אנחנו בדרך.
            </h1>
            <p className="mt-3 max-w-[22rem] text-[16px] leading-relaxed text-white/85">
              נשנושים, שתייה קרה וציוד לשיעור. מזמינים כאן ומקבלים עד החדר.
            </p>
          </section>
          <main className="mx-auto max-w-5xl space-y-3 px-4">
            <ClosedNotice />
            {categories.map((c, i) => (
              <CategoryCard key={c.id} category={c} index={i} products={byCategory[c.id] || []} />
            ))}
          </main>
          <div className="mx-auto mt-3 max-w-5xl px-4">
            <InstallCard />
          </div>
          <footer className="mx-auto mt-8 max-w-5xl space-y-4 px-5">
            <SupportPhones light />
            <p className="text-[13px] text-white/70">
              {settings.storeOpen ? 'תשלום ב-PayBox, ב-Bit או במזומן.' : 'החנות סגורה כרגע, אפשר להסתכל בינתיים.'}
            </p>
          </footer>
        </>
      )}
    </>
  )
}

function CategoryView({ category, items }) {
  const { categories, settings } = useData()
  const ui = useUI()
  const [budget, setBudget] = useState(null)
  useEffect(() => setBudget(null), [category.id])
  const shown = budget ? items.filter((p) => p.price <= budget && p.stock !== 'out') : items

  return (
    <>
      <CategoryHeader categories={categories} current={category} budget={budget} setBudget={setBudget} />
      <main className="mx-auto max-w-5xl px-3 pt-4">
        <ClosedNotice className="mb-3" />
        {category.id === 'sour' && !budget && settings.storeOpen && <BagBuilderCard onOpen={() => ui.openSheet('bag')} />}
        {shown.length ? (
          <ProductGrid products={shown} />
        ) : (
          <div className="rounded-[22px] bg-white p-6 text-center text-sm text-muted">
            {budget ? `אין כאן מוצרים עד ${budget} ₪.` : 'עוד אין מוצרים בקטגוריה הזאת.'}
          </div>
        )}
        <div className="mt-6 rounded-[22px] bg-white p-4">
          <SupportPhones />
        </div>
      </main>
    </>
  )
}

export function Storefront({ path }) {
  const { products, categories } = useData()
  const ui = useUI()
  useStorefrontChrome()
  const catId = path.startsWith('/c/') ? decodeURIComponent(path.slice(3)) : null
  const index = categories.findIndex((c) => c.id === catId)
  const current = index >= 0 ? categories[index] : null

  useEffect(() => {
    if (catId && !current) navigate('/', { replace: true })
  }, [catId, current])

  const byCategory = useMemo(() => {
    const m = {}
    for (const p of products) (m[p.category] ||= []).push(p)
    for (const k of Object.keys(m)) m[k] = sortProducts(m[k])
    return m
  }, [products])

  const sheet = ui.sheet
  return (
    <>
      <BackgroundVideo base={current ? lookOf(current, index).video || 'drinks' : 'drinks'} rotate={!current} />
      <div className="relative z-10 min-h-dvh pb-44">
        {current ? <CategoryView category={current} items={byCategory[current.id] || []} /> : <Home byCategory={byCategory} />}
      </div>

      <CartBar />
      <Toasts />
      <AnimatePresence>
        {sheet?.name === 'checkout' && <CheckoutSheet key="checkout" onClose={ui.closeSheet} />}
        {sheet?.name === 'bag' && <BagBuilder key="bag" onClose={ui.closeSheet} />}
        {sheet?.name === 'combo' && <ComboBuilder key={`combo-${sheet.payload}`} productId={sheet.payload} onClose={ui.closeSheet} />}
        {sheet?.name === 'status' && <OrderStatus key={`status-${sheet.payload}`} orderId={sheet.payload} onClose={ui.closeSheet} />}
      </AnimatePresence>
    </>
  )
}
