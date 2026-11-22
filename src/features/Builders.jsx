import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { Sheet } from '../components/Overlays.jsx'
import { ProductArt } from '../components/ProductArt.jsx'
import { useData } from '../state/DataContext.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { isAvailable } from '../lib/shop.js'
import { ils } from '../lib/utils.js'

const BAG_SIZES = [
  { price: 5, max: 3, name: 'שקית קטנה' },
  { price: 10, max: 5, name: 'שקית גדולה' },
]

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
      <div className="grid aspect-square w-full place-items-center rounded-xl bg-tile">
        <ProductArt product={product} className="h-[78%] w-[78%]" />
      </div>
      <span className="mt-1.5 line-clamp-2 text-[12px] font-medium leading-tight">{product.name}</span>
    </button>
  )
}

export function BagBuilder({ onClose }) {
  const { products } = useData()
  const cart = useCart()
  const ui = useUI()
  const [size, setSize] = useState(BAG_SIZES[0])
  const [picked, setPicked] = useState([])
  const options = useMemo(() => products.filter((p) => p.bagEligible && isAvailable(p)), [products])

  const toggle = (id) =>
    setPicked((ps) => {
      if (ps.includes(id)) return ps.filter((x) => x !== id)
      if (ps.length >= size.max) {
        ui.toast(`ב${size.name} נכנסים עד ${size.max} סוגים`)
        return ps
      }
      return [...ps, id]
    })

  const add = () => {
    cart.addCustom({
      kind: 'bag',
      name: `שקית חמצוצים ${size.price} ₪`,
      unitPrice: size.price,
      details: picked.map((id) => options.find((p) => p.id === id)?.name).filter(Boolean),
      art: { shape: 'gummy', c1: '#E5212B', c2: '#7CCB2B', label: `${size.price} ₪` },
    })
    ui.toast('השקית נוספה להזמנה')
    onClose()
  }

  return (
    <Sheet
      title="הרכב שקית חמצוצים"
      onClose={onClose}
      footer={
        <button type="button" className="btn-primary mb-1 w-full" disabled={!picked.length} onClick={add}>
          {picked.length ? `הוספה להזמנה, ${ils(size.price)}` : 'בחרו לפחות סוג אחד'}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="גודל השקית">
        {BAG_SIZES.map((s) => {
          const on = s.price === size.price
          return (
            <button
              key={s.price}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setSize(s)
                setPicked((ps) => ps.slice(0, s.max))
              }}
              className={`rounded-2xl border p-3 text-right ${on ? 'border-ink ring-1 ring-ink' : 'border-line'}`}
            >
              <span className="block text-lg font-bold">{ils(s.price)}</span>
              <span className="block text-[13px] text-muted">
                {s.name}, עד {s.max} סוגים
              </span>
            </button>
          )
        })}
      </div>
      <div className="mb-2 mt-5 flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold">מה לערבב?</h3>
        <span className="text-[13px] text-muted">
          נבחרו {picked.length} מתוך {size.max}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((p) => (
          <PickTile key={p.id} product={p} selected={picked.includes(p.id)} onClick={() => toggle(p.id)} />
        ))}
      </div>
    </Sheet>
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
