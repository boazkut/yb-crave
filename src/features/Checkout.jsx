import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Banknote, Check, Copy, ImagePlus, LoaderCircle, Smartphone, Tag, Trash2, Wallet } from 'lucide-react'
import { Sheet, Stepper } from '../components/Overlays.jsx'
import { ProductImage } from '../components/ProductImage.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { useData } from '../state/DataContext.jsx'
import { useLocal, LS_KEYS } from '../state/useLocal.js'
import { storage } from '../services/storageService.js'
import { normalizeIsraeliPhone } from '../lib/shop.js'
import { compressImage } from '../lib/imageCompress.js'
import { copyText, dateKey, ils } from '../lib/utils.js'
import { openPayApp } from '../lib/payApps.js'
import { celebrate } from '../lib/celebrate.js'
import { askPermissionNow } from '../lib/push.js'
import { connectOrderPush } from '../lib/orderPush.js'

const METHODS = [
  { id: 'paybox', label: 'PayBox', Icon: Wallet },
  { id: 'bit', label: 'Bit', Icon: Smartphone },
  { id: 'cash', label: 'מזומן', Icon: Banknote },
]

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="btn-secondary px-3 py-2.5 text-sm"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        }
      }}
    >
      {done ? <Check size={16} /> : <Copy size={16} />}
      {done ? 'הועתק' : label}
    </button>
  )
}

function ProofUpload({ proof, setProof, required, error }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      const res = await compressImage(file)
      setProof(res)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2">
      {!required && <span className="hint mb-2 mt-0 block">לא חובה, אבל זה מזרז את האישור</span>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {proof ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-2">
          <img src={proof.dataUrl} alt="תצוגה מקדימה של אישור התשלום" className="h-16 w-16 rounded-lg border border-line object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">האישור צורף</p>
            <p className="text-[13px] text-muted">{Math.round(proof.bytes / 1024)}KB אחרי דחיסה</p>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost px-2 py-2 text-sm">
            החלפה
          </button>
          <button type="button" onClick={() => setProof(null)} className="grid h-9 w-9 place-items-center rounded-full text-muted" aria-label="הסרת התמונה">
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed bg-white px-4 py-4 text-sm font-medium ${
            error ? 'border-danger text-danger' : 'border-[#C9C9C9] text-ink'
          }`}
        >
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          {busy ? 'מכינים את התמונה...' : 'העלאת צילום מסך'}
        </button>
      )}
      {(err || error) && <p className="error">{err || error}</p>}
    </div>
  )
}

function CartStep({ onNext, onClose }) {
  const cart = useCart()
  const ui = useUI()
  const { settings, byId } = useData()
  // שורה שאי אפשר להזמין (אזל / נשאר פחות / נמחק) עוצרת את ההמשך עד שמתקנים
  const blocked = cart.lines.some((l) => {
    const p = byId[l.productId]
    return !p || p.stock === 'out' || (Number.isInteger(p.qty) && l.qty > p.qty)
  })

  if (!cart.lines.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-semibold">ההזמנה ריקה</p>
        <p className="mt-1 text-sm text-muted">מוסיפים מוצרים עם כפתור ה-+</p>
        <button type="button" onClick={onClose} className="btn-secondary mt-5">
          חזרה לחנות
        </button>
      </div>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {cart.lines.map((l) => (
          <li key={l.key} className="flex items-center gap-3 py-3">
            <ProductImage
              product={byId[l.productId] || { id: l.productId, name: l.name, art: l.art, imageUrl: l.imageUrl }}
              className="h-14 w-14 shrink-0 rounded-xl bg-tile"
              artClass="h-12 w-10"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium leading-tight">{l.name}</p>
              {l.details?.length > 0 && <p className="mt-0.5 text-[12px] leading-snug text-muted">{l.details.join(', ')}</p>}
              {(() => {
                const p = byId[l.productId]
                if (!p) return <p className="mt-0.5 text-[12px] font-semibold text-danger">המוצר כבר לא בחנות. מוחקים אותו מההזמנה.</p>
                if (p.stock === 'out') return <p className="mt-0.5 text-[12px] font-semibold text-danger">אזל בינתיים. מוחקים אותו מההזמנה.</p>
                if (Number.isInteger(p.qty) && l.qty > p.qty) return <p className="mt-0.5 text-[12px] font-semibold text-danger">נשארו רק {p.qty}. מורידים כמות.</p>
                return null
              })()}
              <p className="mt-0.5 text-sm font-semibold">
                <bdi>{ils(l.unitPrice * l.qty)}</bdi>
                {l.basePrice > l.unitPrice && <bdi className="mr-2 text-[12px] font-normal text-muted line-through">{ils(l.basePrice * l.qty)}</bdi>}
              </p>
            </div>
            <Stepper
              value={l.qty}
              onDec={() => cart.setQty(l.key, l.qty - 1)}
              onInc={() => {
                const left = Number.isInteger(byId[l.productId]?.qty) ? byId[l.productId].qty : null
                if (left !== null && l.qty >= left) return ui.toast(left === 1 ? 'נשאר רק אחד' : `נשארו רק ${left}`)
                cart.setQty(l.key, l.qty + 1)
              }}
            />
          </li>
        ))}
      </ul>
      {cart.discounts.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {cart.discounts.map((d) => (
            <li key={d.dealId} className="flex items-center justify-between text-[15px] font-semibold text-[#15803D]">
              <span className="flex items-center gap-1.5">
                <Tag size={15} /> מבצע {d.title}
                {d.times > 1 && <span className="text-[13px] font-normal">×{d.times}</span>}
              </span>
              <span dir="ltr">−{ils(d.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {cart.hints.map((h) => (
        <p key={h.dealId} className="mt-2 rounded-xl bg-[#E7F6EC] px-3 py-2 text-[14px] text-[#15803D]">
          עוד {h.need === 1 ? 'מוצר אחד' : `${h.need} מוצרים`} מהמבצע "{h.title}" והמחיר יורד
        </p>
      ))}
      <div className="mt-3 flex items-center justify-between border-t border-line pt-4">
        <span className="text-muted">סה&quot;כ</span>
        <span className="text-2xl font-bold">{ils(cart.total)}</span>
      </div>
      {!settings.storeOpen && <p className="mt-3 rounded-xl bg-tile px-3 py-2.5 text-sm">החנות סגורה כרגע, אז אי אפשר לשלוח הזמנה.</p>}
      <button type="button" onClick={onNext} disabled={!settings.storeOpen || blocked} className="btn-primary mt-4 w-full">
        המשך לפרטים ותשלום
      </button>
    </div>
  )
}

function DetailsStep({ onBack, onDone }) {
  const cart = useCart()
  const ui = useUI()
  const { settings } = useData()
  const [profile, setProfile] = useLocal(LS_KEYS.profile, { name: '', phone: '', room: '' })
  const [, setMyOrders] = useLocal(LS_KEYS.myOrders, [])

  const [name, setName] = useState(profile.name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [room, setRoom] = useState(profile.room || '')
  const [note, setNote] = useState('')
  const [method, setMethod] = useState('paybox')
  const [proof, setProof] = useState(null)
  const [changeFor, setChangeFor] = useState('בדיוק')
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [opened, setOpened] = useState(false)

  const total = cart.total
  const transferPhone = settings.transferPhone

  const validate = () => {
    const e = {}
    if (!name.trim() || name.trim().length < 2) e.name = 'צריך שם מלא'
    if (!normalizeIsraeliPhone(phone)) e.phone = 'צריך מספר טלפון ישראלי תקין'
    if (!room.trim()) e.room = 'צריך מספר חדר או כיתה'
    if (method === 'paybox' && !proof) e.proof = 'בתשלום ב-PayBox צריך לצרף צילום מסך של האישור'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    // שואלים על התראות בתוך הלחיצה עצמה (באייפון אי אפשר אחרת)
    const permission = storage.saveOrderPush ? askPermissionNow() : null
    setSending(true)
    try {
      const cleanPhone = normalizeIsraeliPhone(phone)
      const order = {
        createdAt: Date.now(),
        dateKey: dateKey(),
        customer: { name: name.trim(), phone: cleanPhone, room: room.trim(), note: note.trim() },
        lines: cart.lines.map((l) => ({
          kind: l.kind,
          productId: l.productId || null,
          name: l.name,
          unitPrice: l.unitPrice,
          qty: l.qty,
          details: l.details || [],
        })),
        total,
        payment: {
          method,
          hasProof: Boolean(proof && method !== 'cash'),
          changeFor: method === 'cash' ? changeFor : '',
        },
        status: method === 'cash' ? 'preparing' : 'awaiting_payment',
        paid: false,
        rejectReason: '',
      }
      const saved = await storage.createOrder(order, method !== 'cash' && proof ? proof.dataUrl : null)
      setProfile({ name: name.trim(), phone: cleanPhone, room: room.trim() })
      setMyOrders((list) => [{ id: saved.id, number: saved.number, createdAt: saved.createdAt }, ...(list || [])].slice(0, 15))
      cart.clear()
      celebrate()
      if (permission) connectOrderPush(saved.id, permission)
      onDone(saved.id)
    } catch (err) {
      console.error(err)
      ui.toast(err?.message?.length < 90 ? err.message : 'ההזמנה לא נשלחה. בדקו את החיבור ונסו שוב.')
    } finally {
      setSending(false)
    }
  }

  const fieldClass = (k) => `field ${errors[k] ? 'field-error' : ''}`

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-muted underline underline-offset-4">
        חזרה להזמנה ({cart.count} פריטים)
      </button>

      <div>
        <label className="label" htmlFor="f-name">
          שם מלא
        </label>
        <input id="f-name" className={fieldClass('name')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        {errors.name && <p className="error">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-[1.35fr_1fr] gap-3">
        <div>
          <label className="label" htmlFor="f-phone">
            טלפון
          </label>
          <input
            id="f-phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            className={`${fieldClass('phone')} text-right`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-1234567"
            autoComplete="tel"
          />
          {errors.phone && <p className="error">{errors.phone}</p>}
        </div>
        <div>
          <label className="label" htmlFor="f-room">
            מספר חדר
          </label>
          <input id="f-room" className={fieldClass('room')} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="למשל 214" />
          {errors.room && <p className="error">{errors.room}</p>}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="f-note">
          הערה או שעת מסירה מועדפת <span className="font-normal text-muted">(לא חובה)</span>
        </label>
        <textarea id="f-note" rows={2} className="field resize-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: בהפסקה של 10:00" />
      </div>

      <div>
        <span className="label">תשלום</span>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="אמצעי תשלום">
          {METHODS.map(({ id, label, Icon }) => {
            const on = method === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setMethod(id)
                  setErrors((e) => ({ ...e, proof: undefined }))
                }}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border bg-white px-2 py-3 text-sm font-medium ${on ? 'border-ink ring-1 ring-ink' : 'border-line text-muted'}`}
              >
                <Icon size={20} strokeWidth={1.8} />
                {label}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={method}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-3 rounded-2xl bg-tile p-4"
          >
            {method === 'cash' ? (
              <>
                <p className="text-sm">משלמים במזומן כשמקבלים את ההזמנה.</p>
                <span className="label mt-3">צריך עודף?</span>
                <div className="flex flex-wrap gap-2">
                  {['בדיוק', '20 ₪', '50 ₪', '100 ₪'].map((c) => (
                    <button key={c} type="button" className="chip" aria-pressed={changeFor === c} onClick={() => setChangeFor(c)}>
                      {c === 'בדיוק' ? 'יש לי בדיוק' : `עודף מ-${c}`}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[13px] text-muted">סכום להעברה</p>
                    <p className="text-3xl font-bold">{ils(total)}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] text-muted">למספר</p>
                    <p className="text-lg font-semibold tabular-nums" dir="ltr">
                      {transferPhone}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-[13px] font-semibold">1. משלמים</p>
                <button
                  type="button"
                  onClick={async () => {
                    await copyText(transferPhone.replace(/\D/g, ''))
                    ui.toast('המספר הועתק. מדביקים אותו באפליקציה ומעבירים ' + ils(total))
                    setOpened(true)
                    setTimeout(() => openPayApp(method, method === 'paybox' ? settings.payboxLink : settings.bitLink), 350)
                  }}
                  className="btn-primary mt-2 w-full py-3.5 text-base"
                >
                  {method === 'paybox' ? <Wallet size={18} /> : <Smartphone size={18} />}
                  {method === 'paybox' ? 'פתיחת PayBox לתשלום' : 'פתיחת Bit לתשלום'}
                </button>
                <div className="mt-2 flex justify-center">
                  <CopyButton text={transferPhone.replace(/\D/g, '')} label="רק להעתיק את המספר" />
                </div>
                <p className="mt-4 text-[13px] font-semibold">2. {opened ? 'חזרתם? ' : ''}מצרפים צילום של האישור</p>
                <ProofUpload proof={proof} setProof={setProof} required={method === 'paybox'} error={errors.proof} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <span className="text-muted">לתשלום</span>
        <span className="text-2xl font-bold">{ils(total)}</span>
      </div>
      <button type="button" onClick={submit} disabled={sending || (method === 'paybox' && !proof)} className="btn-primary w-full py-3.5 text-base">
        {sending ? <LoaderCircle size={18} className="animate-spin" /> : null}
        {sending ? 'שולחים...' : 'שליחת ההזמנה'}
      </button>
      {method === 'paybox' && !proof && <p className="-mt-2 text-center text-[13px] text-muted">כדי לשלוח, צרפו צילום של אישור ההעברה</p>}
    </div>
  )
}

export function CheckoutSheet({ onClose }) {
  const ui = useUI()
  const [step, setStep] = useState('cart')
  return (
    <Sheet title={step === 'cart' ? 'ההזמנה שלך' : 'פרטים ותשלום'} onClose={onClose}>
      {step === 'cart' ? (
        <CartStep onNext={() => setStep('details')} onClose={onClose} />
      ) : (
        <DetailsStep onBack={() => setStep('cart')} onDone={(id) => ui.openSheet('status', id)} />
      )}
    </Sheet>
  )
}
