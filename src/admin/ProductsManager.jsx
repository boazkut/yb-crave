import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useData } from '../state/DataContext.jsx'
import { storage } from '../services/storageService.js'
import { CATEGORIES, TAGS } from '../data/catalog.js'
import { ProductArt } from '../components/ProductArt.jsx'
import { STOCK, effectiveStock } from '../lib/shop.js'
import { uid } from '../lib/utils.js'
import { Card, Segmented, Toggle, useAdminToast } from './adminUi.jsx'

const SHAPES = ['bag', 'tube', 'bar', 'box', 'cookie', 'strip', 'gummy', 'lolly', 'can', 'bottle', 'pouch', 'supply', 'mystery', 'combo']
const CAT_NAME = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]))

function NumberField({ value, onCommit, label, step = 1, className = '' }) {
  const [v, setV] = useState(String(value ?? ''))
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    setV(String(value ?? ''))
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      aria-label={label}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Number(v)
        if (v !== '' && !Number.isNaN(n) && n !== value) onCommit(n)
        else setV(String(value ?? ''))
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className={`field px-2 py-2 text-center text-sm font-extrabold tabular-nums ${className}`}
    />
  )
}

function TextField({ value, onCommit, label, placeholder, dir }) {
  const [v, setV] = useState(value || '')
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    setV(value || '')
  }
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        value={v}
        dir={dir}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== (value || '') && onCommit(v.trim())}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="field py-2.5 text-sm"
      />
    </label>
  )
}

function ProductRow({ p }) {
  const toast = useAdminToast()
  const [open, setOpen] = useState(false)
  const stock = effectiveStock(p)

  const save = async (patch, msg = 'נשמר') => {
    try {
      await storage.saveProduct({ ...p, ...patch })
      toast(msg)
    } catch {
      toast('השמירה נכשלה')
    }
  }

  return (
    <li className="rounded-[8px] border-2 border-paper/10 bg-coal-2 p-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="shrink-0" aria-label={`עריכת ${p.name}`}>
          <ProductArt product={p} dim={stock === 'out'} className="h-14 w-12" />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setOpen((o) => !o)} className="block w-full text-right">
            <span className="block truncate text-sm font-extrabold">
              {p.secret && '🤫 '}
              {p.name}
            </span>
            <span className="block text-[11px] text-paper/50">
              {CAT_NAME[p.category] || p.category}
              {p.notifyCount > 0 && <span className="font-bold text-[#FFB000]"> | 🔔 {p.notifyCount} מחכים</span>}
              {p.weekSold > 0 && <span> | {p.weekSold} נמכרו השבוע</span>}
            </span>
          </button>
          <div className="mt-2">
            <Segmented
              size="sm"
              value={p.stock || 'in'}
              onChange={(v) => save({ stock: v, ...(v !== 'out' && (p.qty ?? 0) <= 0 ? { qty: v === 'low' ? 3 : 20 } : {}) }, `${p.name}: ${STOCK[v].label}`)}
              options={['in', 'low', 'out'].map((s) => ({ value: s, label: STOCK[s].label, color: STOCK[s].color }))}
            />
          </div>
        </div>
        <div className="w-[72px] shrink-0 space-y-1.5">
          <div className="relative">
            <NumberField label={`מחיר ${p.name}`} value={p.price} step={0.5} onCommit={(n) => save({ price: n }, `מחיר עודכן: ${n} ₪`)} />
            <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-paper/40">₪</span>
          </div>
          <div className="relative">
            <NumberField label={`כמות ${p.name}`} value={p.qty} onCommit={(n) => save({ qty: n }, `כמות עודכנה: ${n}`)} />
            <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-paper/40">יח'</span>
          </div>
        </div>
      </div>
      {stock !== (p.stock || 'in') && (
        <p className="mt-2 text-[11px] font-bold text-[#FFB000]">
          מוצג ללקוחות כ"{STOCK[stock].label}" בגלל הכמות ({p.qty}). עדכנו כמות כדי לשנות.
        </p>
      )}

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-3 border-t border-paper/10 pt-3">
              <TextField label="שם המוצר" value={p.name} onCommit={(v) => v && save({ name: v })} />
              <TextField
                label="קישור לתמונה (PNG שקוף מומלץ)"
                value={p.imageUrl}
                dir="ltr"
                placeholder="/products/bamba.png או https://..."
                onCommit={(v) => save({ imageUrl: v }, v ? 'התמונה עודכנה' : 'חזרנו לציור המובנה')}
              />
              <TextField label="שורת תיאור קצרה" value={p.blurb} onCommit={(v) => save({ blurb: v })} />
              <TextField label="טקסט על העטיפה (כשאין תמונה)" value={p.art?.label} onCommit={(v) => save({ art: { ...p.art, label: v } })} />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">קטגוריה</span>
                  <select value={p.category} onChange={(e) => save({ category: e.target.value })} className="field py-2.5 text-sm">
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label">צורת הציור</span>
                  <select value={p.art?.shape} onChange={(e) => save({ art: { ...p.art, shape: e.target.value } })} className="field py-2.5 text-sm" dir="ltr">
                    {SHAPES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-paper/70">צבע ראשי</span>
                  <input type="color" value={p.art?.c1?.startsWith('#') ? p.art.c1 : '#E5212B'} onChange={(e) => save({ art: { ...p.art, c1: e.target.value } })} className="h-9 w-14 rounded border-2 border-paper/20 bg-transparent" />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-paper/70">צבע משני</span>
                  <input type="color" value={p.art?.c2?.startsWith('#') ? p.art.c2 : '#F4EAD5'} onChange={(e) => save({ art: { ...p.art, c2: e.target.value } })} className="h-9 w-14 rounded border-2 border-paper/20 bg-transparent" />
                </label>
              </div>
              <div>
                <span className="label">תגיות</span>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map((t) => {
                    const on = p.tags?.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={on}
                        className="chip px-2.5 py-1.5 text-xs"
                        onClick={() => save({ tags: on ? p.tags.filter((x) => x !== t.id) : [...(p.tags || []), t.id] })}
                      >
                        {t.emoji} {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                {[
                  ['secret', 'בתפריט הסודי'],
                  ['bagEligible', 'אפשר לבחור בשקית חמצוצים'],
                ].map(([k, l]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-sm font-bold">{l}</span>
                    <Toggle checked={Boolean(p[k])} onChange={(v) => save({ [k]: v })} label={l} />
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">פיקדון (₪)</span>
                  <NumberField label="פיקדון" value={p.deposit || 0} onCommit={(n) => save({ deposit: n })} className="w-20" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">מחיר לפני הנחה (₪)</span>
                  <NumberField label="מחיר לפני הנחה" value={p.compareAt || 0} onCommit={(n) => save({ compareAt: n })} className="w-20" />
                </div>
              </div>
              <div className="flex gap-2">
                {p.notifyCount > 0 && (
                  <button type="button" className="btn-ghost flex-1 py-2 text-xs" onClick={() => save({ notifyCount: 0 }, 'מונה "תודיעו לי" אופס')}>
                    אפס "תודיעו לי"
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost flex-1 border-cola/50 py-2 text-xs text-cola"
                  onClick={async () => {
                    if (!window.confirm(`למחוק את "${p.name}"?`)) return
                    await storage.deleteProduct(p.id)
                    toast('המוצר נמחק')
                  }}
                >
                  מחיקת מוצר
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function AddProduct({ onDone }) {
  const toast = useAdminToast()
  const [form, setForm] = useState({ name: '', price: 5, category: 'salty', qty: 20, imageUrl: '', shape: 'bag', c1: '#FF7A1A', c2: '#F4EAD5' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('צריך שם למוצר')
    await storage.saveProduct({
      id: uid('p-'),
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price) || 0,
      imageUrl: form.imageUrl.trim(),
      stock: 'in',
      qty: Number(form.qty) || 0,
      tags: [],
      art: { shape: form.shape, c1: form.c1, c2: form.c2, label: form.name.trim(), glyph: '' },
      blurb: '',
      secret: false,
      bagEligible: form.category === 'sour',
      deposit: 0,
      compareAt: 0,
      comboSlots: null,
      notifyCount: 0,
      soldCount: 0,
      weekSold: 0,
    })
    toast(`${form.name} נוסף לחנות`)
    onDone()
  }

  const preview = { id: 'preview', name: form.name || 'מוצר חדש', imageUrl: form.imageUrl, art: { shape: form.shape, c1: form.c1, c2: form.c2, label: form.name || 'חדש' } }

  return (
    <Card title="מוצר חדש">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-3">
          <ProductArt product={preview} className="h-20 w-16 shrink-0" />
          <label className="block flex-1">
            <span className="label">שם</span>
            <input value={form.name} onChange={set('name')} className="field py-2.5" placeholder="למשל: טאקיס בלו" />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="label">מחיר</span>
            <input type="number" step="0.5" value={form.price} onChange={set('price')} className="field py-2.5" />
          </label>
          <label className="block">
            <span className="label">כמות</span>
            <input type="number" value={form.qty} onChange={set('qty')} className="field py-2.5" />
          </label>
          <label className="block">
            <span className="label">קטגוריה</span>
            <select value={form.category} onChange={set('category')} className="field px-2 py-2.5 text-sm">
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="label">קישור לתמונה (לא חובה)</span>
          <input value={form.imageUrl} onChange={set('imageUrl')} className="field py-2.5" dir="ltr" placeholder="https://..." />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="label">צורה</span>
            <select value={form.shape} onChange={set('shape')} className="field px-2 py-2.5 text-sm" dir="ltr">
              {SHAPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">צבע</span>
            <input type="color" value={form.c1} onChange={set('c1')} className="h-[46px] w-full rounded border-2 border-paper/20 bg-transparent" />
          </label>
          <label className="block">
            <span className="label">צבע משני</span>
            <input type="color" value={form.c2} onChange={set('c2')} className="h-[46px] w-full rounded border-2 border-paper/20 bg-transparent" />
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-lime flex-1">
            הוספה לחנות
          </button>
          <button type="button" onClick={onDone} className="btn-ghost">
            ביטול
          </button>
        </div>
      </form>
    </Card>
  )
}

export function ProductsManager() {
  const { products } = useData()
  const toast = useAdminToast()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [view, setView] = useState('all')
  const [adding, setAdding] = useState(false)

  const list = useMemo(() => {
    const s = q.trim()
    return products.filter((p) => {
      if (s && !p.name.includes(s)) return false
      if (cat === 'secret' ? !p.secret : cat !== 'all' && p.category !== cat) return false
      if (view === 'out' && effectiveStock(p) !== 'out') return false
      if (view === 'low' && effectiveStock(p) === 'in') return false
      if (view === 'wanted' && !(p.notifyCount > 0)) return false
      return true
    })
  }, [products, q, cat, view])

  const outCount = products.filter((p) => effectiveStock(p) === 'out').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-3xl leading-none">מלאי ומחירים</h1>
        <button type="button" onClick={() => setAdding((a) => !a)} className="btn-lime px-3 py-2 text-sm">
          + מוצר
        </button>
      </div>

      {adding && <AddProduct onDone={() => setAdding(false)} />}

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש מוצר..." className="field" type="search" />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {[{ id: 'all', name: 'הכל' }, ...CATEGORIES, { id: 'secret', name: 'סודי 🤫' }].map((c) => (
          <button key={c.id} type="button" className="chip px-3 py-1.5 text-xs" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'all', label: `הכל (${products.length})` },
          { value: 'low', label: 'אחרונים/אזל' },
          { value: 'out', label: `אזל (${outCount})` },
          { value: 'wanted', label: '🔔 מבוקשים' },
        ]}
      />

      <ul className="space-y-2.5">
        {list.map((p) => (
          <ProductRow key={p.id} p={p} />
        ))}
      </ul>
      {!list.length && <p className="py-6 text-center text-sm text-paper/55">אין מוצרים שמתאימים לסינון.</p>}

      <Card title="כלים">
        <div className="grid gap-2">
          <button
            type="button"
            className="btn-ghost justify-start text-sm"
            onClick={async () => {
              await storage.resetWeekly()
              toast('מוני "הכי נמכרים השבוע" אופסו')
            }}
          >
            איפוס "הכי נמכרים השבוע" (בתחילת שבוע)
          </button>
          <button
            type="button"
            className="btn-ghost justify-start text-sm"
            onClick={async () => {
              await storage.seedCatalog('missing')
              toast('מוצרים חסרים מהקטלוג המקורי נוספו')
            }}
          >
            הוסף מוצרים חסרים מהקטלוג המקורי
          </button>
        </div>
      </Card>
    </div>
  )
}
