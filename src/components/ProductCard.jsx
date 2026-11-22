import { memo, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ProductArt } from './ProductArt.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { useLocal, LS_KEYS } from '../state/useLocal.js'
import { storage } from '../services/storageService.js'
import { effectiveStock, STOCK } from '../lib/shop.js'
import { ils, vibrate } from '../lib/utils.js'
import { alpha } from '../lib/color.js'
import { TAGS } from '../data/catalog.js'

const TAG_EMOJI = Object.fromEntries(TAGS.map((t) => [t.id, t]))

function ProductCardBase({ product: p, accent }) {
  const cart = useCart()
  const ui = useUI()
  const [notifyList, setNotifyList] = useLocal(LS_KEYS.notify, [])
  const artRef = useRef(null)
  const cardRef = useRef(null)
  const stock = effectiveStock(p)
  const out = stock === 'out'
  const inCart = cart.qtyOf(p.id)
  const glow = p.art?.c1 === 'rainbow' ? '#FF4FA3' : p.art?.c1 || accent

  // הטיה תלת-ממדית
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 220, damping: 18 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 220, damping: 18 })
  const artY = useSpring(useTransform(my, [-0.5, 0.5], [-6, 4]), { stiffness: 220, damping: 18 })

  const onMove = (e) => {
    const r = cardRef.current.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const reset = () => {
    mx.set(0)
    my.set(0)
  }

  const add = () => {
    if (p.comboSlots) return ui.openSheet('combo', p.id)
    cart.addProduct(p)
    ui.fly(artRef.current, glow)
    vibrate(10)
    if (p.deposit) ui.toast(`נוסף + פיקדון ${p.deposit} ₪ שחוזר אליך`)
  }
  const dec = () => {
    const line = cart.lines.find((l) => l.kind === 'product' && l.productId === p.id)
    if (line) cart.setQty(line.key, line.qty - 1)
  }
  const subscribed = notifyList.includes(p.id)
  const notify = async () => {
    if (subscribed) return
    setNotifyList((l) => [...l, p.id])
    ui.toast('סגור. נודיע לך כשזה חוזר 🔔')
    try {
      await storage.notifyMe(p.id)
    } catch {
      /* המונה לא קריטי ללקוח */
    }
  }

  return (
    <motion.article
      ref={cardRef}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerUp={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
      whileTap={{ scale: 0.98 }}
      className="relative pt-9 [touch-action:pan-y]"
    >
      <div
        className="relative flex h-full flex-col rounded-[6px] border-2 border-paper/10 bg-coal-2 px-3 pb-3 pt-[76px] sm:pt-[92px]"
        style={{ boxShadow: `4px 4px 0 0 ${alpha(accent, out ? 0.25 : 0.9)}` }}
      >
        {/* תאורת רקע בצבע העטיפה */}
        <div
          className="pointer-events-none absolute inset-x-2 top-0 h-28 rounded-full blur-2xl"
          style={{ background: `radial-gradient(closest-side, ${alpha(glow, out ? 0.12 : 0.45)}, transparent)` }}
        />

        <motion.div
          ref={artRef}
          style={{ y: artY }}
          className="absolute inset-x-0 -top-9 mx-auto flex h-[112px] w-[96px] items-end justify-center sm:h-[132px] sm:w-[112px]"
        >
          <ProductArt product={p} dim={out} className="h-full w-full drop-shadow-[0_12px_14px_rgba(0,0,0,.55)]" />
        </motion.div>

        {stock !== 'in' && (
          <span
            className="sticker absolute -right-2 top-3 rotate-[8deg]"
            style={{ background: STOCK[stock].color, color: stock === 'out' ? '#F4EAD5' : '#1C1A17' }}
          >
            {STOCK[stock].label}
          </span>
        )}
        {p.compareAt > 0 && (
          <span className="sticker absolute -left-2 top-3 -rotate-[8deg] bg-choco">-{Math.round((1 - p.price / p.compareAt) * 100)}%</span>
        )}

        <div className="relative flex min-h-[18px] gap-1 text-[13px]" aria-label="תגיות">
          {(p.tags || [])
            .filter((t) => TAG_EMOJI[t] && t !== 'parve')
            .slice(0, 4)
            .map((t) => (
              <span key={t} title={TAG_EMOJI[t].label}>
                {TAG_EMOJI[t].emoji}
              </span>
            ))}
          {p.tags?.includes('parve') && <span className="text-[11px] font-bold leading-[18px] text-paper/50">פרווה</span>}
        </div>

        <h3 className="relative mt-1 line-clamp-2 min-h-[2.5em] text-[15px] font-extrabold leading-[1.25]">{p.name}</h3>
        {p.blurb && <p className="relative mt-1 line-clamp-2 text-xs leading-snug text-paper/55">{p.blurb}</p>}

        <div className="relative mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="leading-none">
            {p.compareAt > 0 && <div className="mb-1 text-xs text-paper/40 line-through">{ils(p.compareAt)}</div>}
            <span className="display text-[22px] leading-none" style={{ color: out ? '#F4EAD580' : '#F4EAD5' }}>
              {ils(p.price)}
            </span>
          </div>

          {out ? (
            <button
              type="button"
              onClick={notify}
              className={`rounded-[6px] border-2 px-2 py-1.5 text-[11px] font-extrabold leading-tight ${
                subscribed ? 'border-lime/50 text-lime' : 'border-paper/30 text-paper'
              }`}
            >
              {subscribed ? 'נודיע לך ✓' : 'תודיעו לי כשחוזר'}
            </button>
          ) : inCart > 0 && !p.comboSlots ? (
            <div className="flex items-center overflow-hidden rounded-[6px] border-2 border-coal bg-lime text-coal shadow-hard-sm [--tw-shadow-color:#0E0D0B]">
              <button type="button" onClick={dec} className="h-9 w-8 text-xl font-black" aria-label={`הורד ${p.name}`}>
                −
              </button>
              <span className="min-w-[20px] text-center font-black tabular-nums">{inCart}</span>
              <button type="button" onClick={add} className="h-9 w-8 text-xl font-black" aria-label={`הוסף ${p.name}`}>
                +
              </button>
            </div>
          ) : (
            <button type="button" onClick={add} className="btn-lime px-3 py-2 text-sm" aria-label={`הוסף ${p.name} לעגלה`}>
              {p.comboSlots ? 'הרכב' : '+ הוסף'}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  )
}

export const ProductCard = memo(ProductCardBase)
