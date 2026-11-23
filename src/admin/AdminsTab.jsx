import { useEffect, useState } from 'react'
import { ShieldCheck, UserPlus, X } from 'lucide-react'
import { storage } from '../services/storageService.js'
import { useData } from '../state/DataContext.jsx'
import { Section, useToast } from './ui.jsx'

const ROLE = { owner: 'מנהל ראשי', admin: 'מנהל' }

export function AdminsTab({ auth }) {
  const { mode } = useData()
  const toast = useToast()
  const pinMode = mode !== 'firebase'
  const [admins, setAdmins] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState('admin')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const isOwner = auth.role === 'owner'

  useEffect(() => storage.subscribeAdmins(setAdmins), [])

  const keyOf = (a) => a.id || a.email
  const isMe = (a) => (a.id && a.id === auth.id) || (a.email && a.email === auth.email)

  const add = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setErr('צריך שם')
    if (pinMode && !/^\d{6,8}$/.test(pin)) return setErr('קוד אישי של 6–8 ספרות')
    if (!pinMode && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr('האימייל לא תקין')
    setErr('')
    setBusy(true)
    try {
      await storage.addAdmin({ name: name.trim(), email: email.trim().toLowerCase(), pin, role })
      toast(`${name.trim()} נוסף כ${ROLE[role]}`)
      setName('')
      setEmail('')
      setPin('')
      setRole('admin')
    } catch (ex) {
      setErr(ex.message || 'ההוספה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (a) => {
    if (!window.confirm(`להסיר את הרשאת הניהול של ${a.name}?`)) return
    try {
      await storage.removeAdmin(keyOf(a))
      toast('ההרשאה הוסרה')
    } catch (ex) {
      toast(ex.message || 'ההסרה נכשלה')
    }
  }

  const sorted = (admins || []).slice().sort((a, b) => (a.role === 'owner' ? 0 : 1) - (b.role === 'owner' ? 0 : 1) || (a.addedAt || 0) - (b.addedAt || 0))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">מנהלים והרשאות</h1>

      <Section title="מי יכול לנהל">
        {!admins ? (
          <p className="text-sm text-muted">טוענים...</p>
        ) : (
          <ul className="divide-y divide-line">
            {sorted.map((a) => (
              <li key={keyOf(a)} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tile text-sm font-semibold">{(a.name || '?').trim().charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">
                    {a.name} {isMe(a) && <span className="text-muted">(את/ה)</span>}
                  </p>
                  {a.email && (
                    <p className="truncate text-[13px] text-muted" dir="ltr">
                      {a.email}
                    </p>
                  )}
                </div>
                <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${a.role === 'owner' ? 'bg-ink text-white' : 'bg-tile'}`}>
                  {a.role === 'owner' && <ShieldCheck size={13} />}
                  {ROLE[a.role] || 'מנהל'}
                </span>
                {isOwner && !isMe(a) && (
                  <button type="button" onClick={() => remove(a)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted" aria-label={`הסרת הרשאת ניהול של ${a.name}`}>
                    <X size={17} />
                  </button>
                )}
              </li>
            ))}
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
            {pinMode ? (
              <div>
                <label className="label" htmlFor="a-pin">
                  קוד כניסה אישי (6–8 ספרות)
                </label>
                <input id="a-pin" inputMode="numeric" className="field tracking-[0.3em]" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} />
              </div>
            ) : (
              <div>
                <label className="label" htmlFor="a-email">
                  אימייל
                </label>
                <input id="a-email" type="email" dir="ltr" className="field text-right" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
            {err && <p className="error">{err}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              <UserPlus size={18} /> הוספה
            </button>
          </form>
          <p className="hint">
            {pinMode
              ? 'תמסרו לו את הקוד. הוא נכנס עם הקוד הזה בכניסת המנהלים, ואפשר להסיר אותו כאן בכל רגע.'
              : 'המנהל החדש נכנס לכניסת המנהלים, בוחר "כניסה ראשונה", יוצר סיסמה לאימייל הזה ומאשר את מייל האימות.'}
          </p>
        </Section>
      ) : (
        <p className="text-sm text-muted">רק מנהל ראשי יכול להוסיף או להסיר מנהלים.</p>
      )}
    </div>
  )
}
