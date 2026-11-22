import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useData } from '../state/DataContext.jsx'

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 leading-none ${className}`} dir="ltr">
      <span className="text-[26px] font-extrabold tracking-tight">Y&amp;B</span>
      <span className="text-[13px] font-semibold tracking-[0.18em] text-muted">CRAVE</span>
    </span>
  )
}

export function StoreStatus() {
  const { settings } = useData()
  const open = settings.storeOpen
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
      <span className={`h-2 w-2 rounded-full ${open ? 'bg-[#1F9D55]' : 'bg-danger'}`} aria-hidden="true" />
      {open ? 'פתוח עכשיו' : 'סגור'}
    </span>
  )
}

export function TopBar({ searchOpen, setSearchOpen, query, setQuery }) {
  const inputRef = useRef(null)
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  return (
    <header className="mx-auto max-w-5xl px-4 pt-3">
      <div className="flex h-12 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo />
          <StoreStatus />
        </div>
        <button
          type="button"
          onClick={() => {
            if (searchOpen) setQuery('')
            setSearchOpen(!searchOpen)
          }}
          className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white"
          aria-label={searchOpen ? 'סגירת חיפוש' : 'חיפוש'}
          aria-expanded={searchOpen}
        >
          {searchOpen ? <X size={18} /> : <Search size={18} />}
        </button>
      </div>
      {searchOpen && (
        <div className="relative mt-2">
          <Search size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש מוצר"
            className="field pr-10"
            enterKeyHint="search"
            aria-label="חיפוש מוצר"
          />
        </div>
      )}
    </header>
  )
}
