import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sheet } from '../components/Overlays.jsx'
import { ProductArt } from '../components/ProductArt.jsx'
import { useData } from '../state/DataContext.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { isAvailable } from '../lib/shop.js'
import { vibrate } from '../lib/utils.js'

export const BAG_SIZES = [
  { price: 5, max: 4, name: 'קטנה', note: 'עד 4 סוגים' },
  { price: 10, max: 5, name: 'בינונית', note: 'עד 5 סוגים' },
  { price: 15, max: 6, name: 'ענקית', note: 'עד 6 סוגים' },
]

export function BagBuilder({ onClose }) {
  const { products } = useData()
  const cart = useCart()
  const ui = useUI()
  const [size, setSize] = useState(BAG_SIZES[1])
  const [picked, setPicked] = useState([])
  const bagRef = useRef(null)

  const options = useMemo(() => products.filter((p) => p.bagEligible && !p.secret && isAvailable(p)), [products])
  const pickedProducts = picked.map((id) => options.find((p) => p.id === id)).filter(Boolean)

  const changeSize = (s) => {
    setSize(s)
    setPicked((ps) => ps.slice(0, s.max))
  }

  const toggle = (id) => {
    vibrate(8)
    setPicked((ps) => {
      if (ps.includes(id)) return ps.filter((x) => x !== id)
      if (ps.length >= size.max) {
        ui.toast(`בשקית ${size.name} נכנסים עד ${size.max} סוגים`)
        return ps
      }
      return [...ps, id]
    })
  }

  const add = () => {
    cart.addCustom({
      kind: 'bag',
      name: `שקית חמצוצים ${size.name}`,
      unitPrice: size.price,
      details: pickedProducts.map((p) => p.name),
      art: { shape: 'gummy', c1: '#B5F23A', c2: '#FF4FA3', label: `${size.price} ₪` },
    })
    ui.fly(bagRef.current, '#B5F23A')
    vibrate([10, 30, 10])
    onClose()
  }

  return (
    <Sheet
      title="הרכב שקית חמצוצים"
      onClose={onClose}
      footer={
        <button type="button" className="btn-lime mb-1 w-full text-[17px]" disabled={!picked.length} onClick={add}>
          {picked.length ? `הוסף את השקית לעגלה (${size.price} ₪)` : 'בחרו לפחות סוג אחד'}
        </button>
      }
    >
      <p className="text-sm text-paper/60">בוחרים גודל, מקליקים על מה שבא לכם, ואנחנו מערבבים לכם הכל לשקית אחת.</p>

      <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="גודל שקית">
        {BAG_SIZES.map((s) => {
          const on = s.price === size.price
          return (
            <button
              key={s.price}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => changeSize(s)}
              className={`rounded-[6px] border-2 px-2 py-3 text-center transition-colors ${
                on ? 'border-coal bg-lime text-coal shadow-[3px_3px_0_0_#0E0D0B]' : 'border-paper/20'
              }`}
            >
              <span className="display block text-2xl leading-none">{s.price} ₪</span>
              <span className="mt-1 block text-xs font-bold opacity-75">
                {s.name}, {s.note}
              </span>
            </button>
          )
        })}
      </div>

      {/* השקית שמתמלאת */}
      <div ref={bagRef} className="relative mx-auto mt-6 h-[150px] w-[210px]">
        <svg viewBox="0 0 210 150" className="absolute inset-0 h-full w-full">
          <path d="M18 36 L192 36 L182 146 L28 146 Z" fill="#C9A26B" stroke="#1C1A17" strokeWidth="3" />
          <path d="M18 36 L30 14 L180 14 L192 36 Z" fill="#B08852" stroke="#1C1A17" strokeWidth="3" />
          <rect x="70" y="24" width="70" height="20" fill="#F4EAD5" stroke="#1C1A17" strokeWidth="2" transform="rotate(-4 105 34)" />
          <text x="105" y="36" textAnchor="middle" dominantBaseline="central" fontFamily="'Secular One'" fontSize="13" fill="#1C1A17" transform="rotate(-4 105 34)">
            {picked.length}/{size.max}
          </text>
        </svg>
        <div className="absolute inset-x-8 bottom-3 top-14 flex flex-wrap content-end items-end justify-center gap-0.5">
          <AnimatePresence>
            {pickedProducts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ y: -90, opacity: 0, rotate: -30 }}
                animate={{ y: 0, opacity: 1, rotate: (i % 2 ? 1 : -1) * 12 }}
                exit={{ y: -40, opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                className="h-[44px] w-[38px]"
              >
                <ProductArt product={p} className="h-full w-full" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-extrabold text-paper/70">מה נכנס לשקית?</h3>
      <div className="mt-2 grid grid-cols-3 gap-2 pb-2">
        {options.map((p) => {
          const on = picked.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              aria-pressed={on}
              className={`relative flex flex-col items-center rounded-[6px] border-2 px-1 pb-2 pt-1.5 transition-colors ${
                on ? 'border-lime bg-lime/10' : 'border-paper/12'
              }`}
            >
              {on && (
                <span className="absolute -left-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-coal bg-lime text-xs font-black text-coal">
                  ✓
                </span>
              )}
              <ProductArt product={p} className="h-14 w-12" />
              <span className="mt-1 line-clamp-2 text-center text-xs font-bold leading-tight">{p.name}</span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
