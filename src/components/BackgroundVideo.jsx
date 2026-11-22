import { useEffect, useRef, useState } from 'react'

/**
 * רקע וידאו לכל האפליקציה.
 * בכל החלקה (כל ~600px גלילה) הרקע "חותך" לקליפ הבא עם זום-אין והבזק קצר, כמו באדיט.
 * גלילה מהירה מאיצה את הקליפ. רק קליפ אחד מתנגן בכל רגע, כדי שהטלפון לא ייתקע.
 */
const CLIPS = {
  drinks: { src: '/media/bg-drinks.mp4', poster: '/media/poster-drinks.jpg' },
  sweets: { src: '/media/bg-sweets.mp4', poster: '/media/poster-sweets.jpg' },
  salty: { src: '/media/bg-salty.mp4', poster: '/media/poster-salty.jpg' },
}
const ORDER = ['drinks', 'sweets', 'salty']
const STEP = 620

const lowPower = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData === true)

export function BackgroundVideo({ base = 'drinks' }) {
  const [active, setActive] = useState(base)
  const [cut, setCut] = useState(0)
  const refs = useRef({})
  const still = useRef(lowPower()).current
  const baseIdx = Math.max(0, ORDER.indexOf(base))

  // בחירת הקליפ לפי הגלילה
  useEffect(() => {
    let raf = 0
    let lastY = window.scrollY
    let lastT = performance.now()
    let idle = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        const next = ORDER[(baseIdx + Math.floor(Math.max(0, y) / STEP)) % ORDER.length]
        setActive((cur) => (cur === next ? cur : next))
        // האצה לפי מהירות הגלילה
        const now = performance.now()
        const speed = Math.abs(y - lastY) / Math.max(16, now - lastT)
        lastY = y
        lastT = now
        const v = refs.current[next]
        if (v && !still) v.playbackRate = Math.min(2.2, 1 + speed * 0.9)
        clearTimeout(idle)
        idle = setTimeout(() => {
          if (refs.current[next]) refs.current[next].playbackRate = 1
        }, 180)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
      clearTimeout(idle)
    }
  }, [baseIdx, still])

  // מנגנים רק את הקליף הפעיל
  useEffect(() => {
    setCut((c) => c + 1)
    if (still) return
    for (const key of ORDER) {
      const v = refs.current[key]
      if (!v) continue
      if (key === active) {
        v.currentTime = 0
        v.play().catch(() => {})
        v.animate?.(
          [
            { transform: 'scale(1.24) rotate(-1.5deg)', filter: 'brightness(1.45) saturate(1.3)' },
            { transform: 'scale(1.06) rotate(0deg)', filter: 'brightness(1) saturate(1)' },
          ],
          { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
        )
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
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-ink" aria-hidden="true">
      {ORDER.map((key) => {
        const on = key === active
        const style = { opacity: on ? 1 : 0, visibility: on ? 'visible' : 'hidden' }
        return still ? (
          <img key={key} src={CLIPS[key].poster} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover" style={style} />
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
            preload={on ? 'auto' : 'metadata'}
            disablePictureInPicture
          />
        )
      })}
      {!still && <div key={`flash-${cut}`} className="bg-flash absolute inset-0 bg-white" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/55" />
    </div>
  )
}
