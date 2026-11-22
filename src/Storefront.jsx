import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useData } from './state/DataContext.jsx'
import { useUI } from './state/UIContext.jsx'
import { useLocal, LS_KEYS } from './state/useLocal.js'
import { CATEGORIES, TAGS } from './data/catalog.js'
import { effectiveStock } from './lib/shop.js'
import { vibrate } from './lib/utils.js'
import { Marquee } from './components/Marquee.jsx'
import { Logo } from './components/Logo.jsx'
import { StatusBadge } from './components/StatusBadge.jsx'
import { Hero } from './components/Hero.jsx'
import { FloatingCan } from './components/FloatingCan.jsx'
import { ColdLayer } from './components/ColdLayer.jsx'
import { CategoryNav } from './components/CategoryNav.jsx'
import { FilterBar } from './components/FilterBar.jsx'
import { CategorySection } from './components/CategorySection.jsx'
import { CommunitySection } from './components/CommunitySection.jsx'
import { Footer } from './components/Footer.jsx'
import { CartBar, FlyLayer, Toasts } from './components/Overlays.jsx'
import { CartSheet } from './features/CartSheet.jsx'
import { BagBuilder } from './features/BagBuilder.jsx'
import { Roulette } from './features/Roulette.jsx'
import { ComboBuilder } from './features/ComboBuilder.jsx'
import { OrderTracking } from './features/OrderTracking.jsx'
import { OrderWatcher } from './features/OrderWatcher.jsx'

const SECRET_CAT = { id: 'secret', name: 'התפריט הסודי', sub: 'לא סיפרנו לאף אחד. גם לא לך.', color: '#D9A23B', ink: '#1C1A17', emoji: '🤫' }
const TAG_LABELS = Object.fromEntries(TAGS.map((t) => [t.id, t.label]))
const STOCK_ORDER = { in: 0, low: 1, out: 2 }

export function Storefront() {
  const { products, settings } = useData()
  const ui = useUI()
  const [secret, setSecret] = useLocal(LS_KEYS.secret, false)
  const [query, setQuery] = useState('')
  const [tags, setTags] = useState([])
  const [budget, setBudget] = useState(null)
  const [active, setActive] = useState('salty')
  const [cold, setCold] = useState(false)
  const sectionRefs = useRef({})

  const unlockSecret = useCallback(() => {
    if (!secret) {
      setSecret(true)
      ui.toast('🤫 פתחת את התפריט הסודי. אל תספרו לאף אחד.')
    } else {
      ui.toast('התפריט הסודי כבר פתוח אצלך 😉')
    }
    setTimeout(() => document.getElementById('cat-secret')?.scrollIntoView({ behavior: 'smooth' }), 350)
  }, [secret, setSecret, ui])

  // קוד סודי בשורת החיפוש
  useEffect(() => {
    if (query.trim() && settings.secretCode && query.trim().toUpperCase() === String(settings.secretCode).toUpperCase()) {
      setQuery('')
      vibrate([20, 40, 20])
      unlockSecret()
    }
  }, [query, settings.secretCode, unlockSecret])

  const filtersActive = Boolean(query.trim() || tags.length || budget)
  const clearFilters = () => {
    setQuery('')
    setTags([])
    setBudget(null)
  }

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (p) => {
      if (q) {
        const hay = `${p.name} ${(p.tags || []).map((t) => TAG_LABELS[t]).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (tags.length && !tags.every((t) => p.tags?.includes(t))) return false
      if (budget && (Number(p.price) + Number(p.deposit || 0) > budget || effectiveStock(p) === 'out')) return false
      return true
    }
    const sort = (list) =>
      list
        .map((p, i) => [p, i])
        .sort((a, b) => STOCK_ORDER[effectiveStock(a[0])] - STOCK_ORDER[effectiveStock(b[0])] || a[1] - b[1])
        .map(([p]) => p)
    const out = {}
    for (const c of CATEGORIES) out[c.id] = sort(products.filter((p) => !p.secret && p.category === c.id && match(p)))
    out.secret = sort(products.filter((p) => p.secret && match(p)))
    return out
  }, [products, query, tags, budget])

  const visibleCats = useMemo(() => {
    const list = CATEGORIES.filter((c) => !filtersActive || grouped[c.id].length)
    if (secret && grouped.secret.length) list.push(SECRET_CAT)
    return list
  }, [grouped, filtersActive, secret])

  // איזו קטגוריה מול העיניים + אזור השתייה הקרה
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = e.target.dataset.section
          if (e.isIntersecting) setActive(id)
          if (id === 'drinks') setCold(e.isIntersecting)
        })
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [visibleCats])

  const jump = (id) => document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const sheet = ui.sheet
  return (
    <>
      <FloatingCan cold={cold} />
      <ColdLayer active={cold} />

      <Marquee text={settings.marquee} />
      <header className="relative z-[3] mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-4">
        <Logo onSecret={unlockSecret} className="h-[58px] sm:h-[72px]" />
        <div className="hidden sm:block">
          <StatusBadge compact />
        </div>
      </header>

      <Hero />

      <CategoryNav
        categories={visibleCats}
        active={active}
        onJump={jump}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
      />

      <main className="relative z-[2]">
        <FilterBar query={query} setQuery={setQuery} tags={tags} setTags={setTags} budget={budget} setBudget={setBudget} />

        {filtersActive && visibleCats.length === 0 && (
          <div className="mx-auto max-w-6xl px-4 pt-10 text-center">
            <p className="display text-2xl">לא מצאנו כלום</p>
            <p className="mt-1 text-sm text-paper/60">נסו מילה אחרת או הגדילו את התקציב.</p>
            <button type="button" onClick={clearFilters} className="btn-lime mt-4">
              נקה סינון
            </button>
          </div>
        )}

        {visibleCats.map((c) => (
          <CategorySection
            key={c.id}
            ref={(el) => (sectionRefs.current[c.id] = el)}
            category={c}
            products={grouped[c.id] || []}
          >
            {c.id === 'combos' && !filtersActive && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => ui.openSheet('bag')}
                  className="rounded-[6px] border-2 border-dashed border-lime/70 px-3 py-4 text-right"
                >
                  <span className="display block text-xl leading-tight text-lime">הרכב שקית חמצוצים</span>
                  <span className="mt-1 block text-xs text-paper/60">5, 10 או 15 ₪. אתם בוחרים מה נכנס.</span>
                </button>
                <button
                  type="button"
                  onClick={() => ui.openSheet('roulette')}
                  className="rounded-[6px] border-2 border-dashed border-bubble/70 px-3 py-4 text-right"
                >
                  <span className="display block text-xl leading-tight text-bubble">גלגל ההפתעות</span>
                  <span className="mt-1 block text-xs text-paper/60">לא יודעים מה בא לכם? הגלגל יחליט.</span>
                </button>
              </div>
            )}
          </CategorySection>
        ))}

        {!filtersActive && <CommunitySection />}
      </main>

      <Footer />

      <OrderWatcher />
      <CartBar />
      <FlyLayer />
      <Toasts />

      <AnimatePresence>
        {sheet?.name === 'cart' && <CartSheet key="cart" onClose={ui.closeSheet} />}
        {sheet?.name === 'bag' && <BagBuilder key="bag" onClose={ui.closeSheet} />}
        {sheet?.name === 'roulette' && <Roulette key="roulette" onClose={ui.closeSheet} />}
        {sheet?.name === 'combo' && <ComboBuilder key={`combo-${sheet.payload}`} productId={sheet.payload} onClose={ui.closeSheet} />}
        {sheet?.name === 'track' && <OrderTracking key={`track-${sheet.payload}`} orderId={sheet.payload} onClose={ui.closeSheet} />}
      </AnimatePresence>
    </>
  )
}
