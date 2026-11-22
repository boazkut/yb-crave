import { useEffect, useState } from 'react'
import { ShieldCheck, UserPlus, X } from 'lucide-react'
import { storage } from '../services/storageService.js'
import { useData } from '../state/DataContext.jsx'
import { Section, useToast } from './ui.jsx'

const ROLE = { owner: 'מנהל ראשי', admin: 'מנהל' }

export function AdminsTab({ auth }) {
  const { mode } = useData()
  const toast = useToast()
  const [admins, setAdmins] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')
  const [err, setErr] = useState('')
  const isOwner = auth.role === 'owner'

  useEffect(() => storage.subscribeAdmins(setAdmins), [])

  const add = async (e) => {
    e.preventDefault()
    const em = email.trim().toLowerCase()
    if (!name.trim()) return setErr('צריך שם')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setErr('האימייל לא תקין')
    setErr('')
    try {
      await storage.addAdmin({ name, email: em, role })
      toast(`${name.trim()} נוסף כ${ROLE[role]}`)
      setName('')
      setEmail('')
      setRole('admin')
    } catch {
      setErr('ההוספה נכשלה. רק מנהל ראשי יכול להוסיף מנהלים.')
    }
  }

  const remove = async (a) => {
    if (!window.confirm(`להסיר את הרשאת הניהול של ${a.name}?`)) return
    try {
      await storage.removeAdmin(a.email)
      toast('ההרשאה הוסרה')
    } catch {
      toast('ההסרה נכשלה')
    }
  }

  const sorted = (admins || []).slice().sort((a, b) => (a.role === 'owner' ? -1 : 1) - (b.role === 'owner' ? -1 : 1) || (a.addedAt || 0) - (b.addedAt || 0))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">מנהלים והרשאות</h1>

      <Section title="מי יכול לנהל">
        {!admins ? (
          <p className="text-sm text-muted">טוענים...</p>
        ) : (
          <ul className="divide-y divide-line">
            {sorted.map((a) => {
              const me = a.email === auth.email
              return (
                <li key={a.email} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tile text-sm font-semibold">
                    {(a.name || a.email).trim().charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">
                      {a.name || a.email} {me && <span className="text-muted">(את/ה)</span>}
                    </p>
                    <p className="truncate text-[13px] text-muted" dir="ltr">
                      {a.email}
                    </p>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${a.role === 'owner' ? 'bg-ink text-white' : 'bg-tile'}`}>
                    {a.role === 'owner' && <ShieldCheck size={13} />}
                    {ROLE[a.role] || 'מנהל'}
                  </span>
                  {isOwner && !me && a.role !== 'owner' && (
                    <button type="button" onClick={() => remove(a)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted" aria-label={`הסרת הרשאת ניהול של ${a.name}`}>
                      <X size={17} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {isOwner ? (
        <Section title="הוספת מנהל חדש">
          <form onSubmit={add} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="a-name">
                  שם
                </label>
                <input id="a-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="a-role">
                  תפקיד
                </label>
                <select id="a-role" className="field" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="admin">מנהל</option>
                  <option value="owner">מנהל ראשי</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="a-email">
                אימייל
              </label>
              <input id="a-email" type="email" dir="ltr" className="field text-right" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {err && <p className="error">{err}</p>}
            <button type="submit" className="btn-primary w-full">
              <UserPlus size={18} /> הוספה
            </button>
          </form>
          <p className="hint">
            {mode === 'demo'
              ? 'במצב דמו הרשימה נשמרת רק בטלפון הזה.'
              : 'אחרי ההוספה, המנהל החדש נכנס ל-/admin, בוחר "כניסה ראשונה", יוצר סיסמה לאימייל הזה ומאשר את מייל האימות.'}
          </p>
        </Section>
      ) : (
        <p className="text-sm text-muted">רק מנהל ראשי יכול להוסיף או להסיר מנהלים.</p>
      )}
    </div>
  )
}
