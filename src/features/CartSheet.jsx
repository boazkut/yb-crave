import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sheet } from '../components/Overlays.jsx'
import { ProductArt } from '../components/ProductArt.jsx'
import { useCart } from '../state/CartContext.jsx'
import { useUI } from '../state/UIContext.jsx'
import { useData } from '../state/DataContext.jsx'
import { useLocal, LS_KEYS } from '../state/useLocal.js'
import { useSchedule } from '../components/StatusBadge.jsx'
import { storage } from '../services/storageService.js'
import { couponDiscount } from '../lib/shop.js'
import { copyText, dateKey, ils, vibrate } from '../lib/utils.js'

function Stepper({ value, onChange }) {
  return (
    <div className="flex items-center overflow-hidden rounded-[6px] border-2 border-paper/20">
      <button type="button" className="h-8 w-8 text-lg font-black" onClick={() => onChange(value - 1)} aria-label="פחות">
        −
      </button>
      <span className="min-w-[22px] text-center text-sm font-black tabular-nums">{value}</span>
      <button type="button" className="h-8 w-8 text-lg font-black" onClick={() => onChange(value + 1)} aria-label="עוד">
        +
      </button>
    </div>
  )
}

function Row({ label, value, strong, tone }) {
  return (
    <div className={`flex justify-between ${strong ? 'display pt-1 text-2xl' : 'text-sm font-bold text-paper/70'}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${tone || ''}`}>{value}</span>
    </div>
  )
}

function CartStep({ totals, onNext, onClose }) {
  const cart = useCart()
  const ui = useUI()
  const { settings } = useData()
  const [loyalty] = useLocal(LS_KEYS.loyalty, { punches: 0 })
  const [codeInput, setCodeInput] = useState(cart.couponCode)
  const goal = Number(settings.loyaltyGoal) || 8
  const owners = [...new Set(cart.lines.map((l) => l.owner).filter(Boolean))]

  if (!cart.lines.length) {
    return (
      <div className="py-10 text-center">
        <div className="text-5xl" aria-hidden="true">
          🛍️
        </div>
        <p className="display mt-3 text-2xl">השקית ריקה</p>
        <p className="mt-1 text-sm text-paper/60">תתחילו מבמבה, זה תמיד עובד.</p>
        <button type="button" onClick={onClose} className="btn-lime mt-5">
          לתפריט
        </button>
      </div>
    )
  }

  const byOwner = cart.groupMode
    ? cart.lines.reduce((acc, l) => {
        const k = l.owner?.trim() || 'בלי שם'
        acc[k] = (acc[k] || 0) + l.unitPrice * l.qty + (l.deposit || 0) * l.qty
        return acc
      }, {})
    : null

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[6px] border-2 border-paper/15 px-3 py-3">
        <span>
          <span className="block text-sm font-extrabold">הזמנה משותפת לחברים לשולחן</span>
          <span className="block text-xs text-paper/55">כותבים ליד כל פריט של מי הוא, ואנחנו מחלקים בשקית לפי שמות</span>
        </span>
        <input
          type="checkbox"
          className="h-6 w-6 shrink-0 accent-lime"
          checked={cart.groupMode}
          onChange={(e) => cart.setGroupMode(e.target.checked)}
        />
      </label>

      <ul className="space-y-2.5">
        <AnimatePresence initial={false}>
          {cart.lines.map((l) => (
            <motion.li
              key={l.key}
              layout
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30, height: 0 }}
              className="rounded-[6px] bg-coal px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <ProductArt product={{ id: l.productId, name: l.name, art: l.art, imageUrl: l.imageUrl }} className="h-12 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold leading-tight">{l.name}</div>
                  {l.details?.length > 0 && <div className="mt-0.5 text-xs leading-snug text-paper/55">{l.details.join(', ')}</div>}
                  <div className="mt-0.5 text-xs font-bold text-paper/60">
                    {l.unitPrice ? ils(l.unitPrice * l.qty) : 'חינם'}
                    {l.deposit ? ` + פיקדון ${ils(l.deposit * l.qty)}` : ''}
                  </div>
                </div>
                {l.kind === 'reward' ? (
                  <button type="button" onClick={() => cart.remove(l.key)} className="text-xs font-bold text-paper/60 underline">
                    הסר
                  </button>
                ) : (
                  <Stepper value={l.qty} onChange={(q) => cart.setQty(l.key, q)} />
                )}
              </div>
              {cart.groupMode && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={l.owner}
                    onChange={(e) => cart.setOwner(l.key, e.target.value)}
                    placeholder="של מי? (שם החבר)"
                    list="cart-owners"
                    className="field py-2 text-sm"
                  />
                  {l.qty > 1 && (
                    <button type="button" onClick={() => cart.splitOne(l.key)} className="btn-ghost shrink-0 px-2.5 py-2 text-xs">
                      פצל לחבר
                    </button>
                  )}
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <datalist id="cart-owners">
        {owners.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      {loyalty.punches >= goal && !cart.hasReward && (
        <button
          type="button"
          onClick={() =>
            cart.addCustom({
              kind: 'reward',
              name: '🎁 חמצוץ חינם (כרטיסייה)',
              unitPrice: 0,
              art: { shape: 'gummy', c1: '#B5F23A', c2: '#FF4FA3', label: 'מתנה' },
            })
          }
          className="w-full rounded-[6px] border-2 border-dashed border-lime px-3 py-3 text-sm font-extrabold text-lime"
        >
          מילאת כרטיסייה! הוסף חמצוץ חינם להזמנה
        </button>
      )}

      <div>
        <label className="label" htmlFor="coupon">
          קוד קופון
        </label>
        <div className="flex gap-2">
          <input
            id="coupon"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="למשל YB10"
            className="field uppercase"
            autoCapitalize="characters"
            dir="ltr"
          />
          <button
            type="button"
            className="btn-paper shrink-0 px-4"
            onClick={() => {
              const res = couponDiscount(settings.coupons, codeInput, cart.subtotal)
              if (res.valid) {
                cart.setCouponCode(codeInput.trim())
                ui.toast(`הקופון הופעל: חסכת ${ils(res.amount)}`)
                vibrate(15)
              } else {
                cart.setCouponCode('')
                ui.toast(res.error || 'הקוד הזה לא עובד')
              }
            }}
          >
            הפעל
          </button>
        </div>
        {totals.couponError && cart.couponCode && <p className="mt-1.5 text-xs font-bold text-cola">{totals.couponError}</p>}
      </div>

      {byOwner && (
        <div className="rounded-[6px] border-2 border-paper/12 p-3">
          <p className="mb-2 text-xs font-extrabold text-paper/60">כמה כל אחד משלם</p>
          {Object.entries(byOwner).map(([o, v]) => (
            <Row key={o} label={o} value={ils(v)} />
          ))}
        </div>
      )}

      <div className="space-y-1 border-t-2 border-paper/10 pt-3">
        <Row label="ביניים" value={ils(cart.subtotal)} />
        {totals.discount > 0 && <Row label={`קופון ${cart.couponCode}`} value={`-${ils(totals.discount)}`} tone="text-lime" />}
        {cart.deposit > 0 && <Row label="פיקדון (חוזר אליך)" value={ils(cart.deposit)} />}
        <Row label="לתשלום" value={ils(totals.total)} strong />
      </div>

      <button type="button" onClick={onNext} className="btn-lime w-full text-[17px]">
        להמשך: פרטים ותשלום
      </button>
    </div>
  )
}

const PAY_OPTIONS = [
  { id: 'bit', label: 'Bit', sub: 'משלמים עכשיו' },
  { id: 'paybox', label: 'PayBox', sub: 'משלמים עכשיו' },
  { id: 'cash', label: 'מזומן', sub: 'משלמים במסירה' },
]

function CheckoutStep({ totals, onBack, onDone }) {
  const cart = useCart()
  const ui = useUI()
  const { settings } = useData()
  const schedule = useSchedule()
  const [profile, setProfile] = useLocal(LS_KEYS.profile, { name: '', classroom: '' })
  const [, setMyOrders] = useLocal(LS_KEYS.myOrders, [])
  const [, setLastOrder] = useLocal(LS_KEYS.lastOrder, null)
  const [, setLoyalty] = useLocal(LS_KEYS.loyalty, { punches: 0, credited: [] })

  const [name, setName] = useState(profile.name || '')
  const [classroom, setClassroom] = useState(profile.classroom || '')
  const [slotId, setSlotId] = useState(schedule.next?.id || '')
  const [meetPoint, setMeetPoint] = useState(settings.meetPoints?.[0] || 'בכיתה')
  const [note, setNote] = useState('')
  const [method, setMethod] = useState('bit')
  const [claimed, setClaimed] = useState(false)
  const [payNote, setPayNote] = useState('')
  const [changeFor, setChangeFor] = useState('בדיוק')
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)

  const slot = schedule.slots.find((s) => s.id === slotId) || schedule.next
  const total = totals.total

  const copyPay = async () => {
    const phone = settings.bitPhone
    const ok = await copyText(`${total} ₪${method === 'bit' && phone ? ` | ${phone}` : ''}`)
    ui.toast(ok ? 'הסכום והמספר הועתקו' : `הסכום: ${total} ₪`)
  }

  const payLink = method === 'bit' ? settings.bitLink || 'https://www.bitpay.co.il/he' : settings.payboxLink

  const submit = async () => {
    const e = {}
    if (!name.trim()) e.name = 'צריך שם, אחרת לא נדע למי למסור'
    if (!classroom.trim()) e.classroom = 'באיזו כיתה?'
    if (!slot) e.slot = 'אין כרגע הפסקה פתוחה להזמנה'
    if (method !== 'cash' && !claimed) e.claimed = 'סמנו שהעברתם את התשלום'
    setErrors(e)
    if (Object.keys(e).length) {
      vibrate([30, 40, 30])
      return
    }
    setSending(true)
    try {
      const order = {
        createdAt: Date.now(),
        dateKey: dateKey(),
        customer: {
          name: name.trim(),
          classroom: classroom.trim(),
          slotId: slot.id,
          slotLabel: slot.label,
          slotDate: slot.dateKey,
          slotTime: slot.time,
          meetPoint,
        },
        lines: cart.lines.map((l) => ({
          kind: l.kind,
          productId: l.productId || null,
          name: l.name,
          unitPrice: l.unitPrice,
          qty: l.qty,
          owner: cart.groupMode ? l.owner?.trim() || '' : '',
          details: l.details || [],
          deposit: l.deposit || 0,
          category: l.category || l.kind,
        })),
        groupMode: cart.groupMode,
        subtotal: cart.subtotal,
        couponCode: totals.discount ? cart.couponCode : '',
        discount: totals.discount,
        deposit: cart.deposit,
        total,
        payment: {
          method,
          claimed: method !== 'cash',
          note: method !== 'cash' ? payNote.trim() : '',
          changeFor: method === 'cash' ? changeFor : '',
        },
        paid: false,
        status: 'new',
        note: note.trim(),
      }
      const saved = await storage.createOrder(order)
      setProfile({ name: name.trim(), classroom: classroom.trim() })
      setMyOrders((list) => [{ id: saved.id, number: saved.number, createdAt: saved.createdAt }, ...(list || [])].slice(0, 20))
      const keep = cart.lines.filter((l) => l.kind !== 'reward')
      if (keep.length) setLastOrder({ lines: keep.map((l) => ({ ...l, owner: '' })), at: Date.now() })
      if (cart.hasReward) {
        const goal = Number(settings.loyaltyGoal) || 8
        setLoyalty((l) => ({ ...l, punches: Math.max(0, (l.punches || 0) - goal) }))
      }
      cart.clear()
      vibrate([20, 50, 20, 50, 40])
      onDone(saved.id)
    } catch (err) {
      console.error(err)
      ui.toast('ההזמנה לא נשלחה. בדקו חיבור לאינטרנט ונסו שוב.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm font-bold text-paper/60 underline underline-offset-4">
        חזרה לעגלה
      </button>

      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <div>
          <label className="label" htmlFor="c-name">
            שם מלא
          </label>
          <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="field" autoComplete="name" />
          {errors.name && <p className="mt-1 text-xs font-bold text-cola">{errors.name}</p>}
        </div>
        <div>
          <label className="label" htmlFor="c-class">
            כיתה
          </label>
          <input id="c-class" value={classroom} onChange={(e) => setClassroom(e.target.value)} placeholder="י'3" className="field" />
          {errors.classroom && <p className="mt-1 text-xs font-bold text-cola">{errors.classroom}</p>}
        </div>
      </div>

      <div>
        <span className="label">מתי למסור?</span>
        {schedule.slots.length ? (
          <div className="flex flex-wrap gap-2">
            {schedule.slots.map((s) => (
              <button key={s.id} type="button" className="chip" aria-pressed={slotId === s.id} onClick={() => setSlotId(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-[6px] border-2 border-cola/50 bg-cola/10 px-3 py-2 text-sm font-bold">
            החנות סגורה כרגע להזמנות. נסו שוב כשהיא נפתחת.
          </p>
        )}
        {errors.slot && <p className="mt-1 text-xs font-bold text-cola">{errors.slot}</p>}
      </div>

      <div>
        <span className="label">איפה נפגשים?</span>
        <div className="flex flex-wrap gap-2">
          {(settings.meetPoints || []).map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={meetPoint === m} onClick={() => setMeetPoint(m)}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">איך משלמים?</span>
        <div className="grid grid-cols-3 gap-2">
          {PAY_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setMethod(o.id)
                setClaimed(false)
              }}
              aria-pressed={method === o.id}
              className={`rounded-[6px] border-2 px-2 py-3 text-center ${
                method === o.id ? 'border-coal bg-paper text-coal shadow-[3px_3px_0_0_#B5F23A]' : 'border-paper/20'
              }`}
            >
              <span className="display block text-xl leading-none">{o.label}</span>
              <span className="mt-1 block text-[11px] font-bold opacity-70">{o.sub}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={method}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 rounded-[6px] border-2 border-paper/15 bg-coal p-3.5"
          >
            {method === 'cash' ? (
              <>
                <p className="text-sm font-bold">משלמים במזומן כשמקבלים את השקית.</p>
                <span className="label mt-3">צריך עודף מ...?</span>
                <div className="flex flex-wrap gap-2">
                  {['בדיוק', '20 ₪', '50 ₪', '100 ₪'].map((c) => (
                    <button key={c} type="button" className="chip" aria-pressed={changeFor === c} onClick={() => setChangeFor(c)}>
                      {c === 'בדיוק' ? 'יש לי בדיוק' : c}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-paper/60">מעבירים בדיוק</p>
                    <p className="display text-4xl leading-none text-lime">{ils(total)}</p>
                  </div>
                  {method === 'bit' && settings.bitPhone && (
                    <div className="text-left">
                      <p className="text-xs font-bold text-paper/60">למספר</p>
                      <p className="font-extrabold tabular-nums" dir="ltr">
                        {settings.bitPhone}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={copyPay} className="btn-ghost px-2 py-2.5 text-sm">
                    {method === 'bit' ? 'העתק סכום ומספר' : 'העתק סכום'}
                  </button>
                  <a href={payLink} target="_blank" rel="noreferrer" className="btn-paper px-2 py-2.5 text-sm">
                    {method === 'bit' ? 'פתח את Bit' : 'לקבוצת PayBox'}
                  </a>
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-[6px] bg-coal-2 px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-6 w-6 accent-lime"
                    checked={claimed}
                    onChange={(e) => setClaimed(e.target.checked)}
                  />
                  <span className="text-sm font-extrabold">{method === 'bit' ? 'העברתי בביט' : 'שילמתי בפייבוקס'}</span>
                </label>
                {errors.claimed && <p className="mt-1 text-xs font-bold text-cola">{errors.claimed}</p>}
                <input
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="4 ספרות אחרונות / מספר אישור (לא חובה)"
                  className="field mt-2 py-2.5 text-sm"
                  inputMode="numeric"
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div>
        <label className="label" htmlFor="c-note">
          הערה (לא חובה)
        </label>
        <input id="c-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: אני ליד חדר מחשבים" className="field" />
      </div>

      <div className="flex items-center justify-between border-t-2 border-paper/10 pt-3">
        <span className="font-bold text-paper/70">סה&quot;כ</span>
        <span className="display text-3xl">{ils(total)}</span>
      </div>
      <button type="button" onClick={submit} disabled={sending || !schedule.slots.length} className="btn-red w-full text-lg">
        {sending ? 'שולחים...' : 'שליחת ההזמנה'}
      </button>
    </div>
  )
}

export function CartSheet({ onClose }) {
  const cart = useCart()
  const ui = useUI()
  const { settings } = useData()
  const [step, setStep] = useState('cart')

  const totals = useMemo(() => {
    const c = couponDiscount(settings.coupons, cart.couponCode, cart.subtotal)
    const discount = c.valid ? c.amount : 0
    return {
      discount,
      couponError: c.error,
      total: Math.max(0, Math.round((cart.subtotal - discount + cart.deposit) * 10) / 10),
    }
  }, [settings.coupons, cart.couponCode, cart.subtotal, cart.deposit])

  return (
    <Sheet title={step === 'cart' ? 'השקית שלך' : 'פרטים ותשלום'} onClose={onClose}>
      {step === 'cart' ? (
        <CartStep totals={totals} onNext={() => setStep('checkout')} onClose={onClose} />
      ) : (
        <CheckoutStep totals={totals} onBack={() => setStep('cart')} onDone={(id) => ui.openSheet('track', id)} />
      )}
    </Sheet>
  )
}
