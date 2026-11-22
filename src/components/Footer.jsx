import { useRef } from 'react'
import { useData } from '../state/DataContext.jsx'
import { navigate } from '../lib/router.js'

export function Footer() {
  const { settings } = useData()
  const timer = useRef(null)
  const startPress = () => {
    timer.current = setTimeout(() => navigate('/admin'), 900)
  }
  const endPress = () => clearTimeout(timer.current)

  return (
    <footer className="relative z-[2] mx-auto mt-16 max-w-6xl px-4 pb-40">
      <div className="border-t-2 border-paper/10 pt-6">
        <p className="display text-3xl leading-tight">צנח הסוכר? אנחנו בדרך.</p>
        <p className="mt-2 text-sm text-paper/55">
          Y&amp;B CRAVE — החנות של התלמידים, בניהול Y ו-B. חלוקה בהפסקות {settings.breaks?.join(', ')}.
        </p>
        <div className="mt-6 flex items-center justify-between text-xs text-paper/40">
          <span
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onContextMenu={(e) => e.preventDefault()}
            className="select-none"
          >
            © {new Date().getFullYear()} Y&amp;B
          </span>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            aria-label="כניסת צוות"
            className="h-8 w-8 rounded-full text-paper/15 transition-colors hover:text-paper/50"
          >
            ●
          </button>
        </div>
      </div>
    </footer>
  )
}
