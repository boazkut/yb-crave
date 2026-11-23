import { useEffect } from 'react'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { X } from 'lucide-react'
import { useUI } from '../state/UIContext.jsx'

/**
 * נעילת גלילה עם מונה: כמה חלונות יכולים להיות פתוחים יחד (למשל מעבר מהקופה למסך ההזמנה),
 * והגלילה חוזרת רק כשהאחרון נסגר. בלי זה הדף היה נשאר "תקוע" אחרי קנייה.
 */
let locks = 0
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined
    locks += 1
    document.documentElement.classList.add('scroll-locked')
    return () => {
      locks = Math.max(0, locks - 1)
      if (!locks) document.documentElement.classList.remove('scroll-locked')
    }
  }, [active])
}

export function Sheet({ title, onClose, children, footer, wide = false }) {
  const drag = useDragControls()
  useScrollLock()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[94dvh] flex-col rounded-t-3xl bg-white ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        drag="y"
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, i) => (i.offset.y > 110 || i.velocity.y > 600) && onClose()}
      >
        <div className="touch-none px-5 pb-3 pt-2.5" onPointerDown={(e) => drag.start(e)}>
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{title}</h2>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-tile text-muted" aria-label="סגירה">
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="safe-bottom border-t border-line bg-white px-5 pt-3">{footer}</div>}
      </motion.div>
    </div>
  )
}

export function Toasts() {
  const { toasts } = useUI()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-sm rounded-xl bg-ink px-4 py-2.5 text-center text-sm font-medium text-white"
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Stepper({ value, onDec, onInc, size = 'md', dark = false }) {
  const h = size === 'sm' ? 'h-8' : 'h-9'
  return (
    <div className={`flex items-center rounded-full ${dark ? 'bg-ink text-white' : 'border border-line bg-white'} ${h}`}>
      <button type="button" onClick={onDec} className={`grid ${h} w-8 place-items-center`} aria-label="פחות">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>
      <span className="min-w-[18px] text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" onClick={onInc} className={`grid ${h} w-8 place-items-center`} aria-label="עוד">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 12h14M12 5v14" />
        </svg>
      </button>
    </div>
  )
}
