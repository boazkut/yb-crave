import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Camera, Check, ChevronDown, ImagePlus, Plus, SkipForward, Tag, Trash2, X } from 'lucide-react'
import { useData } from '../state/DataContext.jsx'
import { storage } from '../services/storageService.js'
import { ProductImage, hasRealImage } from '../components/ProductImage.jsx'
import { STOCK } from '../lib/shop.js'
import { compressProductImage } from '../lib/imageCompress.js'
import { ils, uid, vibrate } from '../lib/utils.js'
import { Section, Segmented, Toggle, useToast } from './ui.jsx'

const STOCK_OPTIONS = ['in', 'low', 'out'].map((s) => ({ value: s, label: STOCK[s].label }))

function CommitInput({ value, onCommit, className = 'field py-2.5 text-sm', ...rest }) {
  const [v, setV] = useState(value ?? '')
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    setV(value ?? '')
  }
  return (
    <input
      {...rest}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => String(v) !== String(value ?? '') && onCommit(v)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className={className}
    />
  )
}

function ImagePicker({ product, onUpload, onUrl, onRemove }) {
  const ref = useRef(null)
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const real = hasRealImage(product)
  return (
    <div>
      <span className="label">תמונה</span>
      <div className="flex items-center gap-3">
        <ProductImage product={product} className="h-16 w-16 shrink-0 rounded-xl bg-tile" artClass="h-14 w-12" />
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            setBusy(true)
            try {
              const { dataUrl } = await compressProductImage(f)
              await onUpload(dataUrl)
            } catch (err) {
              toast(err.message || 'ההעלאה נכשלה')
            } finally {
              setBusy(false)
            }
          }}
        />
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-secondary px-3 py-2.5 text-sm">
          <ImagePlus size={16} /> {busy ? 'מעלים...' : real ? 'החלפה' : 'העלאה'}
        </button>
        {real && onRemove && (
          <button type="button" onClick={onRemove} className="btn-ghost px-2 py-2.5 text-sm">
            הסרה
          </button>
        )}
      </div>
      {onUrl && (
        <CommitInput
          value={product.imageUrl}
          onCommit={(v) => onUrl(v.trim())}
          dir="ltr"
          placeholder="או קישור לתמונה: https://..."
          className="field mt-2 py-2.5 text-right text-sm"
          aria-label="קישור לתמונה"
        />
      )}
    </div>
  )
}

/** מצב צילום מהיר: עוברים מוצר אחרי מוצר ומצלמים את המלאי האמיתי */
function QuickPhotos({ products, onClose }) {
  const toast = useToast()
  const queue = useMemo(() => products.filter((p) => !hasRealImage(p)).map((p) => p.id), []) // eslint-disable-line react-hooks/exhaustive-deps
  const { byId } = useData()
  const [i, setI] = useState(0)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  const p = byId[queue[i]]

  if (!p) {
    return (
      <Section title="צילום מהיר" aside={<button type="button" onClick={onClose} className="text-muted" aria-label="סגירה"><X size={20} /></button>}>
        <p className="text-sm">{queue.length ? 'סיימתם! לכל המוצרים יש תמונה.' : 'לכל המוצרים כבר יש תמונה.'}</p>
      </Section>
    )
  }

  return (
    <Section
      title="צילום מהיר"
      aside={
        <button type="button" onClick={onClose} className="text-muted" aria-label="סגירה">
          <X size={20} />
        </button>
      }
    >
      <p className="text-[13px] text-muted">
        מוצר {i + 1} מתוך {queue.length}. מניחים את המוצר על רקע בהיר ומצלמים מקרוב.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <ProductImage product={p} className="h-20 w-20 shrink-0 rounded-2xl bg-tile" artClass="h-16 w-14" />
        <div>
          <p className="text-lg font-bold">{p.name}</p>
          <p className="text-sm text-muted">{p.price} ₪</p>
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          setBusy(true)
          try {
            const { dataUrl } = await compressProductImage(f)
            await storage.setProductImage(p.id, dataUrl)
            toast(`${p.name}: נשמר`)
            setI((x) => x + 1)
          } catch (err) {
            toast(err.message || 'השמירה נכשלה')
          } finally {
            setBusy(false)
          }
        }}
      />
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-primary py-3.5">
          <Camera size={18} /> {busy ? 'שומרים...' : 'צילום'}
        </button>
        <button type="button" onClick={() => setI((x) => x + 1)} className="btn-secondary px-4">
          <SkipForward size={16} /> דילוג
        </button>
      </div>
    </Section>
  )
}

/** לחיצה ארוכה (בלי לגלול) */
function useLongPress(onLong, ms = 450) {
  const timer = useRef(0)
  const start = useRef(null)
  const fired = useRef(false)
  const clear = () => {
    clearTimeout(timer.current)
    start.current = null
  }
  const handlers = {
    onPointerDown: (e) => {
      fired.current = false
      if (e.target.closest?.('input, select, textarea')) return
      start.current = { x: e.clientX, y: e.clientY }
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        fired.current = true
        vibrate(30)
        onLong()
      }, ms)
    },
    onPointerMove: (e) => {
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear()
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e) => e.preventDefault(),
  }
  // אחרי לחיצה ארוכה לא מפעילים גם את הלחיצה הרגילה
  const swallow = () => {
    if (!fired.current) return false
    fired.current = false
    return true
  }
  return { handlers, swallow }
}

function ProductRow({ p, categories, selecting, selected, onToggle }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const lp = useLongPress(() => onToggle(p.id))
  const save = async (patch, msg = 'נשמר') => {
    try {
      await storage.saveProduct({ ...p, ...patch })
      toast(msg)
    } catch {
      toast('השמירה נכשלה')
    }
  }
  const tap = () => {
    if (lp.swallow()) return
    if (selecting) onToggle(p.id)
    else setOpen((o) => !o)
  }

  return (
    <li className={`-mx-4 select-none px-4 py-3 [-webkit-touch-callout:none] ${selected ? 'bg-[#F0F0EE]' : ''}`}>
      <div className="flex items-center gap-3" {...lp.handlers}>
        {selecting && (
          <button
            type="button"
            onClick={tap}
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-ink bg-ink text-white' : 'border-[#C9C9C9] bg-white'}`}
            aria-label={`${selected ? 'ביטול בחירה' : 'בחירה'}: ${p.name}`}
            aria-pressed={selected}
          >
            {selected && <Check size={14} strokeWidth={3} />}
          </button>
        )}
        <button type="button" onClick={tap} className="shrink-0" aria-label={selecting ? `בחירת ${p.name}` : `עריכת ${p.name}`} draggable={false}>
          <ProductImage product={p} dim={p.stock === 'out'} className="h-14 w-14 rounded-xl bg-tile" artClass="h-12 w-10" />
        </button>
        <button type="button" onClick={tap} className="flex min-w-0 flex-1 items-center gap-1 text-right">
          <span className="truncate text-[15px] font-medium">{p.name}</span>
          {!selecting && <ChevronDown size={15} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />}
        </button>
        {selecting ? (
          <span className="shrink-0 text-[15px] font-semibold tabular-nums">{ils(p.price)}</span>
        ) : (
          <div className="relative w-[76px] shrink-0">
            <CommitInput
              type="number"
              inputMode="decimal"
              step="0.5"
              value={p.price}
              onCommit={(v) => {
                const n = Number(v)
                if (!Number.isNaN(n) && n >= 0) save({ price: n }, `מחיר עודכן: ${n} ₪`)
              }}
              aria-label={`מחיר ${p.name}`}
              className="field px-2 py-2.5 pl-5 text-center text-sm font-semibold"
            />
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-muted">₪</span>
          </div>
        )}
      </div>
      {selecting ? null : (
      <>
      <div className="mt-2">
        <Segmented size="sm" value={p.stock || 'in'} onChange={(v) => save({ stock: v }, `${p.name}: ${STOCK[v].label}`)} options={STOCK_OPTIONS} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-3 rounded-xl bg-tile p-3">
              <div>
                <label className="label">שם</label>
                <CommitInput value={p.name} onCommit={(v) => v.trim() && save({ name: v.trim(), art: { ...p.art, label: v.trim() } })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">קטגוריה</label>
                  <select className="field py-2.5 text-sm" value={p.category} onChange={(e) => save({ category: e.target.value })}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">שורת הסבר</label>
                  <CommitInput value={p.note} onCommit={(v) => save({ note: v.trim() })} placeholder="לא חובה" />
                </div>
              </div>
              <ImagePicker
                product={p}
                onUpload={async (d) => {
                  await storage.setProductImage(p.id, d)
                  toast('התמונה עודכנה')
                }}
                onUrl={(v) => save({ imageUrl: v }, v ? 'הקישור נשמר' : 'הקישור הוסר')}
                onRemove={async () => {
                  if (p.imageUrl) await storage.saveProduct({ ...p, imageUrl: '' })
                  if (p.imageV) await storage.setProductImage(p.id, null)
                  toast('התמונה הוסרה')
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm">אפשר לבחור בשקית חמצוצים</span>
                <Toggle checked={Boolean(p.bagEligible)} onChange={(v) => save({ bagEligible: v })} label="בשקית חמצוצים" />
              </div>
              <button
                type="button"
                className="btn-danger w-full text-sm"
                onClick={async () => {
                  if (!window.confirm(`למחוק את "${p.name}"?`)) return
                  await storage.deleteProduct(p.id)
                  toast('המוצר נמחק')
                }}
              >
                <Trash2 size={16} /> מחיקת מוצר
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}
    </li>
  )
}

/** סרגל פעולות כשבוחרים כמה מוצרים בלחיצה ארוכה */
function BulkBar({ ids, onAll, onClear }) {
  const toast = useToast()
  const { byId } = useData()
  const [pricing, setPricing] = useState(false)
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action, patch, msg) => {
    setBusy(true)
    try {
      if (storage.bulkProducts) await storage.bulkProducts(ids, action, patch)
      else await Promise.all(ids.map((id) => (action === 'delete' ? storage.deleteProduct(id) : storage.saveProduct({ ...byId[id], ...patch }))))
      toast(msg)
      onClear()
    } catch (e) {
      toast(e?.message || 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }
  const n = Number(price)
  const priceOk = price !== '' && !Number.isNaN(n) && n >= 0

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="fixed inset-x-0 z-40 px-3"
      style={{ bottom: 'calc(70px + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-3xl rounded-2xl bg-ink p-3 text-white shadow-[0_10px_30px_rgba(0,0,0,.3)]">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-[16px] font-bold">נבחרו {ids.length}</p>
          <button type="button" onClick={onAll} className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-white/80">
            בחירת הכל
          </button>
          <button type="button" onClick={onClear} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="ביטול הבחירה">
            <X size={18} />
          </button>
        </div>
        {pricing ? (
          <form
            className="mt-2.5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (priceOk) run('update', { price: n }, `המחיר של ${ids.length} מוצרים עודכן ל-${n} ₪`)
            }}
          >
            <div className="relative flex-1">
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.5"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="מחיר חדש"
                className="w-full rounded-xl bg-white px-3 py-3 pl-7 text-center text-[17px] font-bold text-ink focus:outline-none"
                aria-label="מחיר חדש לכל המוצרים שנבחרו"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₪</span>
            </div>
            <button type="submit" disabled={!priceOk || busy} className="btn bg-white px-4 text-ink">
              {busy ? '...' : 'עדכון'}
            </button>
            <button type="button" onClick={() => setPricing(false)} className="btn px-3 text-white/80">
              חזרה
            </button>
          </form>
        ) : (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => setPricing(true)} className="btn bg-white py-3 text-ink">
              <Tag size={17} /> מחיר לכולם
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm(`למחוק ${ids.length} מוצרים? אי אפשר לבטל.`) && run('delete', null, `${ids.length} מוצרים נמחקו`)}
              className="btn bg-danger py-3 text-white"
            >
              <Trash2 size={17} /> {busy ? 'מוחקים...' : 'מחיקה'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function AddProduct({ categories, defaultCategory, onDone }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('5')
  const [category, setCategory] = useState(defaultCategory || categories[0]?.id)
  const [image, setImage] = useState('')
  const preview = { id: 'new', name: name || 'מוצר חדש', imageUrl: image, art: { shape: 'bag', c1: '#141414', c2: '#FAF9F6', label: name || 'חדש' } }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast('צריך שם למוצר')
    const id = uid('p-')
    const uploaded = image.startsWith('data:')
    await storage.saveProduct({
      id,
      name: name.trim(),
      category,
      price: Number(price) || 0,
      imageUrl: uploaded ? '' : image,
      stock: 'in',
      art: preview.art,
      note: '',
      bagEligible: false,
      comboSlots: null,
      sort: Date.now(),
    })
    if (uploaded) await storage.setProductImage(id, image)
    toast(`${name.trim()} נוסף`)
    onDone()
  }

  return (
    <Section title="מוצר חדש">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="np-name">
            שם
          </label>
          <input id="np-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="np-price">
              מחיר (₪)
            </label>
            <input id="np-price" type="number" step="0.5" className="field" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="np-cat">
              קטגוריה
            </label>
            <select id="np-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ImagePicker product={preview} onUpload={setImage} onUrl={setImage} onRemove={() => setImage('')} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onDone} className="btn-secondary">
            ביטול
          </button>
          <button type="submit" className="btn-primary">
            הוספה
          </button>
        </div>
      </form>
    </Section>
  )
}

function CategoriesManager() {
  const { categories, products } = useData()
  const toast = useToast()
  const [newName, setNewName] = useState('')
  const save = (list, msg) => storage.updateSettings({ categories: list }).then(() => toast(msg))
  const move = (i, d) => {
    const list = [...categories]
    ;[list[i], list[i + d]] = [list[i + d], list[i]]
    save(list, 'הסדר עודכן')
  }

  return (
    <Section title="קטגוריות">
      <ul className="divide-y divide-line">
        {categories.map((c, i) => {
          const count = products.filter((p) => p.category === c.id).length
          return (
            <li key={c.id} className="flex items-center gap-2 py-2">
              <CommitInput
                value={c.name}
                onCommit={(v) => v.trim() && save(categories.map((x) => (x.id === c.id ? { ...x, name: v.trim() } : x)), 'השם עודכן')}
                aria-label={`שם הקטגוריה ${c.name}`}
              />
              <span className="w-10 shrink-0 text-center text-[12px] text-muted">{count}</span>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted disabled:opacity-30" aria-label="למעלה">
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                disabled={i === categories.length - 1}
                onClick={() => move(i, 1)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted disabled:opacity-30"
                aria-label="למטה"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => (count ? toast('קודם מעבירים או מוחקים את המוצרים שבקטגוריה') : save(categories.filter((x) => x.id !== c.id), 'הקטגוריה נמחקה'))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted"
                aria-label={`מחיקת ${c.name}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          )
        })}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!newName.trim()) return
          save([...categories, { id: uid('c-'), name: newName.trim() }], 'הקטגוריה נוספה')
          setNewName('')
        }}
      >
        <input className="field py-2.5 text-sm" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="קטגוריה חדשה" />
        <button type="submit" className="btn-secondary shrink-0 px-4 text-sm">
          הוספה
        </button>
      </form>
    </Section>
  )
}

export function ProductsTab() {
  const { products, categories } = useData()
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [quick, setQuick] = useState(false)
  const [picked, setPicked] = useState([])
  const selecting = picked.length > 0
  const toggle = (id) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  const missing = products.filter((p) => !hasRealImage(p)).length

  const list = useMemo(
    () => products.filter((p) => (cat === 'all' || p.category === cat) && (!q.trim() || p.name.includes(q.trim()))),
    [products, cat, q],
  )
  const outCount = products.filter((p) => p.stock === 'out').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">מוצרים ומלאי</h1>
        <button type="button" onClick={() => setAdding((a) => !a)} className="btn-primary px-3 py-2.5 text-sm">
          <Plus size={16} /> מוצר
        </button>
      </div>
      {adding && <AddProduct categories={categories} defaultCategory={cat !== 'all' ? cat : undefined} onDone={() => setAdding(false)} />}
      {quick ? (
        <QuickPhotos products={cat === 'all' ? products : products.filter((p) => p.category === cat)} onClose={() => setQuick(false)} />
      ) : (
        missing > 0 && (
          <button type="button" onClick={() => setQuick(true)} className="card flex w-full items-center gap-3 p-4 text-right">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white">
              <Camera size={20} />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">צילום מהיר של המלאי</span>
              <span className="block text-[13px] text-muted">ל-{missing} מוצרים עוד אין תמונה אמיתית. מצלמים אחד אחרי השני.</span>
            </span>
          </button>
        )
      )}
      <input className="field" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש מוצר" />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {[{ id: 'all', name: `הכל (${products.length})` }, ...categories].map((c) => (
          <button key={c.id} type="button" className="chip px-3 py-1.5 text-[13px]" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <p className="text-[13px] text-muted">
        לחיצה ארוכה על מוצר בוחרת כמה מוצרים יחד, למחיקה או למחיר אחיד.
        {outCount > 0 && ` ${outCount} מוצרים מסומנים כרגע כ"אזל".`}
      </p>
      <Section className="overflow-hidden">
        <ul className="-my-3 divide-y divide-line">
          {list.map((p) => (
            <ProductRow key={p.id} p={p} categories={categories} selecting={selecting} selected={picked.includes(p.id)} onToggle={toggle} />
          ))}
        </ul>
        {!list.length && <p className="text-sm text-muted">אין מוצרים כאן.</p>}
      </Section>
      {selecting ? <div className="h-36" aria-hidden="true" /> : <CategoriesManager />}
      <AnimatePresence>
        {selecting && (
          <BulkBar
            ids={picked}
            onAll={() => setPicked(list.map((p) => p.id))}
            onClear={() => setPicked([])}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
