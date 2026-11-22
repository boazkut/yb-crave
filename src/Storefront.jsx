import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useData } from './state/DataContext.jsx'
import { useUI } from './state/UIContext.jsx'
import { TopBar } from './components/TopBar.jsx'
import { Hero } from './components/Hero.jsx'
import { CategoryNav, CategorySection, BagBuilderCard } from './components/Catalog.jsx'
import { Toasts } from './components/Overlays.jsx'
import { CheckoutSheet } from './features/Checkout.jsx'
import { BagBuilder, ComboBuilder } from './features/Builders.jsx'
import { CartBar, OrderStatus } from './features/OrderStatus.jsx'

const STOCK_ORDER = { in: 0, low: 1, out: 2 }

export function Storefront() {
  const { products, categories, settings } = useData()
  const ui = useUI()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [budget, setBudget] = useState(null)
  const [active, setActive] = useState(categories[0]?.id)
  const refs = useRef({})

  const grouped = useMemo(() => {
    const q = query.trim()
    const match = (p) => (!q || p.name.includes(q)) && (!budget || (p.price <= budget && p.stock !== 'out'))
    const byCat = {}
    for (const c of categories) {
      byCat[c.id] = products
        .filter((p) => p.category === c.id && match(p))
        .sort((a, b) => STOCK_ORDER[a.stock || 'in'] - STOCK_ORDER[b.stock || 'in'] || (a.sort ?? 0) - (b.sort ?? 0))
    }
    return byCat
  }, [products, categories, query, budget])

  const filtering = Boolean(query.trim() || budget)
  const visible = categories.filter((c) => grouped[c.id]?.length || (!filtering && c.id === 'sour'))

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.dataset.section)),
      { rootMargin: '-30% 0px -60% 0px' },
    )
    Object.values(refs.current).forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [visible.length, filtering])

  const jump = (id) => document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const sheet = ui.sheet

  return (
    <div className="pb-40">
      <TopBar searchOpen={searchOpen} setSearchOpen={setSearchOpen} query={query} setQuery={setQuery} />
      {!filtering && <Hero />}
      <CategoryNav categories={visible.length ? visible : categories} active={active} onJump={jump} budget={budget} setBudget={setBudget} />

      <main>
        {filtering && (
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-5 text-sm">
            <span className="text-muted">
              {visible.reduce((s, c) => s + grouped[c.id].length, 0)} מוצרים
              {budget ? ` עד ${budget} ₪` : ''}
              {query.trim() ? ` עבור "${query.trim()}"` : ''}
            </span>
            <button
              type="button"
              className="font-medium underline underline-offset-4"
              onClick={() => {
                setQuery('')
                setBudget(null)
                setSearchOpen(false)
              }}
            >
              ניקוי
            </button>
          </div>
        )}
        {filtering && visible.length === 0 && <p className="px-4 pt-16 text-center text-muted">לא מצאנו מוצרים שמתאימים.</p>}

        {visible.map((c) => (
          <CategorySection
            key={c.id}
            ref={(el) => (refs.current[c.id] = el)}
            category={c}
            products={grouped[c.id] || []}
            lead={c.id === 'sour' && !filtering ? <BagBuilderCard onOpen={() => ui.openSheet('bag')} /> : null}
          />
        ))}
      </main>

      <footer className="mx-auto mt-14 max-w-5xl px-4 text-[13px] text-muted">
        <div className="border-t border-line pt-5">
          Y&amp;B CRAVE. העברות ל-{settings.transferPhone}.
        </div>
      </footer>

      <CartBar />
      <Toasts />

      <AnimatePresence>
        {sheet?.name === 'checkout' && <CheckoutSheet key="checkout" onClose={ui.closeSheet} />}
        {sheet?.name === 'bag' && <BagBuilder key="bag" onClose={ui.closeSheet} />}
        {sheet?.name === 'combo' && <ComboBuilder key={`combo-${sheet.payload}`} productId={sheet.payload} onClose={ui.closeSheet} />}
        {sheet?.name === 'status' && <OrderStatus key={`status-${sheet.payload}`} orderId={sheet.payload} onClose={ui.closeSheet} />}
      </AnimatePresence>
    </div>
  )
}
