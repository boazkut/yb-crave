import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { uid } from '../lib/utils.js'

const ToastCtx = createContext(() => {})

export function AdminToastProvider({ children }) {
  const [items, setItems] = useState([])
  const toast = useCallback((text) => {
    const id = uid()
    setItems((t) => [...t.slice(-1), { id, text }])
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 2400)
  }, [])
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white"
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

export function Section({ title, aside, children, className = '' }) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[17px] font-bold">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-[#D4D4D4]'}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-0.5' : 'left-[22px]'}`} />
    </button>
  )
}

export function Segmented({ value, options, onChange, size = 'md' }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-tile p-1">
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 font-medium transition-colors ${size === 'sm' ? 'py-1.5 text-[12px]' : 'py-2 text-[13px]'} ${
              on ? 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'text-muted'
            }`}
          >
            {o.label}
            {o.count != null && <span className={`mr-1 tabular-nums ${on ? 'text-muted' : ''}`}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

const BADGE = {
  awaiting_payment: 'bg-[#FFF4E5] text-[#9A5B00]',
  preparing: 'bg-tile text-ink',
  on_the_way: 'bg-tile text-ink',
  delivered: 'bg-[#EAF6EE] text-[#1F7A43]',
  rejected: 'bg-[#FDECEA] text-danger',
  cancelled: 'bg-[#FDECEA] text-danger',
}
export function StatusBadge({ status, children }) {
  return <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${BADGE[status] || 'bg-tile'}`}>{children}</span>
}

export const timeAgo = (ts) => {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return 'עכשיו'
  if (m < 60) return `לפני ${m} דק'`
  const h = Math.floor(m / 60)
  if (h < 24) return `לפני ${h} שע'`
  return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

let audioCtx = null
export function chime() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)()
    const t = audioCtx.currentTime
    ;[660, 880].forEach((f, i) => {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t + i * 0.18)
      g.gain.exponentialRampToValueAtTime(0.2, t + i * 0.18 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.3)
      o.connect(g).connect(audioCtx.destination)
      o.start(t + i * 0.18)
      o.stop(t + i * 0.18 + 0.32)
    })
  } catch {
    /* אין סאונד במכשיר */
  }
}
export const unlockAudio = () => {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)()
    audioCtx.resume()
  } catch {
    /* אין סאונד במכשיר */
  }
}
