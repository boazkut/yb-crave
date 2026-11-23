import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { Sheet } from '../components/Overlays.jsx'
import { ProductImage } from '../components/ProductImage.jsx'
import { useData } from '../state/DataContext.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { isAvailable } from '../lib/shop.js'
import { ils } from '../lib/utils.js'

function PickTile({ product, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex flex-col items-center rounded-2xl border bg-white p-2 text-center transition-colors ${
        selected ? 'border-ink ring-1 ring-ink' : 'border-line'
      }`}
    >
      {selected && (
        <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-white">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      <ProductImage product={product} className="aspect-square w-full rounded-xl bg-tile" />
      <span className="mt-1.5 line-clamp-2 text-[12px] font-medium leading-tight">{product.name}</span>
    </button>
  )
}

const matches = (p, rule) =>
  (!rule.category || p.category === rule.category) && (!rule.shape || p.art?.shape === rule.shape) && (!rule.bag || p.bagEligible)

export function ComboBuilder({ productId, onClose }) {
  const { byId, products } = useData()
  const combo = byId[productId]
  const cart = useCart()
  const ui = useUI()
  const [choices, setChoices] = useState({})

  const slots = useMemo(() => {
    const pool = products.filter((p) => !p.comboSlots && isAvailable(p))
    return (combo?.comboSlots || []).map((s) => ({ ...s, options: pool.filter((p) => matches(p, s.pick)) }))
  }, [combo, products])

  if (!combo) return null
  const missing = slots.filter((_, i) => !choices[i]).length

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
    ui.toast('הקומבו נוסף להזמנה')
    onClose()
  }

  return (
    <Sheet
      title={combo.name}
      onClose={onClose}
      footer={
        <button type="button" className="btn-primary mb-1 w-full" disabled={missing > 0} onClick={add}>
          {missing ? `נשאר לבחור ${missing}` : `הוספה להזמנה, ${ils(combo.price)}`}
        </button>
      }
    >
      {combo.note && <p className="text-sm text-muted">{combo.note}</p>}
      {slots.map((s, i) => (
        <div key={i} className="mt-5">
          <h3 className="mb-2 text-[15px] font-semibold">
            {s.label}
            {choices[i] && <span className="font-normal text-muted">: {byId[choices[i]]?.name}</span>}
          </h3>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {s.options.map((p) => (
              <div key={p.id} className="w-[92px] shrink-0">
                <PickTile product={p} selected={choices[i] === p.id} onClick={() => setChoices((c) => ({ ...c, [i]: p.id }))} />
              </div>
            ))}
            {!s.options.length && <p className="text-sm text-muted">אין כרגע במלאי</p>}
          </div>
        </div>
      ))}
    </Sheet>
  )
}
