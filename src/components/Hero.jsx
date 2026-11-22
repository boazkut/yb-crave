import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useData } from '../state/DataContext.jsx'

/** פחית Y&B — מסתובבת ונעה בעדינות לפי הגלילה בתוך ה-Hero בלבד */
function Can({ progress }) {
  const reduce = useReducedMotion()
  const p = useSpring(progress, { stiffness: 120, damping: 30, mass: 0.5 })
  const rotate = useTransform(p, [0, 1], [-7, 9])
  const y = useTransform(p, [0, 1], [0, 26])
  const labelX = useTransform(p, [0, 1], ['0px', '-90px'])

  return (
    <motion.div style={reduce ? undefined : { rotate, y }} className="relative mx-auto h-[190px] w-[104px] sm:h-[250px] sm:w-[136px]">
      <div className="absolute inset-x-[6%] -bottom-3 h-4 rounded-[50%] bg-black/10 blur-md" />
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '18px / 10px', background: '#141414' }}>
        <motion.div style={reduce ? undefined : { x: labelX }} className="absolute inset-y-0 right-[-90px] flex w-[300px] items-center justify-around" dir="ltr">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="text-[30px] font-extrabold leading-none text-[#FAF9F6] sm:text-[40px]"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Y&amp;B
            </span>
          ))}
        </motion.div>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 22%, rgba(255,255,255,.22) 34%, rgba(255,255,255,0) 48%, rgba(0,0,0,0) 70%, rgba(0,0,0,.5) 100%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-[7%] bg-[#2A2A2A]" />
      </div>
      <div className="absolute -top-[5px] left-[5%] h-[14px] w-[90%] rounded-[50%]" style={{ background: 'linear-gradient(180deg,#E9E7E2,#B4B0A8)' }} />
      <div className="absolute -top-[1px] left-[38%] h-[5px] w-[24%] rounded-full bg-[#8E8A82]" />
    </motion.div>
  )
}

export function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const { settings } = useData()

  return (
    <section ref={ref} className="mx-auto max-w-5xl px-4 pb-6 pt-5 sm:pt-10">
      <div className="card grid grid-cols-[1fr_auto] items-center gap-4 overflow-hidden px-5 py-7 sm:px-10 sm:py-12">
        <div>
          <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            צנח הסוכר?
            <br />
            אנחנו בדרך.
          </h1>
          <p className="mt-3 max-w-[22rem] text-[15px] leading-relaxed text-muted sm:text-lg">
            נשנושים, שתייה קרה וציוד לשיעור. מזמינים כאן ומקבלים עד החדר.
          </p>
          <p className="mt-4 text-[13px] text-muted">
            {settings.storeOpen ? 'תשלום ב-PayBox, ב-Bit או במזומן' : 'החנות סגורה כרגע, אפשר להסתכל בינתיים'}
          </p>
        </div>
        <div className="w-[112px] sm:w-[180px]">
          <Can progress={scrollYProgress} />
        </div>
      </div>
    </section>
  )
}
