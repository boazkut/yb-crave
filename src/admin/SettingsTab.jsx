import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useData } from '../state/DataContext.jsx'
import { storage } from '../services/storageService.js'
import { PAYMENT } from '../lib/shop.js'
import { dateKey, ils, uid } from '../lib/utils.js'
import { useAllOrders } from './OrdersTab.jsx'
import { Section, Segmented, Toggle, useToast } from './ui.jsx'

function Field({ label, value, onSave, hint, dir }) {
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
        className={`field py-2.5 text-sm ${dir === 'ltr' ? 'text-right' : ''}`}
        dir={dir}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v.trim() !== (value || '') && onSave(v.trim())}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {hint && <span className="hint block">{hint}</span>}
    </label>
  )
}

function Row({ label, value, strong, sub }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className={strong ? 'font-semibold' : 'text-sm text-muted'}>
        {label}
        {sub && <span className="block text-[12px]">{sub}</span>}
      </span>
      <span className={`tabular-nums ${strong ? 'text-xl font-bold' : 'text-sm font-semibold'}`}>{value}</span>
    </div>
  )
}

const startOfWeek = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.getTime()
}

function Finance() {
  const orders = useAllOrders(0)
  const { settings } = useData()
  const toast = useToast()
  const [period, setPeriod] = useState('today')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const inPeriod = useMemo(() => {
    const today = dateKey()
    const week = startOfWeek()
    return (ts) => (period === 'all' ? true : period === 'today' ? dateKey(new Date(ts)) === today : ts >= week)
  }, [period])

  const s = useMemo(() => {
    const list = (orders || []).filter((o) => o.status !== 'cancelled' && o.status !== 'rejected' && inPeriod(o.createdAt))
    const paid = list.filter((o) => o.paid)
    const by = Object.fromEntries(Object.keys(PAYMENT).map((m) => [m, paid.filter((o) => o.payment?.method === m).reduce((a, o) => a + o.total, 0)]))
    return {
      revenue: paid.reduce((a, o) => a + o.total, 0),
      pending: list.filter((o) => !o.paid).reduce((a, o) => a + o.total, 0),
      count: list.length,
      by,
    }
  }, [orders, inPeriod])

  const costs = (settings.costLog || []).filter((c) => inPeriod(c.at))
  const costTotal = costs.reduce((a, c) => a + Number(c.amount || 0), 0)
  const profit = s.revenue - costTotal
  const half = Math.round((profit / 2) * 100) / 100

  const addCost = async (e) => {
    e.preventDefault()
    const n = Number(amount)
    if (!n) return toast('כתבו סכום')
    await storage.updateSettings({ costLog: [...(settings.costLog || []), { id: uid('c_'), amount: n, note: note.trim() || 'קניית סחורה', at: Date.now() }] })
    setAmount('')
    setNote('')
    toast('ההוצאה נרשמה')
  }

  return (
    <Section title="סיכום כספי">
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'today', label: 'היום' },
          { value: 'week', label: 'השבוע' },
          { value: 'all', label: 'מההתחלה' },
        ]}
      />
      {!orders ? (
        <p className="py-6 text-center text-sm text-muted">טוענים...</p>
      ) : (
        <>
          <div className="mt-3 divide-y divide-line">
            <Row label="הכנסות מאושרות" value={ils(s.revenue)} strong />
            {Object.entries(s.by).map(([m, v]) => (
              <Row key={m} label={PAYMENT[m].label} value={ils(v)} />
            ))}
            <Row label="עוד לא אושר / לא נגבה" value={ils(s.pending)} sub={`${s.count} הזמנות בתקופה`} />
          </div>

          <h3 className="mt-5 text-[15px] font-semibold">עלות סחורה</h3>
          <form onSubmit={addCost} className="mt-2 grid grid-cols-[84px_1fr_auto] gap-2">
            <input type="number" inputMode="decimal" className="field px-2 py-2.5 text-center text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₪" aria-label="סכום" />
            <input className="field py-2.5 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="על מה (לא חובה)" />
            <button type="submit" className="btn-secondary px-3 text-sm">
              הוספה
            </button>
          </form>
          <ul className="mt-2 divide-y divide-line">
            {costs
              .slice()
              .reverse()
              .map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-semibold tabular-nums">{ils(c.amount)}</span>
                  <span className="flex-1 truncate text-muted">{c.note}</span>
                  <span className="text-[12px] text-muted">{new Date(c.at).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</span>
                  <button
                    type="button"
                    onClick={() => storage.updateSettings({ costLog: (settings.costLog || []).filter((x) => x.id !== c.id) })}
                    className="text-muted"
                    aria-label="מחיקת הוצאה"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
          </ul>

          <div className="mt-4 rounded-2xl bg-tile p-4">
            <Row label="רווח נקי" value={ils(profit)} strong sub={`${ils(s.revenue)} פחות ${ils(costTotal)} סחורה`} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['Y', 'B'].map((w) => (
                <div key={w} className="rounded-xl bg-white p-3">
                  <p className="text-[13px] text-muted">מגיע ל-{w} (50%)</p>
                  <p className="text-xl font-bold">{ils(half)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Section>
  )
}

function MyCode() {
  const toast = useToast()
  const [pin, setPin] = useState('')
  if (!storage.changeAdminSecret) return null
  return (
    <Section title="הקוד האישי שלי">
      <div className="flex gap-2">
        <input
          type="password"
          inputMode="numeric"
          className="field py-2.5 tracking-[0.3em]"
          placeholder="קוד חדש (4–8 ספרות)"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
        />
        <button
          type="button"
          className="btn-secondary shrink-0 px-4 text-sm"
          disabled={pin.length < 4}
          onClick={async () => {
            try {
              await storage.changeAdminSecret(pin)
              setPin('')
              toast('הקוד הוחלף')
            } catch (e) {
              toast(e.message || 'ההחלפה נכשלה')
            }
          }}
        >
          החלפה
        </button>
      </div>
    </Section>
  )
}

export function SettingsTab() {
  const { settings, mode } = useData()
  const toast = useToast()
  const save = (patch, msg = 'נשמר') => storage.updateSettings(patch).then(() => toast(msg))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">הגדרות</h1>

      <Section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{settings.storeOpen ? 'החנות פתוחה' : 'החנות סגורה'}</p>
            <p className="text-[13px] text-muted">כשהחנות סגורה אי אפשר לשלוח הזמנות</p>
          </div>
          <Toggle checked={settings.storeOpen} onChange={(v) => save({ storeOpen: v }, v ? 'החנות נפתחה' : 'החנות נסגרה')} label="החנות פתוחה" />
        </div>
      </Section>

      <Section title="תשלומים">
        <div className="space-y-3">
          <Field label="מספר טלפון להעברות (PayBox ו-Bit)" dir="ltr" value={settings.transferPhone} onSave={(v) => save({ transferPhone: v })} />
          <Field label="קישור לפתיחת PayBox" dir="ltr" value={settings.payboxLink} onSave={(v) => save({ payboxLink: v })} hint="למשל קישור לקבוצת PayBox שלכם" />
          <Field label="קישור לפתיחת Bit" dir="ltr" value={settings.bitLink} onSave={(v) => save({ bitLink: v })} />
          <Field
            label="טלפונים לבעיות (מוצגים בתחתית האתר, מופרדים בפסיק)"
            value={(settings.supportPhones || []).join(', ')}
            onSave={(v) => save({ supportPhones: v.split(',').map((x) => x.trim()).filter(Boolean) })}
          />
          <Field
            label="וואטסאפ לפניות לקוחות"
            dir="ltr"
            value={settings.whatsappNumber}
            onSave={(v) => save({ whatsappNumber: v.replace(/\D/g, '') })}
            hint="בפורמט 9725XXXXXXXX"
          />
        </div>
      </Section>

      <Finance />

      <MyCode />

      <Section title="תחזוקה">
        <button
          type="button"
          className="btn-secondary w-full text-sm"
          onClick={async () => {
            const n = await storage.purgeProofs(7)
            toast(n ? `נמחקו ${n} צילומי תשלום ישנים` : 'אין צילומים ישנים למחיקה')
          }}
        >
          מחיקת צילומי תשלום של הזמנות שהסתיימו לפני יותר משבוע
        </button>
        <p className="hint">שומר את המסד קטן ובחינם. ההזמנות עצמן לא נמחקות.</p>
        <button
          type="button"
          className="btn-ghost mt-2 w-full text-sm"
          onClick={async () => {
            await storage.seedCatalog()
            toast('מוצרים שחסרו מהקטלוג המקורי נוספו')
          }}
        >
          הוספת מוצרים שחסרים מהקטלוג המקורי
        </button>
      </Section>

      {mode === 'demo' && (
        <Section title="מצב דמו">
          <p className="text-sm leading-relaxed text-muted">
            כרגע הכל נשמר רק בטלפון הזה, ולכן הזמנות של לקוחות אחרים לא יופיעו כאן. כדי לעבור לגרסה האמיתית מחברים Firebase:
            יוצרים פרויקט, מפעילים Firestore ו-Authentication (Email/Password + Anonymous), מדביקים את firestore.rules, ומוסיפים את
            פרטי החיבור כמשתני סביבה באתר. ההוראות המלאות נמצאות ב-README.
          </p>
        </Section>
      )}
    </div>
  )
}
