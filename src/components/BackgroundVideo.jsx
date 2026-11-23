import { useEffect, useRef, useState } from 'react'

/**
 * רקע וידאו לכל האפליקציה.
 * כל הסרטונים מתחלפים: כל כמה שניות, וגם בכל קטע גלילה — "חיתוך" לקליפ הבא עם זום קצר והבזק, כמו באדיט.
 * רק קליפ אחד מתנגן בכל רגע והבא בתור כבר נטען, כדי שהטלפון לא ייתקע.
 */
const CLIPS = {
  drinks: { src: '/media/bg-drinks.mp4', poster: '/media/poster-drinks.jpg' },
  candy: { src: '/media/bg-candy.mp4', poster: '/media/poster-candy.jpg' },
  salty: { src: '/media/bg-salty.mp4', poster: '/media/poster-salty.jpg' },
  sweets: { src: '/media/bg-sweets.mp4', poster: '/media/poster-sweets.jpg' },
}
const ORDER = ['drinks', 'candy', 'salty', 'sweets']
const EVERY_MS = 4200 // חיתוך אוטומטי
const SCROLL_STEP = 380 // חיתוך בגלילה

const lowPower = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData === true)

export function BackgroundVideo({ base = 'drinks' }) {
  const startIdx = Math.max(0, ORDER.indexOf(base))
  const [idx, setIdx] = useState(startIdx)
  const refs = useRef({})
  const still = useRef(lowPower()).current
  const lastCut = useRef(performance.now())
  const active = ORDER[idx]
  const next = ORDER[(idx + 1) % ORDER.length]

  // דף קטגוריה מתחיל מהסרטון שלה
  useEffect(() => {
    setIdx(startIdx)
  }, [startIdx])

  const cut = () => {
    lastCut.current = performance.now()
    setIdx((i) => (i + 1) % ORDER.length)
  }

  // חיתוך לפי זמן
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden) return
      if (performance.now() - lastCut.current >= EVERY_MS - 50) cut()
    }, 500)
    return () => clearInterval(t)
  }, [])

  // חיתוך לפי גלילה (לכל כיוון)
  useEffect(() => {
    let lastY = window.scrollY
    let acc = 0
    const onScroll = () => {
      const y = window.scrollY
      acc += Math.abs(y - lastY)
      lastY = y
      if (acc >= SCROLL_STEP && performance.now() - lastCut.current > 280) {
        acc = 0
        cut()
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // מנגנים רק את הקליפ הפעיל, עם זום קצר (בלי פילטרים כבדים)
  useEffect(() => {
    if (still) return
    for (const key of ORDER) {
      const v = refs.current[key]
      if (!v) continue
      if (key === active) {
        try {
          v.currentTime = 0
        } catch {
          /* עוד לא נטען */
        }
        v.play().catch(() => {})
        v.animate?.([{ transform: 'scale(1.2)' }, { transform: 'scale(1.06)' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' })
      } else v.pause()
    }
  }, [active, still])

  // עצירה כשהאפליקציה ברקע
  useEffect(() => {
    if (still) return undefined
    const onVis = () => {
      const v = refs.current[active]
      if (!v) return
      if (document.hidden) v.pause()
      else v.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [active, still])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-screen overflow-hidden bg-[#161616]" style={{ height: '100lvh' }} aria-hidden="true">
      {ORDER.map((key) => {
        const on = key === active
        const style = { opacity: on ? 1 : 0 }
        return still ? (
          <img
            key={key}
            src={CLIPS[key].poster}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover transition-opacity duration-700"
            style={style}
          />
        ) : (
          <video
            key={key}
            ref={(el) => (refs.current[key] = el)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ ...style, transform: 'scale(1.06)' }}
            src={CLIPS[key].src}
            poster={CLIPS[key].poster}
            muted
            loop
            playsInline
            autoPlay={on}
            preload={on || key === next ? 'auto' : 'metadata'}
            disablePictureInPicture
          />
        )
      })}
      {!still && <div key={`flash-${idx}`} className="bg-flash absolute inset-0 bg-white" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/55" />
    </div>
  )
}
