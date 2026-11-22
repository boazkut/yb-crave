import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { uid } from '../lib/utils.js'

const Ctx = createContext(() => {})

export function AdminToastProvider({ children }) {
  const [items, setItems] = useState([])
  const toast = useCallback((text) => {
    const id = uid()
    setItems((t) => [...t.slice(-2), { id, text }])
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 2400)
  }, [])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <AdminToastsList items={items} />
    </Ctx.Provider>
  )
}

function AdminToastsList({ items }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[6px] border-2 border-coal bg-paper px-4 py-2 text-sm font-extrabold text-coal shadow-[3px_3px_0_0_#0E0D0B]"
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export const AdminToasts = () => null
export const useAdminToast = () => useContext(Ctx)

export function Card({ title, children, actions, className = '' }) {
  return (
    <section className={`rounded-[8px] border-2 border-paper/12 bg-coal-2 p-4 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="display text-xl leading-none">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Toggle({ checked, onChange, label, big = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full border-2 border-coal transition-colors ${checked ? 'bg-lime' : 'bg-paper/20'} ${
        big ? 'h-10 w-[76px]' : 'h-7 w-12'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 rounded-full border-2 border-coal bg-paper ${big ? 'h-8 w-8' : 'h-5 w-5'}`}
        style={checked ? { left: 2 } : { right: 2 }}
      />
    </button>
  )
}

export function Segmented({ value, options, onChange, size = 'md' }) {
  return (
    <div className="flex overflow-hidden rounded-[6px] border-2 border-paper/15">
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`flex-1 whitespace-nowrap px-2 font-extrabold ${size === 'sm' ? 'py-1.5 text-[11px]' : 'py-2 text-xs'}`}
            style={on ? { background: o.color || '#B5F23A', color: '#1C1A17' } : undefined}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
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
export function beep() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)()
    const t = audioCtx.currentTime
    ;[880, 1320].forEach((f, i) => {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.type = 'square'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t + i * 0.16)
      g.gain.exponentialRampToValueAtTime(0.15, t + i * 0.16 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.14)
      o.connect(g).connect(audioCtx.destination)
      o.start(t + i * 0.16)
      o.stop(t + i * 0.16 + 0.15)
    })
  } catch {
    /* אין סאונד */
  }
}
export const unlockAudio = () => {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)()
    audioCtx.resume()
  } catch {
    /* אין סאונד */
  }
}
