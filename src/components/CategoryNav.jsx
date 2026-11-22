import { useEffect, useRef } from 'react'

export function CategoryNav({ categories, active, onJump, filtersActive, onClearFilters }) {
  const rowRef = useRef(null)

  useEffect(() => {
    const el = rowRef.current?.querySelector(`[data-cat="${active}"]`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])

  return (
    <nav className="sticky top-0 z-30 border-b-2 border-coal bg-coal/95 backdrop-blur-md" aria-label="קטגוריות">
      <div ref={rowRef} className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5">
        {categories.map((c) => {
          const on = active === c.id
          return (
            <button
              key={c.id}
              type="button"
              data-cat={c.id}
              onClick={() => onJump(c.id)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border-2 px-3 py-2 text-sm font-extrabold transition-colors"
              style={
                on
                  ? { background: c.color, borderColor: '#0E0D0B', color: c.ink }
                  : { borderColor: 'rgba(244,234,213,.14)', color: '#F4EAD5' }
              }
              aria-current={on ? 'true' : undefined}
            >
              <span aria-hidden="true">{c.emoji}</span>
              {c.name}
            </button>
          )
        })}
      </div>
      {filtersActive && (
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 border-t border-paper/10 px-4 py-1.5 text-xs">
          <span className="font-bold text-lime">מציגים רק מה שמתאים לסינון</span>
          <button type="button" onClick={onClearFilters} className="font-extrabold text-paper underline underline-offset-4">
            נקה סינון
          </button>
        </div>
      )}
    </nav>
  )
}
