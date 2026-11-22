import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

/** אפקט אזור השתייה הקרה: בועות גז עולות + אדים קרים בשולי המסך */
export function ColdLayer({ active }) {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        left: (i * 47) % 100,
        size: 5 + ((i * 7) % 12),
        dur: 5 + ((i * 13) % 7),
        delay: -((i * 1.7) % 9),
      })),
    [],
  )

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="cold"
          className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 70% at 50% 120%, rgba(143,227,255,.16), transparent 60%), linear-gradient(90deg, rgba(143,227,255,.14), transparent 18%, transparent 82%, rgba(143,227,255,.14))',
            }}
          />
          {bubbles.map((b, i) => (
            <span
              key={i}
              className="absolute bottom-[-20px] animate-rise rounded-full border border-ice/70 bg-ice/10"
              style={{
                left: `${b.left}%`,
                width: b.size,
                height: b.size,
                '--rise-dur': `${b.dur}s`,
                animationDelay: `${b.delay}s`,
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
