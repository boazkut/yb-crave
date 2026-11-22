import { useEffect } from 'react'
import { AnimatePresence, motion, useDragControls, useSpring, useTransform } from 'framer-motion'
import { useUI } from '../state/UIContext.jsx'
import { useCart } from '../state/CartContext.jsx'

export function Sheet({ title, onClose, children, footer, tone = 'dark' }) {
  const dragControls = useDragControls()
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div
        className="absolute inset-0 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[94dvh] max-w-xl flex-col rounded-t-[14px] border-2 border-b-0 border-coal ${
          tone === 'paper' ? 'bg-paper text-coal' : 'bg-coal-2 text-paper'
        }`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose()
        }}
      >
        <div
          className="flex touch-none items-center justify-between gap-3 px-4 pb-2 pt-3"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-current opacity-25" />
          <h2 className="display pt-2 text-2xl leading-none">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 grid h-9 w-9 place-items-center rounded-full border-2 border-current/20 text-lg font-black opacity-70"
            aria-label="סגירה"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {children}
        </div>
        {footer && <div className="safe-bottom border-t-2 border-current/10 px-4 pt-3">{footer}</div>}
      </motion.div>
    </div>
  )
}

export function Toasts() {
  const { toasts } = useUI()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[140px] z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -1 }}
            exit={{ opacity: 0, y: -8 }}
            className="max-w-sm rounded-[6px] border-2 border-coal bg-paper px-4 py-2.5 text-center text-sm font-extrabold text-coal shadow-[4px_4px_0_0_#0E0D0B]"
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function FlyLayer() {
  const { flights, landFlight } = useUI()
  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
      <AnimatePresence>
        {flights.map((f) => {
          const midX = (f.from.x + f.to.x) / 2
          const midY = Math.min(f.from.y, f.to.y) - 140
          return (
            <motion.div
              key={f.id}
              className="absolute left-0 top-0 h-6 w-6 rounded-full border-2 border-coal"
              style={{ background: f.color, boxShadow: '0 0 18px ' + f.color }}
              initial={{ x: f.from.x - 12, y: f.from.y - 12, scale: 1.2 }}
              animate={{
                x: [f.from.x - 12, midX - 12, f.to.x - 12],
                y: [f.from.y - 12, midY - 12, f.to.y - 12],
                scale: [1.2, 1, 0.45],
              }}
              transition={{ duration: 0.62, ease: [0.45, 0, 0.55, 1], times: [0, 0.45, 1] }}
              onAnimationComplete={() => landFlight(f.id)}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function AnimatedTotal({ value }) {
  const spring = useSpring(value, { stiffness: 180, damping: 22 })
  useEffect(() => {
    spring.set(value)
  }, [value, spring])
  const text = useTransform(spring, (v) => `${Math.round(v)} ₪`)
  return <motion.span className="tabular-nums">{text}</motion.span>
}

export function CartBar() {
  const ui = useUI()
  const cart = useCart()
  const total = cart.subtotal + cart.deposit

  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pt-2">
      <motion.button
        type="button"
        onClick={() => ui.openSheet('cart')}
        className="pointer-events-auto mx-auto flex w-full max-w-md items-center gap-3 rounded-[10px] border-[3px] border-coal bg-paper py-2 pe-2 ps-3 text-coal shadow-[0_10px_30px_-6px_rgba(0,0,0,.7),5px_5px_0_0_#0E0D0B]"
        whileTap={{ scale: 0.98 }}
        aria-label={`פתח עגלה, ${cart.count} פריטים`}
      >
        <motion.span
          ref={ui.cartTargetRef}
          key={ui.bump}
          initial={{ scale: 1 }}
          animate={ui.bump ? { scale: [1, 1.35, 0.9, 1.08, 1], rotate: [0, -12, 8, 0] } : {}}
          transition={{ duration: 0.45 }}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-coal text-paper"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
          </svg>
          {cart.count > 0 && (
            <span className="absolute -left-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full border-2 border-coal bg-lime px-1 text-xs font-black text-coal">
              {cart.count}
            </span>
          )}
        </motion.span>
        <span className="flex-1 text-right leading-tight">
          <span className="block text-sm font-bold text-coal/60">{cart.count ? 'השקית שלך' : 'השקית ריקה'}</span>
          <span className="display block text-2xl leading-none">
            <AnimatedTotal value={total} />
          </span>
        </span>
        <span className="rounded-[7px] border-2 border-coal bg-cola px-4 py-3 text-[15px] font-extrabold leading-none text-paper">
          {cart.count ? 'לקופה' : 'לעגלה'}
        </span>
      </motion.button>
    </div>
  )
}
