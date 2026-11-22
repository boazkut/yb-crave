import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useData } from '../state/DataContext.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { useLocal, LS_KEYS } from '../state/useLocal.js'
import { storage } from '../services/storageService.js'
import { ProductArt } from './ProductArt.jsx'
import { effectiveStock } from '../lib/shop.js'
import { ils, vibrate } from '../lib/utils.js'

function BestSellers() {
  const { products } = useData()
  const cart = useCart()
  const ui = useUI()
  const { list, real } = useMemo(() => {
    const visible = products.filter((p) => !p.secret && effectiveStock(p) !== 'out')
    const sold = visible.filter((p) => (p.weekSold || 0) > 0).sort((a, b) => b.weekSold - a.weekSold)
    if (sold.length >= 3) return { list: sold.slice(0, 5), real: true }
    return { list: visible.filter((p) => p.tags?.includes('hit')).slice(0, 5), real: false }
  }, [products])

  return (
    <div className="rounded-[8px] border-2 border-paper/12 bg-coal-2 p-4">
      <h3 className="display text-2xl leading-none">{real ? 'הכי נמכרים השבוע' : 'הלהיטים של Y&B'}</h3>
      <p className="mt-1 text-sm text-paper/55">{real ? 'מה שכולם חוטפים בהפסקה' : 'מה שתמיד נגמר ראשון'}</p>
      <ol className="mt-4 space-y-2">
        {list.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 rounded-[6px] bg-coal px-2.5 py-2">
            <span className="display w-6 text-center text-2xl leading-none text-lime">{i + 1}</span>
            <ProductArt product={p} className="h-11 w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold">{p.name}</div>
              <div className="text-xs text-paper/55">
                {ils(p.price)}
                {real && ` | ${p.weekSold} נמכרו`}
              </div>
            </div>
            <button
              type="button"
              className="btn-lime px-2.5 py-1.5 text-sm"
              aria-label={`הוסף ${p.name}`}
              onClick={(e) => {
                if (p.comboSlots) return ui.openSheet('combo', p.id)
                cart.addProduct(p)
                ui.fly(e.currentTarget, '#B5F23A')
                vibrate(10)
              }}
            >
              +
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

function VoteBox() {
  const { settings, votes } = useData()
  const ui = useUI()
  const [voted, setVoted] = useLocal(LS_KEYS.voted, null)
  const options = settings.voteOptions || []
  const hasVoted = voted && voted.round === votes.round
  const total = options.reduce((s, o) => s + (votes.counts?.[o] || 0), 0)

  const vote = async (o) => {
    setVoted({ round: votes.round, option: o })
    vibrate(15)
    try {
      await storage.vote(o)
      ui.toast('ההצבעה נקלטה 🗳️')
    } catch {
      ui.toast('לא הצלחנו לשמור את ההצבעה, נסו שוב')
      setVoted(null)
    }
  }

  if (!options.length) return null
  return (
    <div className="rounded-[8px] border-2 border-paper/12 bg-coal-2 p-4">
      <h3 className="display text-2xl leading-none">מה יגיע שבוע הבא?</h3>
      <p className="mt-1 text-sm text-paper/55">{hasVoted ? 'ככה זה נראה כרגע' : 'אתם מחליטים. קול אחד לכל טלפון.'}</p>
      <div className="mt-4 space-y-2">
        {options.map((o) => {
          const n = votes.counts?.[o] || 0
          const pct = total ? Math.round((n / total) * 100) : 0
          const mine = hasVoted && voted.option === o
          return hasVoted ? (
            <div key={o} className="relative overflow-hidden rounded-[6px] border-2 border-paper/15 px-3 py-2.5">
              <motion.div
                className="absolute inset-y-0 right-0 bg-lime/25"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
              <div className="relative flex justify-between text-sm font-extrabold">
                <span>
                  {o} {mine && <span className="text-lime">(הקול שלך)</span>}
                </span>
                <span className="tabular-nums">{pct}%</span>
              </div>
            </div>
          ) : (
            <button
              key={o}
              type="button"
              onClick={() => vote(o)}
              className="block w-full rounded-[6px] border-2 border-paper/20 px-3 py-2.5 text-right text-sm font-extrabold transition-colors active:border-lime active:bg-lime/10"
            >
              {o}
            </button>
          )
        })}
      </div>
      {hasVoted && <p className="mt-2 text-xs text-paper/45">{total} הצבעות עד עכשיו</p>}
    </div>
  )
}

function LoyaltyCard() {
  const { settings } = useData()
  const cart = useCart()
  const ui = useUI()
  const [loyalty] = useLocal(LS_KEYS.loyalty, { punches: 0, credited: [] })
  const goal = Number(settings.loyaltyGoal) || 8
  const punches = loyalty.punches || 0
  const ready = punches >= goal

  const redeem = () => {
    if (cart.hasReward) return ui.openSheet('cart')
    cart.addCustom({
      kind: 'reward',
      name: '🎁 חמצוץ חינם (כרטיסייה)',
      unitPrice: 0,
      art: { shape: 'gummy', c1: '#B5F23A', c2: '#FF4FA3', label: 'מתנה' },
    })
    ui.toast('המתנה בעגלה. תיהנו!')
    ui.openSheet('cart')
  }

  return (
    <div className="relative overflow-hidden rounded-[8px] border-2 border-coal bg-paper p-4 text-coal shadow-[5px_5px_0_0_#B5F23A]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="display text-2xl leading-none">כרטיסיית ניקובים</h3>
          <p className="mt-1 text-sm font-medium text-coal/65">
            כל הזמנה מאושרת = ניקוב. בניקוב ה-{goal} מקבלים חמצוץ חינם.
          </p>
        </div>
        <span className="display text-3xl leading-none" aria-label={`${punches} מתוך ${goal}`}>
          {Math.min(punches, goal)}/{goal}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-8 gap-1.5" aria-hidden="true">
        {Array.from({ length: goal }).map((_, i) => {
          const done = i < punches
          return (
            <motion.div
              key={i}
              initial={false}
              animate={done ? { scale: [1.3, 1], rotate: [-20, 0] } : {}}
              className={`grid aspect-square place-items-center rounded-full border-2 border-dashed ${
                done ? 'border-solid border-coal bg-cola text-paper' : 'border-coal/35'
              }`}
            >
              <span className="text-[11px] font-black">{done ? '✕' : i + 1}</span>
            </motion.div>
          )
        })}
      </div>
      {ready ? (
        <button type="button" onClick={redeem} className="btn-red mt-4 w-full">
          {cart.hasReward ? 'המתנה כבר בעגלה' : '🎁 ממש חמצוץ חינם'}
        </button>
      ) : (
        <p className="mt-3 text-xs font-bold text-coal/55">
          עוד {goal - punches} הזמנות למתנה. הכרטיסייה שמורה בטלפון הזה.
        </p>
      )}
    </div>
  )
}

export function CommunitySection() {
  return (
    <section id="community" className="relative z-[2] mx-auto max-w-6xl px-4 pt-14">
      <div className="grid gap-5 md:grid-cols-3">
        <LoyaltyCard />
        <BestSellers />
        <VoteBox />
      </div>
    </section>
  )
}
