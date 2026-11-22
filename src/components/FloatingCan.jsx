import { motion, useScroll, useSpring, useTransform, useReducedMotion } from 'framer-motion'

/**
 * הפחית המרחפת: מגיבה ישירות לגלילה — מסתובבת סביב הציר (התווית "רצה"),
 * נוטה בזווית, ועוברת מצד לצד בין הסקשנים. לידה מרחף פס חמוץ שזז בכיוון ההפוך.
 */
export function FloatingCan({ cold = false }) {
  const reduce = useReducedMotion()
  const { scrollY, scrollYProgress } = useScroll()
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 })
  const sy = useSpring(scrollY, { stiffness: 120, damping: 26, mass: 0.4 })

  const x = useTransform(p, [0, 0.12, 0.3, 0.48, 0.66, 0.84, 1], ['6vw', '68vw', '8vw', '70vw', '10vw', '66vw', '40vw'])
  const top = useTransform(p, [0, 0.08, 1], ['20vh', '34vh', '46vh'])
  const rotate = useTransform(p, [0, 0.12, 0.3, 0.48, 0.66, 0.84, 1], [-14, 22, -24, 18, -20, 16, -6])
  const rotateX = useTransform(p, [0, 0.25, 0.5, 0.75, 1], [12, -18, 14, -16, 8])
  const scale = useTransform(sy, [0, 520], [1.18, 0.72])
  const labelX = useTransform(sy, (v) => `${-((v * 0.55) % 240)}px`)
  const opacity = useTransform(sy, [0, 400, 900], [1, 1, 0.85])

  const gx = useTransform(p, [0, 0.12, 0.3, 0.48, 0.66, 0.84, 1], ['70vw', '10vw', '72vw', '6vw', '68vw', '12vw', '74vw'])
  const gtop = useTransform(p, [0, 1], ['58vh', '18vh'])
  const grot = useTransform(sy, (v) => v * -0.12)

  if (reduce) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {/* פס חמוץ משני */}
      <motion.div style={{ x: gx, top: gtop, rotate: grot }} className="absolute left-0 w-[64px] opacity-80 sm:w-[86px]">
        <svg viewBox="0 0 120 70" className="w-full drop-shadow-[0_10px_18px_rgba(0,0,0,.5)]">
          <path d="M10 40 C30 10 54 66 78 36 S108 18 110 36" stroke="#B5F23A" strokeWidth="22" fill="none" strokeLinecap="round" />
          <path d="M10 40 C30 10 54 66 78 36 S108 18 110 36" stroke="#E5212B" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="2 9" />
          <g fill="#fff" opacity=".8">
            <rect x="22" y="28" width="2.5" height="2.5" />
            <rect x="48" y="40" width="2.5" height="2.5" />
            <rect x="70" y="30" width="2.5" height="2.5" />
            <rect x="92" y="26" width="2.5" height="2.5" />
          </g>
        </svg>
      </motion.div>

      {/* הפחית */}
      <motion.div
        style={{ x, top, rotate, scale, opacity }}
        className="absolute left-0 h-[128px] w-[72px] sm:h-[176px] sm:w-[98px]"
      >
        <div className="h-full w-full" style={{ perspective: 700 }}>
          <motion.div style={{ rotateX }} className="relative h-full w-full [transform-style:preserve-3d]">
            <div
              className="absolute inset-0 overflow-hidden border-2 border-coal shadow-[0_22px_40px_-12px_rgba(0,0,0,.75)]"
              style={{ borderRadius: '14px / 9px', background: '#E5212B' }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 flex w-[720px] items-center"
                style={{ x: labelX }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex h-full w-[120px] shrink-0 items-center justify-center" dir="ltr">
                    <span
                      className="display whitespace-nowrap text-[30px] leading-none text-paper sm:text-[40px]"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      Y&amp;B
                    </span>
                    <span className="mx-2 h-full w-[6px] bg-lime" />
                    <span
                      className="whitespace-nowrap text-[13px] font-black italic leading-none text-coal sm:text-[16px]"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      CRAVE
                    </span>
                  </div>
                ))}
              </motion.div>
              {/* הצללה גלילית — יוצרת את תחושת התלת-ממד */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.1) 18%, rgba(255,255,255,.38) 30%, rgba(255,255,255,0) 46%, rgba(0,0,0,.12) 70%, rgba(0,0,0,.6) 100%)',
                }}
              />
              {cold && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.5)_0_2px,transparent_3px)] bg-[length:9px_11px] opacity-70" />
              )}
            </div>
            {/* מכסה */}
            <div
              className="absolute -top-[6px] left-[6%] h-[14px] w-[88%] rounded-[50%] border-2 border-coal"
              style={{ background: 'linear-gradient(180deg,#E7E3DC,#9E9A93)' }}
            />
            <div className="absolute -top-[2px] left-[38%] h-[5px] w-[24%] rounded-full bg-[#6F6B64]" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
