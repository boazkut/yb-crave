import { forwardRef, memo, useEffect, useRef } from 'react'
import { ChevronLeft, Plus } from 'lucide-react'
import { ProductArt } from './ProductArt.jsx'
import { Stepper } from './Overlays.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { STOCK } from '../lib/shop.js'
import { ils } from '../lib/utils.js'

export function CategoryNav({ categories, active, onJump, budget, setBudget }) {
  const rowRef = useRef(null)
  useEffect(() => {
    rowRef.current?.querySelector(`[data-cat="${active}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])

  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-page/95 backdrop-blur" aria-label="קטגוריות">
      <div ref={rowRef} className="no-scrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2">
        {categories.map((c) => {
          const on = active === c.id
          return (
            <button
              key={c.id}
              type="button"
              data-cat={c.id}
              onClick={() => onJump(c.id)}
              aria-current={on ? 'true' : undefined}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[15px] transition-colors ${on ? 'bg-ink font-semibold text-white' : 'font-medium text-muted'}`}
            >
              {c.name}
            </button>
          )
        })}
      </div>
      <div className="no-scrollbar mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-4 pb-2.5">
        <span className="shrink-0 text-[13px] text-muted">תקציב</span>
        {[5, 10, 20].map((b) => (
          <button
            key={b}
            type="button"
            className="chip px-3 py-1.5 text-[13px]"
            aria-pressed={budget === b}
            onClick={() => setBudget(budget === b ? null : b)}
          >
            עד {b} ₪
          </button>
        ))}
      </div>
    </nav>
  )
}

function ProductCardBase({ product: p }) {
  const cart = useCart()
  const ui = useUI()
  const out = p.stock === 'out'
  const qty = cart.qtyOf(p.id)

  const add = () => {
    if (p.comboSlots) return ui.openSheet('combo', p.id)
    cart.addProduct(p)
  }

  return (
    <article className={`flex flex-col rounded-2xl border border-line bg-white p-2 ${out ? 'opacity-60' : ''}`}>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-tile">
        <ProductArt product={p} dim={out} className="absolute inset-[11%] h-[78%] w-[78%]" />
        {p.stock !== 'in' && (
          <span
            className={`absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold ${out ? 'text-danger' : 'text-ink'}`}
          >
            {STOCK[p.stock]?.label}
          </span>
        )}
        {!out && (
          <div className="absolute bottom-2 left-2">
            {qty > 0 && !p.comboSlots ? (
              <Stepper size="sm" dark value={qty} onDec={() => cart.decProduct(p.id)} onInc={add} />
            ) : (
              <button
                type="button"
                onClick={add}
                className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white active:scale-95"
                aria-label={`הוספת ${p.name}`}
              >
                <Plus size={18} strokeWidth={2.4} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-2">
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug">{p.name}</h3>
        {p.note && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">{p.note}</p>}
        <p className="mt-auto pt-1.5 text-[15px] font-bold">{ils(p.price)}</p>
      </div>
    </article>
  )
}
export const ProductCard = memo(ProductCardBase)

export const CategorySection = forwardRef(function CategorySection({ category, products, lead }, ref) {
  return (
    <section ref={ref} id={`cat-${category.id}`} data-section={category.id} className="mx-auto max-w-5xl scroll-mt-28 px-4 pt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[22px] font-bold">{category.name}</h2>
        <span className="text-[13px] text-muted">{products.length} מוצרים</span>
      </div>
      {lead}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
})

export function BagBuilderCard({ onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="card mb-3 flex w-full items-center gap-4 p-3 text-right">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-tile">
        <ProductArt
          product={{ id: 'bag-card', name: 'שקית חמצוצים', art: { shape: 'gummy', c1: '#E5212B', c2: '#7CCB2B', label: '5 / 10 ₪' } }}
          className="h-14 w-12"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold">הרכב שקית חמצוצים</p>
        <p className="mt-0.5 text-[13px] text-muted">בוחרים גודל (5 או 10 ₪) ואת הסוגים לערבוב</p>
      </div>
      <ChevronLeft size={20} className="shrink-0 text-muted" />
    </button>
  )
}
