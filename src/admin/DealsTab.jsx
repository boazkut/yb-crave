import { useMemo, useState } from 'react'
import { Check, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { storage } from '../services/storageService.js'
import { useData } from '../state/DataContext.jsx'
import { ProductImage } from '../components/ProductImage.jsx'
import { bundleLabel, isDealActive } from '../lib/pricing.js'
import { dealText, endsText } from '../lib/dealText.js'
import { ils, uid } from '../lib/utils.js'
import { Section, Segmented, Toggle, useToast } from './ui.jsx'

/** datetime-local ↔ זמן */
const toLocalInput = (ms) => {
  if (!ms) return ''
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const endOfToday = () => {
  const d = new Date()
  d.setHours(23, 59, 0, 0)
  return d.getTime()
}

function suggestTitle(type, qty, price, items) {
  if (!price) return ''
  if (type === 'bundle') {
    const same = items.length && items.every((p) => Number(p.price) === Number(items[0].price))
    return bundleLabel({ qty, price }, same ? Number(items[0].price) : 0)
  }
  return items.length === 1 ? `${items[0].name} ב-${price} ₪` : `ב-${price} ₪ ליחידה`
}

function DealEditor({ initial, onDone }) {
  const toast = useToast()
  const { products, categories, settings } = useData()
  const [type, setType] = useState(initial?.type || 'bundle')
  const [qty, setQty] = useState(initial?.qty || 3)
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [picked, setPicked] = useState(initial?.productIds || [])
  const [title, setTitle] = useState(initial?.title || '')
  const [titleTouched, setTitleTouched] = useState(Boolean(initial))
  const [hasEnd, setHasEnd] = useState(Boolean(initial?.endsAt))
  const [endsAt, setEndsAt] = useState(initial?.endsAt || endOfToday())
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products])
  const items = picked.map((id) => byId[id]).filter(Boolean)
  const n = Number(price)
  const autoTitle = suggestTitle(type, qty, n, items)
  const shownTitle = titleTouched ? title : autoTitle

  // מוצרים שכבר במבצע אחר פעיל
  const inOther = useMemo(() => {
    const m = {}
    for (const d of settings.deals || []) if (d.id !== initial?.id && isDealActive(d)) for (const id of d.productIds) m[id] = d.title
    return m
  }, [settings.deals, initial?.id])

  const list = products.filter((p) => (cat === 'all' || p.category === cat) && (!q.trim() || p.name.includes(q.trim())))
  const toggle = (id) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const allShown = list.length > 0 && list.every((p) => picked.includes(p.id))

  const save = async () => {
    setErr('')
    if (!items.length) return setErr('בוחרים לפחות מוצר אחד')
    if (!(n > 0)) return setErr('צריך מחיר')
    if (type === 'price' && items.every((p) => n >= Number(p.price))) return setErr('מחיר המבצע צריך להיות נמוך מהמחיר הרגיל')
    if (type === 'bundle') {
      const cheapest = Math.min(...items.map((p) => Number(p.price)))
      if (n >= cheapest * qty) return setErr(`${qty} מהמוצרים האלה עולים כבר ${cheapest * qty} ₪ או פחות. בחרו מחיר נמוך יותר.`)
    }
    if (hasEnd && endsAt <= Date.now()) return setErr('תאריך הסיום כבר עבר')
    const deal = {
      id: initial?.id || uid('d-'),
      title: (shownTitle || 'מבצע').trim(),
      type,
      productIds: items.map((p) => p.id),
      price: n,
      qty: type === 'bundle' ? qty : 1,
      active: initial ? initial.active !== false : true,
      endsAt: hasEnd ? endsAt : null,
      createdAt: initial?.createdAt || Date.now(),
    }
    const others = (settings.deals || []).filter((d) => d.id !== deal.id)
    setBusy(true)
    try {
      await storage.updateSettings({ deals: [deal, ...others] })
      toast(initial ? 'המבצע עודכן' : 'המבצע עלה לחנות')
      onDone()
    } catch (e) {
      setErr(e.message || 'השמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title={initial ? 'עריכת מבצע' : 'מבצע חדש'} className="border-ink">
      <div className="space-y-4">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: 'bundle', label: 'כמות במחיר' },
            { value: 'price', label: 'מחיר מבצע' },
          ]}
        />
        <p className="-mt-2 text-[13px] text-muted">
          {type === 'bundle' ? 'למשל 3 חטיפים ב-10 ₪, או 1+1. הלקוח יכול לערבב בין המוצרים שבחרתם.' : 'כל מוצר שבחרתם נמכר במחיר המבצע במקום המחיר הרגיל.'}
        </p>

        <div className="flex items-end gap-3">
          {type === 'bundle' && (
            <div className="w-28">
              <label className="label" htmlFor="d-qty">
                כמה מוצרים
              </label>
              <div className="flex items-center rounded-xl border border-line">
                <button type="button" className="h-11 w-10 text-xl" onClick={() => setQty((x) => Math.max(2, x - 1))} aria-label="פחות">
                  −
                </button>
                <span id="d-qty" className="flex-1 text-center text-lg font-bold tabular-nums">
                  {qty}
                </span>
                <button type="button" className="h-11 w-10 text-xl" onClick={() => setQty((x) => Math.min(10, x + 1))} aria-label="יותר">
                  +
                </button>
              </div>
            </div>
          )}
          <div className="flex-1">
            <label className="label" htmlFor="d-price">
              {type === 'bundle' ? 'ביחד במחיר' : 'מחיר מבצע ליחידה'}
            </label>
            <div className="relative">
              <input id="d-price" type="number" inputMode="decimal" step="0.5" className="field pl-8 text-lg font-bold" value={price} onChange={(e) => setPrice(e.target.value)} />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₪</span>
            </div>
          </div>
        </div>

        <div>
          <p className="label">מוצרים במבצע {items.length > 0 && <span className="font-normal text-muted">({items.length} נבחרו)</span>}</p>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="field pr-9" placeholder="חיפוש מוצר" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[{ id: 'all', name: 'הכל' }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium ${cat === c.id ? 'bg-ink text-white' : 'bg-tile'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-1 text-[13px] font-semibold underline underline-offset-2"
            onClick={() => setPicked((s) => (allShown ? s.filter((id) => !list.some((p) => p.id === id)) : [...new Set([...s, ...list.map((p) => p.id)])]))}
          >
            {allShown ? 'ביטול הבחירה של כל אלה' : `בחירת כל ה-${list.length} שמוצגים`}
          </button>
          <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {list.map((p) => {
              const on = picked.includes(p.id)
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => toggle(p.id)} className={`flex w-full items-center gap-3 px-3 py-2 text-right ${on ? 'bg-[#FFF8DB]' : ''}`} aria-pressed={on}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-ink bg-ink text-white' : 'border-[#C9C9C9]'}`}>
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                    <ProductImage product={p} className="h-10 w-10 shrink-0 rounded-lg bg-tile" artClass="h-8 w-7" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{p.name}</span>
                      {inOther[p.id] && <span className="block text-[11px] text-[#9A5B00]">כבר במבצע: {inOther[p.id]}</span>}
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold">{ils(p.price)}</span>
                  </button>
                </li>
              )
            })}
            {!list.length && <li className="px-3 py-4 text-center text-sm text-muted">אין מוצרים כאן</li>}
          </ul>
        </div>

        <div>
          <label className="label" htmlFor="d-title">
            שם המבצע (מה הלקוחות רואים)
          </label>
          <input
            id="d-title"
            className="field font-semibold"
            value={shownTitle}
            placeholder="למשל: 3 ב-10 ₪"
            maxLength={40}
            onChange={(e) => {
              setTitleTouched(true)
              setTitle(e.target.value)
            }}
          />
        </div>

        <div>
          <p className="label">עד מתי</p>
          <Segmented
            size="sm"
            value={hasEnd ? 'end' : 'none'}
            onChange={(v) => setHasEnd(v === 'end')}
            options={[
              { value: 'none', label: 'עד שמכבים' },
              { value: 'end', label: 'עד תאריך' },
            ]}
          />
          {hasEnd && (
            <input type="datetime-local" className="field mt-2" value={toLocalInput(endsAt)} onChange={(e) => e.target.value && setEndsAt(new Date(e.target.value).getTime())} />
          )}
        </div>

        {err && <p className="error">{err}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onDone} className="btn-secondary py-3">
            ביטול
          </button>
          <button type="button" onClick={save} disabled={busy} className="btn-primary py-3">
            {busy ? 'שומרים...' : initial ? 'שמירה' : 'העלאת המבצע'}
          </button>
        </div>
      </div>
    </Section>
  )
}

export function DealsTab() {
  const toast = useToast()
  const { settings, byId } = useData()
  const [editing, setEditing] = useState(null) // null | 'new' | deal
  const deals = settings.deals || []
  const now = Date.now()

  const saveAll = (list, msg) =>
    storage
      .updateSettings({ deals: list })
      .then(() => toast(msg))
      .catch((e) => toast(e.message || 'השמירה נכשלה'))

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold leading-none">מבצעים</h1>
          <p className="mt-1 text-[13px] text-muted">המבצעים מופיעים בראש החנות, ליד המוצרים ובעגלה. המחיר נבדק בשרת.</p>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing('new')} className="btn-primary shrink-0 px-4 py-2.5">
            <Plus size={17} /> מבצע חדש
          </button>
        )}
      </div>

      {editing && <DealEditor key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}

      {!deals.length && !editing && (
        <div className="card px-4 py-10 text-center">
          <p className="text-lg font-bold">אין מבצעים עדיין</p>
          <p className="mt-1 text-sm text-muted">לוחצים "מבצע חדש", בוחרים מוצרים ומחיר, וזה עולה לחנות מיד.</p>
        </div>
      )}

      {deals.map((d) => {
        const ended = d.endsAt && d.endsAt <= now
        const live = isDealActive(d, now)
        const names = d.productIds.map((id) => byId[id]?.name).filter(Boolean)
        return (
          <section key={d.id} className={`card p-4 ${live ? '' : 'opacity-70'}`}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[20px] font-extrabold leading-tight">{d.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${live ? 'bg-[#FFD43B] text-ink' : 'bg-tile text-muted'}`}>
                    {live ? 'פעיל' : ended ? 'הסתיים' : 'מושהה'}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-muted">{dealText(d)}</p>
                <p className="mt-1 line-clamp-2 text-[13px]">{names.length ? names.join(', ') : 'המוצרים של המבצע נמחקו'}</p>
                {d.endsAt && <p className="mt-1 text-[12px] font-semibold text-muted">{ended ? 'הסתיים' : endsText(d.endsAt, now)}</p>}
              </div>
              <Toggle
                checked={d.active !== false && !ended}
                label={`מבצע ${d.title} פעיל`}
                onChange={(v) => {
                  if (v && ended) {
                    setEditing(d)
                    return toast('המבצע הסתיים. בוחרים תאריך סיום חדש ושומרים')
                  }
                  saveAll(
                    deals.map((x) => (x.id === d.id ? { ...x, active: v } : x)),
                    v ? 'המבצע הופעל' : 'המבצע הושהה',
                  )
                }}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setEditing(d)} className="btn-secondary flex-1 py-2.5 text-sm">
                <Pencil size={15} /> עריכה
              </button>
              <button
                type="button"
                onClick={() => window.confirm(`למחוק את המבצע "${d.title}"?`) && saveAll(deals.filter((x) => x.id !== d.id), 'המבצע נמחק')}
                className="btn-danger px-4 py-2.5 text-sm"
                aria-label={`מחיקת המבצע ${d.title}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
