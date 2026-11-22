import { forwardRef } from 'react'
import { ProductCard } from './ProductCard.jsx'

export const CategorySection = forwardRef(function CategorySection({ category: c, products, children }, ref) {
  return (
    <section ref={ref} id={`cat-${c.id}`} data-section={c.id} className="relative z-[2] mx-auto max-w-6xl px-4 pt-12">
      <header
        className="relative flex items-end justify-between gap-3 rounded-[6px] border-2 border-coal px-4 py-3.5"
        style={{ background: c.color, color: c.ink, boxShadow: '5px 5px 0 0 #0E0D0B' }}
      >
        <div>
          <h2 className="display text-[30px] leading-none sm:text-[40px]">{c.name}</h2>
          <p className="mt-1.5 text-sm font-bold opacity-80">{c.sub}</p>
        </div>
        <span className="display shrink-0 text-[40px] leading-none sm:text-[52px]" aria-hidden="true">
          {c.emoji}
        </span>
      </header>
      {children}
      {products.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} accent={c.color} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-[6px] border-2 border-dashed border-paper/15 px-4 py-6 text-center text-sm text-paper/55">
          אין פה כלום שמתאים לסינון. נסו להגדיל את התקציב.
        </p>
      )}
    </section>
  )
})
