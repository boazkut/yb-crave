import { useData } from '../state/DataContext.jsx'
import { LogoMark } from './LogoMark.jsx'

/** הסמל של האפליקציה: Y&B ומתחת CRAVE */
export function Logo({ light = false, className = '' }) {
  return <LogoMark tone={light ? 'light' : 'dark'} className={`block h-[38px] w-[61px] shrink-0 ${className}`} />
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
