import { motion } from 'framer-motion'
import { StatusBadge } from './StatusBadge.jsx'
import { useUI } from '../state/UIContext.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useData } from '../state/DataContext.jsx'
import { useLocal, LS_KEYS } from '../state/useLocal.js'
import { isAvailable } from '../lib/shop.js'

export function Hero() {
  const ui = useUI()
  const cart = useCart()
  const { byId } = useData()
  const [lastOrder] = useLocal(LS_KEYS.lastOrder, null)

  const reorder = () => {
    const usable = (lastOrder?.lines || []).filter((l) => !l.productId || isAvailable(byId[l.productId]))
    const missing = (lastOrder?.lines.length || 0) - usable.length
    if (!usable.length) return ui.toast('כל מה שהזמנת בפעם הקודמת אזל כרגע 😬')
    const fresh = usable.map((l) => (l.productId && byId[l.productId] ? { ...l, unitPrice: Number(byId[l.productId].price) } : l))
    if (cart.lines.length) fresh.forEach((l) => cart.addCustom(l))
    else cart.replaceAll(fresh)
    ui.toast(missing ? `הרגיל שלך בעגלה (בלי ${missing} שאזלו)` : 'הרגיל שלך בעגלה ✓')
    ui.openSheet('cart')
  }

  return (
    <section className="relative z-[2] mx-auto max-w-6xl px-4 pb-6 pt-8 sm:pt-14">
      <div className="max-w-[34rem]">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          className="display text-[clamp(3.1rem,15vw,6.6rem)] leading-[0.92] text-paper"
        >
          צנח הסוכר?
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, rotate: 0, scale: 0.9 }}
          animate={{ opacity: 1, rotate: -3, scale: 1 }}
          transition={{ delay: 0.18, type: 'spring', stiffness: 260, damping: 16 }}
          className="mt-2 inline-block origin-right border-[3px] border-coal bg-cola px-3 pb-2 pt-1 shadow-[6px_6px_0_0_#0E0D0B]"
        >
          <span className="display block text-[clamp(2.5rem,12vw,5.2rem)] leading-[0.95] text-paper">אנחנו בדרך.</span>
        </motion.div>

        <p className="mt-6 max-w-[26rem] text-[17px] font-medium leading-relaxed text-paper/80">
          מזמינים מהטלפון, משלמים בביט, פייבוקס או מזומן, ומקבלים בהפסקה. בלי תור בקיוסק.
        </p>

        <div className="mt-5 inline-block">
          <StatusBadge />
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <a href="#cat-salty" className="btn-lime text-[17px]">
            לתפריט
          </a>
          <button type="button" onClick={() => ui.openSheet('roulette')} className="btn-paper">
            🎡 אין לי מושג מה בא לי
          </button>
          <button type="button" onClick={() => ui.openSheet('bag')} className="btn-ghost">
            🍋 הרכב שקית חמצוצים
          </button>
          {lastOrder?.lines?.length > 0 && (
            <button type="button" onClick={reorder} className="btn-ghost">
              ↻ הזמן שוב את הרגיל שלי
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
