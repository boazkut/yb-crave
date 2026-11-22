import { useMemo, useRef, useState } from 'react'
import { motion, useAnimationControls, AnimatePresence } from 'framer-motion'
import { Sheet } from '../components/Overlays.jsx'
import { ProductArt } from '../components/ProductArt.jsx'
import { useData } from '../state/DataContext.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { isAvailable } from '../lib/shop.js'
import { ils, pick, shuffle, vibrate } from '../lib/utils.js'

const SLICE_COLORS = ['#E5212B', '#B5F23A', '#FF7A1A', '#F4EAD5', '#5B7CFF', '#D9A23B', '#FF4FA3', '#33302B']
const SLICE_INK = ['#F4EAD5', '#1C1A17', '#1C1A17', '#1C1A17', '#F4EAD5', '#1C1A17', '#1C1A17', '#F4EAD5']
const N = 8

const polar = (deg, r) => {
  const a = (deg * Math.PI) / 180
  return [100 + r * Math.sin(a), 100 - r * Math.cos(a)]
}
const slicePath = (i) => {
  const [x1, y1] = polar(i * (360 / N), 96)
  const [x2, y2] = polar((i + 1) * (360 / N), 96)
  return `M100 100 L${x1} ${y1} A96 96 0 0 1 ${x2} ${y2} Z`
}

export function Roulette({ onClose }) {
  const { products } = useData()
  const cart = useCart()
  const ui = useUI()
  const controls = useAnimationControls()
  const rotation = useRef(0)
  const resultRef = useRef(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)

  const pools = useMemo(() => {
    const ok = products.filter((p) => !p.secret && !p.comboSlots && isAvailable(p))
    return {
      snacks: ok.filter((p) => p.category === 'salty' || p.category === 'choco'),
      partners: ok.filter((p) => p.category === 'drinks' || p.category === 'sour'),
    }
  }, [products])

  const makeCombos = () => {
    const snacks = shuffle(pools.snacks)
    return Array.from({ length: N }).map((_, i) => ({ snack: snacks[i % snacks.length], partner: pick(pools.partners) }))
  }
  const [combos, setCombos] = useState(makeCombos)
  const canSpin = pools.snacks.length > 0 && pools.partners.length > 0

  const spin = async () => {
    if (spinning || !canSpin) return
    let current = combos
    if (result) {
      current = makeCombos()
      setCombos(current)
    }
    setResult(null)
    setSpinning(true)
    vibrate(15)
    const idx = Math.floor(Math.random() * N)
    const center = idx * (360 / N) + 360 / N / 2
    const desired = (360 - center + 360) % 360
    const delta = (desired - (rotation.current % 360) + 360) % 360
    const target = rotation.current + 360 * 6 + delta + (Math.random() * 14 - 7)
    rotation.current = target
    await controls.start({ rotate: target, transition: { duration: 3.4, ease: [0.12, 0.7, 0.12, 1] } })
    vibrate([20, 40, 30])
    setResult(current[idx])
    setSpinning(false)
  }

  const addBoth = () => {
    cart.addProduct(result.snack)
    cart.addProduct(result.partner)
    ui.fly(resultRef.current, '#FF4FA3')
    ui.toast('הגורל החליט. בתיאבון!')
    onClose()
  }

  return (
    <Sheet title="אין לי מושג מה בא לי" onClose={onClose}>
      <p className="text-sm text-paper/60">מסובבים, והגלגל בוחר לכם חטיף + שתייה או חמצוץ, רק ממה שיש עכשיו במלאי.</p>

      <div className="relative mx-auto mt-5 aspect-square w-full max-w-[300px]">
        {/* מחוג */}
        <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2">
          <svg width="34" height="40" viewBox="0 0 34 40">
            <path d="M17 38 L3 6 Q17 -2 31 6 Z" fill="#F4EAD5" stroke="#1C1A17" strokeWidth="3" />
          </svg>
        </div>
        <motion.svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-[0_14px_24px_rgba(0,0,0,.6)]" animate={controls} style={{ rotate: 0 }}>
          <circle cx="100" cy="100" r="99" fill="#1C1A17" />
          {combos.map((c, i) => {
            const mid = i * (360 / N) + 360 / N / 2
            const [tx, ty] = polar(mid, 64)
            return (
              <g key={i}>
                <path d={slicePath(i)} fill={SLICE_COLORS[i]} stroke="#1C1A17" strokeWidth="2" />
                <g transform={`rotate(${mid} ${tx} ${ty})`}>
                  <text x={tx} y={ty - 6} textAnchor="middle" dominantBaseline="central" fontSize="15">
                    {c.snack?.category === 'choco' ? '🍫' : '🥨'}
                    {c.partner?.category === 'drinks' ? '🥤' : '🍋'}
                  </text>
                  <text
                    x={tx}
                    y={ty + 11}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="'Secular One'"
                    fontSize="8.5"
                    fill={SLICE_INK[i]}
                  >
                    {String(c.snack?.art?.label || c.snack?.name || '').slice(0, 10)}
                  </text>
                </g>
              </g>
            )
          })}
          <circle cx="100" cy="100" r="18" fill="#F4EAD5" stroke="#1C1A17" strokeWidth="3" />
          <text x="100" y="101" textAnchor="middle" dominantBaseline="central" fontFamily="'Secular One'" fontSize="11" fill="#E5212B">
            Y&amp;B
          </text>
        </motion.svg>
      </div>

      <div className="mt-5">
        {!canSpin ? (
          <p className="text-center text-sm text-paper/60">כרגע אין מספיק מוצרים במלאי בשביל הגלגל.</p>
        ) : (
          <button type="button" onClick={spin} disabled={spinning} className="btn-paper w-full text-[17px]">
            {spinning ? 'מסתובב...' : result ? 'עוד סיבוב' : 'סובב את הגלגל'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-[8px] border-2 border-coal bg-paper p-4 text-coal shadow-[5px_5px_0_0_#FF4FA3]"
          >
            <p className="display text-xl leading-none">הגלגל אמר:</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              {[result.snack, result.partner].map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  {i === 1 && <span className="display text-3xl">+</span>}
                  <div className="flex w-[110px] flex-col items-center text-center">
                    <ProductArt product={p} className="h-20 w-16" />
                    <span className="mt-1 text-sm font-extrabold leading-tight">{p.name}</span>
                    <span className="text-xs font-bold text-coal/60">{ils(p.price)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addBoth} className="btn-red mt-4 w-full text-[17px]">
              יאללה, תוסיף לעגלה ({ils(Number(result.snack.price) + Number(result.partner.price))})
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  )
}
