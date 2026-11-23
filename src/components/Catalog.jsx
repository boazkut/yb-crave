import { memo, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, PencilLine, Plus, X } from 'lucide-react'
import { ProductImage } from './ProductImage.jsx'
import { ProductArt } from './ProductArt.jsx'
import { Stepper } from './Overlays.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { useData } from '../state/DataContext.jsx'
import { INLINE_VIDEO_PROPS, guardVideo, useVideoAllowed } from '../lib/videoSafe.js'
import { activeDeals, bundleFor, bundleLabel, saleFor } from '../lib/pricing.js'
import { dealText, endsText } from '../lib/dealText.js'
import { CATEGORY_LOOK, TONES } from '../data/catalog.js'
import { LIMITED, STOCK } from '../lib/shop.js'
import { MAX_ITEMS, MAX_PER_ITEM } from '../lib/limits.js'
import { ils } from '../lib/utils.js'
import { navigate } from '../lib/router.js'

export const lookOf = (c, i = 0) => {
  const l = CATEGORY_LOOK[c.id] || {}
  return { image: l.image || '', clip: l.clip || '', tone: TONES[(l.tone ?? i) % TONES.length], video: l.video || ['drinks', 'candy', 'salty', 'sweets'][i % 4] }
}

const priceRange = (items) => {
  const prices = items.map((p) => Number(p.price)).filter((n) => !Number.isNaN(n))
  if (!prices.length) return 'בקרוב'
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  return lo === hi ? `${lo} ₪` : `${lo}–${hi} ₪`
}

/** כרטיס קטגוריה בדף הבית: תמונה, שם, תיאור, תגית מחירים וחץ */
export function CategoryCard({ category, index, products }) {
  const look = lookOf(category, index)
  const videoOk = useVideoAllowed()
  const sample = products.find((p) => p.imageV || p.imageUrl) || products[0]
  return (
    <button
      type="button"
      onClick={() => navigate(`/c/${category.id}`)}
      className="flex w-full items-center gap-3.5 rounded-[22px] bg-white p-3 text-right transition-transform active:scale-[0.985]"
    >
      <div className="h-[86px] w-[112px] shrink-0 overflow-hidden rounded-2xl bg-tile">
        {look.clip && videoOk ? (
          <video
            ref={guardVideo}
            src={look.clip}
            poster={look.image}
            className="pointer-events-none h-full w-full object-cover"
            loop
            autoPlay
            preload="metadata"
            {...INLINE_VIDEO_PROPS}
          />
        ) : look.image ? (
          <img src={look.image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : sample && (sample.imageV || sample.imageUrl) ? (
          <ProductImage product={sample} className="h-full w-full" />
        ) : category.id === 'rescue' ? (
          <div className="grid h-full w-full place-items-center" style={{ background: look.tone.bg, color: look.tone.fg }}>
            <PencilLine size={34} strokeWidth={1.6} />
          </div>
        ) : sample ? (
          <div className="grid h-full w-full place-items-center">
            <ProductArt product={sample} className="h-[80%] w-[60%]" />
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 py-1">
        <h3 className="text-[18px] font-extrabold leading-tight">{category.name}</h3>
        <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-muted">{category.desc || `${products.length} מוצרים`}</p>
        <span dir="ltr" className="mt-2 inline-block rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: look.tone.bg, color: look.tone.fg }}>
          {priceRange(products)}
        </span>
      </div>
      <ChevronLeft size={22} className="shrink-0 text-[#9A9A9A]" />
    </button>
  )
}

/** סרגל עליון בדף קטגוריה: חזרה, שם, מעבר מהיר בין קטגוריות ותקציב */
export function CategoryHeader({ categories, current, budget, setBudget }) {
  const rowRef = useRef(null)
  useEffect(() => {
    rowRef.current?.querySelector(`[data-cat="${current.id}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [current.id])

  return (
    <header className="sticky top-0 z-30 bg-white shadow-[0_1px_0_#EAEAEA]">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 pt-2.5">
        <button type="button" onClick={() => navigate('/')} className="grid h-10 w-10 place-items-center rounded-full bg-tile" aria-label="חזרה לקטגוריות">
          <ChevronRight size={20} />
        </button>
        <h1 className="flex-1 truncate text-xl font-extrabold">{current.name}</h1>
      </div>
      <nav ref={rowRef} className="no-scrollbar mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-3 pt-2.5" aria-label="קטגוריות">
        {categories.map((c) => {
          const on = c.id === current.id
          return (
            <button
              key={c.id}
              type="button"
              data-cat={c.id}
              onClick={() => !on && navigate(`/c/${c.id}`, { replace: true })}
              aria-current={on ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[14px] ${on ? 'bg-ink font-semibold text-white' : 'bg-tile font-medium text-ink'}`}
            >
              {c.name}
            </button>
          )
        })}
      </nav>
      <div className="no-scrollbar mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-3 pb-2.5 pt-2">
        <span className="shrink-0 text-[13px] text-muted">תקציב</span>
        {[5, 10, 20].map((b) => (
          <button key={b} type="button" className="chip px-3 py-1.5 text-[13px]" aria-pressed={budget === b} onClick={() => setBudget(budget === b ? null : b)}>
            עד {b} ₪
          </button>
        ))}
      </div>
    </header>
  )
}

function ProductCardBase({ product: p, canBuy = true, deals }) {
  const cart = useCart()
  const ui = useUI()
  const out = p.stock === 'out'
  const sale = out ? null : saleFor(p, deals)
  const bundle = out || sale ? null : bundleFor(p, deals)
  const qty = cart.qtyOf(p.id)
  const left = Number.isInteger(p.qty) ? p.qty : null
  const add = () => {
    // הקונים לא רואים כמה נשאר: פשוט אי אפשר להוסיף מעבר למה שיש
    if (left !== null && qty >= left) return ui.toast(LIMITED)
    if (qty >= MAX_PER_ITEM) return ui.toast(`אפשר עד ${MAX_PER_ITEM} מכל מוצר בהזמנה`)
    if (cart.count >= MAX_ITEMS) return ui.toast(`אפשר עד ${MAX_ITEMS} פריטים בהזמנה`)
    return p.comboSlots ? ui.openSheet('combo', p.id) : cart.addProduct(p)
  }

  return (
    <article className={`flex flex-col rounded-[20px] p-2 ${out ? 'bg-[#EFEFEF]' : 'bg-white'}`} aria-label={out ? `${p.name}, אזל מהמלאי` : undefined}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-tile">
        <ProductImage product={p} dim={out} className="absolute inset-0" />
        {out && (
          // סרט אלכסוני אדום (עמום, בלי זוהר) עם הכיתוב בתוכו
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-[160%] -translate-x-1/2 -translate-y-1/2 -rotate-[32deg] bg-[#B5473A] py-1.5 text-center text-[14px] font-extrabold tracking-wide text-white">
            אזל מהמלאי
          </div>
        )}
        {(sale || bundle) && (
          <span className="absolute left-2 top-2 rounded-full bg-[#FFD43B] px-2 py-0.5 text-[12px] font-extrabold text-ink">{sale ? 'מבצע' : bundleLabel(bundle, Number(p.price))}</span>
        )}
        {!out && left === null && p.stock === 'low' && (
          <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink">{STOCK.low.label}</span>
        )}
        {!out && canBuy && (
          <div className="absolute bottom-2 left-2">
            {qty > 0 && !p.comboSlots ? (
              <Stepper size="sm" dark value={qty} onDec={() => cart.decProduct(p.id)} onInc={add} />
            ) : (
              <button type="button" onClick={add} className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white active:scale-95" aria-label={`הוספת ${p.name}`}>
                <Plus size={18} strokeWidth={2.4} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-2">
        <h3 className={`line-clamp-2 text-[15px] font-medium leading-snug ${out ? 'text-muted' : ''}`}>{p.name}</h3>
        {!out && p.note && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">{p.note}</p>}
        <p className={`mt-auto pt-1.5 text-[15px] font-bold ${out ? 'text-[#A3A3A3] line-through' : ''}`}>
          <bdi>{ils(sale ? sale.price : p.price)}</bdi>
          {sale && (
            <bdi className="mr-2 text-[13px] font-medium text-muted line-through" aria-label={`במקום ${ils(p.price)}`}>
              {ils(p.price)}
            </bdi>
          )}
        </p>
      </div>
    </article>
  )
}
export const ProductCard = memo(ProductCardBase)

export function ProductGrid({ products }) {
  const { settings } = useData()
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} canBuy={settings.storeOpen} deals={settings.deals} />
      ))}
    </div>
  )
}

/** מבצעים פעילים בראש דף הבית */
export function DealsStrip() {
  const { settings, byId } = useData()
  const deals = activeDeals(settings.deals).filter((d) => d.productIds.some((id) => byId[id]))
  if (!deals.length) return null
  return (
    <section aria-label="מבצעים">
      <h2 className="px-1 pb-2 text-[20px] font-extrabold text-white [text-shadow:0_1px_10px_rgba(0,0,0,.35)]">מבצעים</h2>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {deals.map((d) => {
          const items = d.productIds.map((id) => byId[id]).filter(Boolean)
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => navigate(`/deal/${encodeURIComponent(d.id)}`)}
              className="w-[250px] shrink-0 snap-start rounded-[22px] bg-[#FFD43B] p-4 text-right text-ink active:scale-[0.985]"
            >
              <p className="text-[24px] font-extrabold leading-tight">{d.title}</p>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink/75">{items.slice(0, 3).map((p) => p.name).join(', ')}{items.length > 3 ? ` ועוד ${items.length - 3}` : ''}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex -space-x-2 space-x-reverse">
                  {items.slice(0, 3).map((p) => (
                    <ProductImage key={p.id} product={p} className="h-9 w-9 rounded-full bg-white ring-2 ring-[#FFD43B]" artClass="h-7 w-6" />
                  ))}
                </span>
                {d.endsAt ? <span className="text-[12px] font-semibold">{endsText(d.endsAt)}</span> : <ChevronLeft size={18} />}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** כותרת לדף של מבצע */
export function DealHeader({ deal }) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 px-4 pb-4 pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <button type="button" onClick={() => navigate('/')} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tile" aria-label="חזרה">
          <ChevronRight size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-extrabold leading-tight">מבצע {deal.title}</h1>
          <p className="text-[13px] text-muted">
            {dealText(deal)}
            {deal.endsAt ? ` · ${endsText(deal.endsAt)}` : ''}
          </p>
        </div>
      </div>
    </header>
  )
}

/** הודעה בולטת כשהחנות סגורה: אפשר להסתכל, אי אפשר לקנות */
export function ClosedNotice({ className = '' }) {
  const { settings } = useData()
  if (settings.storeOpen) return null
  return (
    <div className={`flex items-center gap-3 rounded-[22px] bg-white p-4 ${className}`} role="status">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger text-white">
        <X size={22} strokeWidth={2.6} />
      </span>
      <div>
        <p className="text-[17px] font-extrabold">החנות סגורה כרגע</p>
        <p className="text-[14px] text-muted">אפשר להסתכל על המוצרים, אבל אי אפשר להזמין עד שנפתח.</p>
      </div>
    </div>
  )
}

