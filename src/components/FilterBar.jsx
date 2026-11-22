import { TAGS } from '../data/catalog.js'

const BUDGETS = [5, 10, 20]

export function FilterBar({ query, setQuery, tags, setTags, budget, setBudget }) {
  const toggleTag = (id) => setTags(tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id])

  return (
    <section id="filters" className="relative z-[2] mx-auto max-w-6xl px-4 pt-2" aria-label="חיפוש וסינון">
      <div className="rounded-[8px] border-2 border-paper/12 bg-coal-2/95 p-3.5 backdrop-blur">
        <label className="relative block">
          <span className="sr-only">חיפוש</span>
          <svg className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-paper/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="מה בא לך? במבה, קולה, טאקיס..."
            className="field pr-11"
            enterKeyHint="search"
          />
        </label>

        <div className="no-scrollbar -mx-3.5 mt-3 flex gap-2 overflow-x-auto px-3.5">
          {TAGS.filter((t) => t.id !== 'hit').map((t) => (
            <button key={t.id} type="button" className="chip" aria-pressed={tags.includes(t.id)} onClick={() => toggleTag(t.id)}>
              {t.label} <span aria-hidden="true">{t.emoji}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-extrabold">יש לי רק...</span>
          <div className="flex gap-1.5">
            {BUDGETS.map((b) => (
              <button
                key={b}
                type="button"
                className="chip px-3 py-1.5"
                aria-pressed={budget === b}
                onClick={() => setBudget(budget === b ? null : b)}
              >
                עד {b} ₪
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={budget ?? 30}
            onChange={(e) => setBudget(Number(e.target.value) >= 30 ? null : Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-lime"
            aria-label="תקציב מקסימלי"
          />
          <span className="w-16 shrink-0 text-left text-sm font-extrabold tabular-nums text-lime">
            {budget ? `${budget} ₪` : 'בלי הגבלה'}
          </span>
        </div>
      </div>
    </section>
  )
}
