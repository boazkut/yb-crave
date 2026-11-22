import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext.jsx'
import { storage } from '../services/storageService.js'
import { useOrders } from './OrdersBoard.jsx'
import { PAYMENT } from '../lib/shop.js'
import { dateKey, ils, uid } from '../lib/utils.js'
import { Card, Segmented, useAdminToast } from './adminUi.jsx'

const startOfWeek = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.getTime()
}

function Line({ label, value, strong, tone, sub }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className={strong ? 'font-extrabold' : 'text-sm font-bold text-paper/70'}>
        {label}
        {sub && <span className="block text-[11px] font-medium text-paper/45">{sub}</span>}
      </span>
      <span className={`tabular-nums ${strong ? 'display text-2xl' : 'text-sm font-extrabold'} ${tone || ''}`}>{value}</span>
    </div>
  )
}

export function Finance() {
  const orders = useOrders()
  const { settings, products } = useData()
  const toast = useAdminToast()
  const [period, setPeriod] = useState('today')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const inPeriod = useMemo(() => {
    const today = dateKey()
    const week = startOfWeek()
    return (ts, dk) => (period === 'all' ? true : period === 'today' ? (dk || dateKey(new Date(ts))) === today : ts >= week)
  }, [period])

  const stats = useMemo(() => {
    const list = (orders || []).filter((o) => o.status !== 'cancelled' && inPeriod(o.createdAt, o.dateKey))
    const net = (o) => (o.total || 0) - (o.deposit || 0)
    const confirmed = list.filter((o) => o.paid)
    const pending = list.filter((o) => !o.paid)
    const byMethod = Object.fromEntries(Object.keys(PAYMENT).map((m) => [m, confirmed.filter((o) => o.payment?.method === m).reduce((s, o) => s + net(o), 0)]))
    const items = {}
    for (const o of list)
      for (const l of o.lines || []) {
        const k = l.name
        items[k] = (items[k] || 0) + l.qty
      }
    const top = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const depositsHeld = list.filter((o) => o.status !== 'delivered').reduce((s, o) => s + (o.deposit || 0), 0)
    return {
      count: list.length,
      revenue: confirmed.reduce((s, o) => s + net(o), 0),
      pending: pending.reduce((s, o) => s + net(o), 0),
      pendingCount: pending.length,
      byMethod,
      top,
      depositsHeld,
      discounts: list.reduce((s, o) => s + (o.discount || 0), 0),
    }
  }, [orders, inPeriod])

  const costs = (settings.costLog || []).filter((c) => inPeriod(c.at, c.dateKey))
  const costTotal = costs.reduce((s, c) => s + Number(c.amount || 0), 0)
  const profit = stats.revenue - costTotal
  const half = Math.round((profit / 2) * 100) / 100
  const wanted = products.filter((p) => p.notifyCount > 0).sort((a, b) => b.notifyCount - a.notifyCount)

  const addCost = async (e) => {
    e.preventDefault()
    const n = Number(amount)
    if (!n) return toast('הכניסו סכום')
    await storage.updateSettings({
      costLog: [...(settings.costLog || []), { id: uid('c_'), amount: n, note: note.trim() || 'קניית סחורה', at: Date.now(), dateKey: dateKey() }],
    })
    setAmount('')
    setNote('')
    toast('ההוצאה נרשמה')
  }
  const removeCost = async (id) => {
    await storage.updateSettings({ costLog: (settings.costLog || []).filter((c) => c.id !== id) })
    toast('ההוצאה נמחקה')
  }

  if (!orders) return <p className="py-10 text-center text-paper/60">טוענים...</p>

  return (
    <div className="space-y-4">
      <h1 className="display text-3xl leading-none">כספים</h1>
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'today', label: 'היום' },
          { value: 'week', label: 'השבוע' },
          { value: 'all', label: 'מההתחלה' },
        ]}
      />

      <section className="rounded-[8px] border-2 border-coal bg-paper p-4 text-coal" style={{ boxShadow: '5px 5px 0 0 #B5F23A' }}>
        <p className="text-sm font-bold text-coal/60">רווח נקי לחלוקה</p>
        <p className={`display text-5xl leading-none ${profit < 0 ? 'text-cola' : ''}`}>{ils(profit)}</p>
        <p className="mt-1 text-xs font-bold text-coal/55">
          הכנסות מאושרות {ils(stats.revenue)} פחות הוצאות {ils(costTotal)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {['Y', 'B'].map((who) => (
            <div key={who} className="rounded-[6px] border-2 border-coal bg-coal px-3 py-3 text-paper">
              <p className="display text-3xl leading-none text-lime">{who}</p>
              <p className="mt-1 text-xs font-bold text-paper/60">מגיע ל-{who} (50%)</p>
              <p className="display mt-1 text-2xl leading-none">{ils(half)}</p>
            </div>
          ))}
        </div>
      </section>

      <Card title="הכנסות">
        <div className="divide-y divide-paper/10">
          <Line label="הזמנות (בלי מבוטלות)" value={stats.count} />
          <Line label="שולם ואושר" value={ils(stats.revenue)} tone="text-lime" />
          {Object.entries(stats.byMethod).map(([m, v]) => (
            <Line key={m} label={`  ${PAYMENT[m].label}`} value={ils(v)} />
          ))}
          <Line label="ממתין לאימות / מזומן שלא נגבה" sub={`${stats.pendingCount} הזמנות`} value={ils(stats.pending)} tone="text-[#FFB000]" />
          {stats.discounts > 0 && <Line label="הנחות קופונים" value={`-${ils(stats.discounts)}`} />}
          {stats.depositsHeld > 0 && <Line label="פיקדונות מטענים (להחזיר)" value={ils(stats.depositsHeld)} />}
        </div>
        <p className="mt-2 text-[11px] text-paper/45">הכנסות נספרות רק אחרי שסימנתם "שולם ✅" בהזמנה. פיקדונות לא נספרים כהכנסה.</p>
      </Card>

      <Card title="עלות סחורה והוצאות">
        <form onSubmit={addCost} className="grid grid-cols-[90px_1fr_auto] gap-2">
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₪" className="field px-2 py-2.5 text-center text-sm" aria-label="סכום" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="על מה? (למשל: קניות בסופר)" className="field py-2.5 text-sm" />
          <button type="submit" className="btn-lime px-3 py-2.5 text-sm">
            הוסף
          </button>
        </form>
        <ul className="mt-3 space-y-1.5">
          {costs
            .slice()
            .reverse()
            .map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-[6px] bg-coal px-3 py-2 text-sm">
                <span className="font-black tabular-nums">{ils(c.amount)}</span>
                <span className="flex-1 truncate text-paper/70">{c.note}</span>
                <span className="text-[11px] text-paper/40">{new Date(c.at).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</span>
                <button type="button" onClick={() => removeCost(c.id)} className="text-paper/40" aria-label="מחיקת הוצאה">
                  ✕
                </button>
              </li>
            ))}
          {!costs.length && <li className="text-sm text-paper/50">אין הוצאות בתקופה הזאת.</li>}
        </ul>
        <Line label="סה״כ הוצאות" value={ils(costTotal)} strong />
      </Card>

      <Card title="הכי נמכרים">
        {stats.top.length ? (
          <ol className="space-y-1.5">
            {stats.top.map(([name, qty], i) => (
              <li key={name} className="flex items-center gap-3 text-sm">
                <span className="display w-5 text-lg text-lime">{i + 1}</span>
                <span className="flex-1 font-bold">{name}</span>
                <span className="font-black tabular-nums">{qty} יח'</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-paper/50">עוד אין מכירות בתקופה הזאת.</p>
        )}
      </Card>

      <Card title='ביקוש למוצרים שאזלו ("תודיעו לי")'>
        {wanted.length ? (
          <ul className="space-y-1.5">
            {wanted.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span className="font-bold">{p.name}</span>
                <span className="font-black text-[#FFB000]">🔔 {p.notifyCount}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-paper/50">אף אחד לא מחכה למוצר כרגע.</p>
        )}
      </Card>
    </div>
  )
}
