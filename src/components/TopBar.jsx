import { useData } from '../state/DataContext.jsx'

export function Logo({ light = false, className = '' }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 leading-none ${className}`} dir="ltr">
      <span className={`text-[26px] font-extrabold tracking-tight ${light ? 'text-white' : ''}`}>Y&amp;B</span>
      <span className={`text-[13px] font-semibold tracking-[0.18em] ${light ? 'text-white/75' : 'text-muted'}`}>CRAVE</span>
    </span>
  )
}

export function StoreStatus({ pill = false }) {
  const { settings } = useData()
  const open = settings.storeOpen
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${pill ? 'rounded-full bg-white/90 px-3 py-1.5 text-ink' : 'text-muted'}`}>
      <span className={`h-2 w-2 rounded-full ${open ? 'bg-[#1F9D55]' : 'bg-danger'}`} aria-hidden="true" />
      {open ? 'פתוח עכשיו' : 'סגור'}
    </span>
  )
}
