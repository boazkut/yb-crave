import { useMemo, useRef, useState } from 'react'
import { Sheet } from '../components/Overlays.jsx'
import { ProductArt } from '../components/ProductArt.jsx'
import { useData } from '../state/DataContext.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { isAvailable } from '../lib/shop.js'
import { ils, vibrate } from '../lib/utils.js'

const matches = (p, rule) =>
  (!rule.category || p.category === rule.category) &&
  (!rule.shape || p.art?.shape === rule.shape) &&
  (!rule.bag || p.bagEligible)

export function ComboBuilder({ productId, onClose }) {
  const { byId, products } = useData()
  const combo = byId[productId]
  const cart = useCart()
  const ui = useUI()
  const [choices, setChoices] = useState({})
  const ref = useRef(null)

  const slots = useMemo(() => {
    const pool = products.filter((p) => !p.secret && !p.comboSlots && isAvailable(p))
    return (combo?.comboSlots || []).map((s) => ({ ...s, options: pool.filter((p) => matches(p, s.pick)) }))
  }, [combo, products])

  if (!combo) return null
  const done = slots.every((_, i) => choices[i])

  const add = () => {
    cart.addCustom({
      kind: 'combo',
      productId: combo.id,
      name: combo.name,
      unitPrice: Number(combo.price),
      details: slots.map((s, i) => `${s.label}: ${byId[choices[i]]?.name}`),
      art: combo.art,
      imageUrl: combo.imageUrl || '',
    })
    ui.fly(ref.current, '#FF4FA3')
    vibrate([10, 30, 10])
    onClose()
  }

  return (
    <Sheet
      title={combo.name}
      onClose={onClose}
      footer={
        <button type="button" className="btn-lime mb-1 w-full text-[17px]" disabled={!done} onClick={add}>
          {done ? `הוסף לעגלה (${ils(combo.price)})` : `בחרו עוד ${slots.filter((_, i) => !choices[i]).length}`}
        </button>
      }
    >
      <div ref={ref} className="flex items-center gap-3">
        <ProductArt product={combo} className="h-20 w-16 shrink-0" />
        <p className="text-sm text-paper/70">{combo.blurb}</p>
      </div>
      {slots.map((s, i) => (
        <div key={i} className="mt-5">
          <h3 className="text-sm font-extrabold">
            {s.label} {choices[i] && <span className="text-lime">✓ {byId[choices[i]]?.name}</span>}
          </h3>
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {s.options.map((p) => {
              const on = choices[i] === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    vibrate(8)
                    setChoices((c) => ({ ...c, [i]: p.id }))
                  }}
                  className={`flex w-[84px] shrink-0 flex-col items-center rounded-[6px] border-2 px-1 py-1.5 ${
                    on ? 'border-lime bg-lime/10' : 'border-paper/12'
                  }`}
                >
                  <ProductArt product={p} className="h-12 w-10" />
                  <span className="mt-1 line-clamp-2 text-center text-[11px] font-bold leading-tight">{p.name}</span>
                </button>
              )
            })}
            {!s.options.length && <span className="text-sm text-paper/50">אזל כרגע</span>}
          </div>
        </div>
      ))}
    </Sheet>
  )
}
