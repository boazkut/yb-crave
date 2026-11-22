import { useState } from 'react'
import { useData } from '../state/DataContext.jsx'
import { storage } from '../services/storageService.js'
import { getSchedule } from '../lib/shop.js'
import { Card, Toggle, useAdminToast } from './adminUi.jsx'

const DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

function useSaver() {
  const toast = useAdminToast()
  return async (patch, msg = 'נשמר ✓') => {
    try {
      await storage.updateSettings(patch)
      toast(msg)
    } catch {
      toast('השמירה נכשלה')
    }
  }
}

function Field({ label, value, onSave, dir, placeholder, hint, type = 'text' }) {
  const [v, setV] = useState(value ?? '')
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    setV(value ?? '')
  }
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type={type}
        value={v}
        dir={dir}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== (value ?? '') && onSave(v.trim())}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="field py-2.5 text-sm"
      />
      {hint && <span className="mt-1 block text-[11px] text-paper/45">{hint}</span>}
    </label>
  )
}

function Coupons() {
  const { settings } = useData()
  const save = useSaver()
  const [code, setCode] = useState('')
  const [kind, setKind] = useState('percent')
  const [value, setValue] = useState(10)
  const coupons = settings.coupons || []

  const add = () => {
    const c = code.trim().toUpperCase()
    if (!c) return
    const rest = coupons.filter((x) => x.code.toUpperCase() !== c)
    save({ coupons: [...rest, { code: c, kind, value: Number(value) || 0, active: true }] }, `הקופון ${c} נוצר`)
    setCode('')
  }

  return (
    <Card title="קודי קופון">
      <ul className="space-y-2">
        {coupons.map((c) => (
          <li key={c.code} className="flex items-center gap-3 rounded-[6px] bg-coal px-3 py-2">
            <span className="font-black tracking-wide" dir="ltr">
              {c.code}
            </span>
            <span className="flex-1 text-sm text-paper/60">{c.kind === 'percent' ? `${c.value}% הנחה` : `${c.value} ₪ הנחה`}</span>
            <Toggle
              checked={c.active}
              label={`הפעלת ${c.code}`}
              onChange={(v) => save({ coupons: coupons.map((x) => (x.code === c.code ? { ...x, active: v } : x)) })}
            />
            <button
              type="button"
              aria-label={`מחיקת ${c.code}`}
              className="text-lg text-paper/40"
              onClick={() => save({ coupons: coupons.filter((x) => x.code !== c.code) }, 'הקופון נמחק')}
            >
              ✕
            </button>
          </li>
        ))}
        {!coupons.length && <li className="text-sm text-paper/50">אין קופונים עדיין.</li>}
      </ul>
      <div className="mt-3 grid grid-cols-[1fr_auto_70px] gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="קוד חדש" className="field py-2.5 text-sm uppercase" dir="ltr" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="field px-2 py-2.5 text-sm">
          <option value="percent">%</option>
          <option value="fixed">₪</option>
        </select>
        <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="field px-2 py-2.5 text-center text-sm" aria-label="ערך הנחה" />
      </div>
      <button type="button" onClick={add} className="btn-lime mt-2 w-full py-2.5 text-sm">
        יצירת קופון
      </button>
    </Card>
  )
}

function Breaks() {
  const { settings } = useData()
  const save = useSaver()
  const [list, setList] = useState(settings.breaks || [])
  const [prev, setPrev] = useState(settings.breaks)
  if (settings.breaks !== prev) {
    setPrev(settings.breaks)
    setList(settings.breaks || [])
  }
  const next = getSchedule(settings).next

  return (
    <Card title="הפסקות וזמני חלוקה">
      <p className="mb-3 text-xs text-paper/55">
        {next ? `ההפסקה הבאה שאפשר להזמין אליה: ${next.label}` : 'אין כרגע הפסקה פתוחה להזמנה.'}
      </p>
      <div className="space-y-2">
        {list.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="time"
              value={t}
              onChange={(e) => setList(list.map((x, j) => (j === i ? e.target.value : x)))}
              className="field py-2 text-center"
              dir="ltr"
            />
            <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label="מחיקת הפסקה">
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn-ghost flex-1 py-2 text-sm" onClick={() => setList([...list, '12:00'])}>
          + הפסקה
        </button>
        <button type="button" className="btn-lime flex-1 py-2 text-sm" onClick={() => save({ breaks: [...list].filter(Boolean).sort() }, 'זמני ההפסקות עודכנו')}>
          שמירת הפסקות
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field
          label="סגירת הזמנות (דק' לפני)"
          type="number"
          value={String(settings.cutoffMinutes)}
          onSave={(v) => save({ cutoffMinutes: Number(v) || 0 })}
        />
        <div>
          <span className="label">ימי פעילות</span>
          <div className="flex gap-1" dir="rtl">
            {DAYS.map((d, i) => {
              const on = settings.schoolDays?.includes(i)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    save({ schoolDays: on ? settings.schoolDays.filter((x) => x !== i) : [...(settings.schoolDays || []), i].sort() })
                  }
                  className={`h-9 flex-1 rounded-[4px] border-2 text-xs font-black ${on ? 'border-coal bg-lime text-coal' : 'border-paper/15'}`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}

function Votes() {
  const { settings, votes } = useData()
  const save = useSaver()
  const toast = useAdminToast()
  const [text, setText] = useState((settings.voteOptions || []).join('\n'))
  const total = Object.values(votes.counts || {}).reduce((a, b) => a + b, 0)

  return (
    <Card title="הצבעה למוצר הבא">
      <ul className="mb-3 space-y-1 text-sm">
        {(settings.voteOptions || []).map((o) => (
          <li key={o} className="flex justify-between">
            <span>{o}</span>
            <span className="font-black tabular-nums">{votes.counts?.[o] || 0}</span>
          </li>
        ))}
        <li className="text-xs text-paper/50">סה"כ {total} הצבעות בסבב {votes.round}</li>
      </ul>
      <label className="block">
        <span className="label">אפשרויות (שורה לכל מוצר)</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="field text-sm" />
      </label>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="btn-lime flex-1 py-2 text-sm"
          onClick={() => save({ voteOptions: text.split('\n').map((s) => s.trim()).filter(Boolean) }, 'האפשרויות עודכנו')}
        >
          שמירה
        </button>
        <button
          type="button"
          className="btn-ghost flex-1 py-2 text-sm"
          onClick={async () => {
            if (!window.confirm('לפתוח סבב הצבעה חדש? כל הקולות יתאפסו.')) return
            await storage.resetVotes()
            toast('סבב הצבעה חדש נפתח')
          }}
        >
          סבב חדש
        </button>
      </div>
    </Card>
  )
}

function Security() {
  const { mode } = useData()
  const toast = useAdminToast()
  const [v, setV] = useState('')
  const isPin = mode === 'local'
  return (
    <Card title={isPin ? 'קוד PIN לדשבורד' : 'סיסמת מנהל'}>
      <div className="flex gap-2">
        <input
          type="password"
          inputMode={isPin ? 'numeric' : 'text'}
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder={isPin ? 'PIN חדש (4 ספרות ומעלה)' : 'סיסמה חדשה (6 תווים ומעלה)'}
          className="field py-2.5 text-sm"
        />
        <button
          type="button"
          className="btn-paper shrink-0 px-4 py-2.5 text-sm"
          onClick={async () => {
            if (v.length < (isPin ? 4 : 6)) return toast(isPin ? 'לפחות 4 ספרות' : 'לפחות 6 תווים')
            try {
              await storage.changeAdminSecret(v)
              setV('')
              toast('הקוד הוחלף')
            } catch (e) {
              toast(e.message || 'ההחלפה נכשלה')
            }
          }}
        >
          החלפה
        </button>
      </div>
    </Card>
  )
}

function DataTools() {
  const toast = useAdminToast()
  const { mode } = useData()
  const exportData = async () => {
    const data = await storage.exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `yb-crave-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('הגיבוי ירד לטלפון')
  }
  const importData = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!window.confirm('לייבא את הגיבוי? הנתונים הקיימים יוחלפו.')) return
      await storage.importAll(data)
      toast('הגיבוי שוחזר')
    } catch {
      toast('הקובץ לא תקין')
    } finally {
      e.target.value = ''
    }
  }
  return (
    <Card title="גיבוי נתונים">
      <p className="mb-3 text-xs text-paper/55">
        {mode === 'firebase' ? 'הנתונים מסונכרנים ב-Firebase.' : 'הנתונים שמורים רק בטלפון הזה. מומלץ לגבות מדי פעם.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-ghost py-2.5 text-sm" onClick={exportData}>
          הורדת גיבוי
        </button>
        <label className="btn-ghost cursor-pointer py-2.5 text-sm">
          שחזור מגיבוי
          <input type="file" accept="application/json" className="hidden" onChange={importData} />
        </label>
      </div>
    </Card>
  )
}

export function ControlCenter() {
  const { settings } = useData()
  const save = useSaver()
  const [marquee, setMarquee] = useState(settings.marquee)

  return (
    <div className="space-y-4">
      <h1 className="display text-3xl leading-none">מרכז שליטה</h1>

      <section
        className={`flex items-center justify-between gap-4 rounded-[8px] border-2 border-coal p-4 ${settings.storeOpen ? 'bg-lime text-coal' : 'bg-cola text-paper'}`}
        style={{ boxShadow: '5px 5px 0 0 #0E0D0B' }}
      >
        <div>
          <p className="display text-2xl leading-none">{settings.storeOpen ? 'החנות פתוחה' : 'החנות סגורה'}</p>
          <p className="mt-1 text-xs font-bold opacity-75">מתג חירום: סוגר את ההזמנות לכולם מיד</p>
        </div>
        <Toggle big checked={settings.storeOpen} label="החנות פתוחה" onChange={(v) => save({ storeOpen: v }, v ? 'החנות נפתחה' : 'החנות נסגרה')} />
      </section>

      <Card title="פס החדשות הרץ">
        <textarea value={marquee} onChange={(e) => setMarquee(e.target.value)} rows={3} className="field text-sm" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['🔥 עכשיו במלאי: ', 'הזמנות להפסקה הבאה נסגרות בקרוב', 'הגיעו חמצוצים חדשים 🍋', '🧊 קולה קפואה'].map((s) => (
            <button key={s} type="button" className="chip px-2.5 py-1 text-xs" onClick={() => setMarquee((m) => `${m} • ${s}`)}>
              + {s}
            </button>
          ))}
        </div>
        <button type="button" className="btn-lime mt-3 w-full py-2.5 text-sm" onClick={() => save({ marquee }, 'הפס הרץ עודכן')}>
          שמירה
        </button>
      </Card>

      <Breaks />

      <Card title="תשלומים ויצירת קשר">
        <div className="space-y-3">
          <Field label="מספר טלפון ל-Bit" value={settings.bitPhone} dir="ltr" onSave={(v) => save({ bitPhone: v })} />
          <Field
            label="קישור תשלום Bit (לא חובה)"
            value={settings.bitLink}
            dir="ltr"
            placeholder="https://..."
            hint="אם ריק, הכפתור פותח את אתר/אפליקציית Bit והלקוח מעביר למספר שלמעלה"
            onSave={(v) => save({ bitLink: v })}
          />
          <Field label="קישור לקבוצת PayBox" value={settings.payboxLink} dir="ltr" placeholder="https://payboxapp.page.link/..." onSave={(v) => save({ payboxLink: v })} />
          <Field
            label="WhatsApp לקבלת הזמנות"
            value={settings.whatsappNumber}
            dir="ltr"
            placeholder="972501234567"
            hint="פורמט בינלאומי בלי + ובלי 0 בהתחלה"
            onSave={(v) => save({ whatsappNumber: v.replace(/\D/g, '') })}
          />
          <Field
            label="נקודות מפגש (מופרדות בפסיק)"
            value={(settings.meetPoints || []).join(', ')}
            onSave={(v) => save({ meetPoints: v.split(',').map((s) => s.trim()).filter(Boolean) })}
          />
        </div>
      </Card>

      <Coupons />
      <Votes />

      <Card title="תפריט סודי וכרטיסייה">
        <div className="grid grid-cols-2 gap-3">
          <Field label="קוד סודי (מקלידים בחיפוש)" value={settings.secretCode} dir="ltr" onSave={(v) => save({ secretCode: v })} />
          <Field label="ניקובים למתנה" type="number" value={String(settings.loyaltyGoal)} onSave={(v) => save({ loyaltyGoal: Number(v) || 8 })} />
        </div>
        <p className="mt-2 text-[11px] text-paper/45">התפריט הסודי נפתח גם ב-5 לחיצות מהירות על הלוגו.</p>
      </Card>

      <Security />
      <DataTools />
    </div>
  )
}
