import { useEffect, useState } from 'react'
import { ClipboardList, LoaderCircle, LogOut, Package, Settings, Store, Users } from 'lucide-react'
import { storage } from '../services/storageService.js'
import { useData } from '../state/DataContext.jsx'
import { navigate } from '../lib/router.js'
import { setThemeColor } from '../lib/splash.js'
import { Logo } from '../components/TopBar.jsx'
import { AdminToastProvider } from './ui.jsx'
import { OrdersTab } from './OrdersTab.jsx'
import { ProductsTab } from './ProductsTab.jsx'
import { AdminsTab } from './AdminsTab.jsx'
import { SettingsTab } from './SettingsTab.jsx'

const TABS = [
  { id: 'orders', label: 'הזמנות', Icon: ClipboardList },
  { id: 'products', label: 'מוצרים', Icon: Package },
  { id: 'admins', label: 'מנהלים', Icon: Users },
  { id: 'settings', label: 'הגדרות', Icon: Settings },
]

function AuthFrame({ title, sub, children }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <Logo />
      <h1 className="mt-8 text-2xl font-bold">{title}</h1>
      {sub && <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{sub}</p>}
      <div className="mt-6">{children}</div>
      <button type="button" onClick={() => navigate('/')} className="mt-8 self-start text-sm text-muted underline underline-offset-4">
        חזרה לחנות
      </button>
    </div>
  )
}

function Login({ mode }) {
  const [view, setView] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const demo = mode === 'demo'
  const pinMode = mode !== 'firebase'

  const run = async (fn) => {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      await fn()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (pinMode) {
    return (
      <AuthFrame title="כניסת מנהלים" sub={demo ? 'מצב דמו: הנתונים נשמרים רק בטלפון הזה.' : 'מקלידים את הקוד האישי שלכם.'}>
        <form onSubmit={(e) => (e.preventDefault(), run(() => storage.adminSignIn('', password)))} className="space-y-3">
          <label className="label" htmlFor="pin">
            קוד מנהל
          </label>
          <input id="pin" type="password" inputMode="numeric" className="field text-center text-xl tracking-[0.4em]" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p className="error">{err}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy || !password}>
            כניסה
          </button>
        </form>
      </AuthFrame>
    )
  }

  const signup = view === 'signup'
  return (
    <AuthFrame
      title={signup ? 'כניסה ראשונה' : 'כניסת מנהלים'}
      sub={signup ? 'מנהל ראשי הוסיף אתכם? בחרו כאן סיסמה לאימייל שלכם. נשלח מייל אימות.' : 'רק מנהלים מורשים יכולים להיכנס.'}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => (signup ? storage.adminSignUp(email, password) : storage.adminSignIn(email, password)))
        }}
        className="space-y-3"
      >
        <div>
          <label className="label" htmlFor="email">
            אימייל
          </label>
          <input id="email" type="email" dir="ltr" className="field text-right" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="pw">
            {signup ? 'סיסמה חדשה (6 תווים ומעלה)' : 'סיסמה'}
          </label>
          <input
            id="pw"
            type="password"
            dir="ltr"
            className="field text-right"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signup ? 'new-password' : 'current-password'}
          />
        </div>
        {err && <p className="error">{err}</p>}
        {msg && <p className="hint">{msg}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy || !email || !password}>
          {busy && <LoaderCircle size={18} className="animate-spin" />}
          {signup ? 'יצירת סיסמה' : 'כניסה'}
        </button>
      </form>
      <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" className="text-ink underline underline-offset-4" onClick={() => setView(signup ? 'signin' : 'signup')}>
          {signup ? 'כבר יש לי סיסמה' : 'כניסה ראשונה? יצירת סיסמה'}
        </button>
        {!signup && (
          <button
            type="button"
            className="text-muted underline underline-offset-4"
            onClick={() =>
              email ? run(async () => (await storage.resetPassword(email), setMsg('שלחנו מייל לאיפוס סיסמה.'))) : setErr('כתבו קודם את האימייל')
            }
          >
            שכחתי סיסמה
          </button>
        )}
      </div>
    </AuthFrame>
  )
}

function Verify({ auth, onState }) {
  const [msg, setMsg] = useState('')
  return (
    <AuthFrame title="צריך לאמת את האימייל" sub={`שלחנו מייל אימות ל-${auth.email}. פתחו אותו, לחצו על הקישור, ואז חזרו לכאן.`}>
      <div className="space-y-2">
        <button
          type="button"
          className="btn-primary w-full"
          onClick={async () => {
            await storage.recheckVerification(onState)
            setMsg('עדיין לא אומת. בדקו גם בתיקיית הספאם.')
          }}
        >
          אישרתי את המייל
        </button>
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={async () => {
            await storage.resendVerification()
            setMsg('שלחנו שוב.')
          }}
        >
          שליחת המייל שוב
        </button>
        <button type="button" className="btn-ghost w-full" onClick={() => storage.adminSignOut()}>
          יציאה
        </button>
        {msg && <p className="hint text-center">{msg}</p>}
      </div>
    </AuthFrame>
  )
}

function NoAccess({ auth }) {
  return (
    <AuthFrame title="אין הרשאת ניהול" sub={`לאימייל ${auth.email} אין גישה לאזור המנהלים. מנהל ראשי יכול להוסיף אתכם בטאב "מנהלים".`}>
      <button type="button" className="btn-secondary w-full" onClick={() => storage.adminSignOut()}>
        יציאה
      </button>
    </AuthFrame>
  )
}

function Shell({ auth }) {
  const [tab, setTab] = useState('orders')
  const { mode, settings, catalogEmpty } = useData()

  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-30 border-b border-line bg-page/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-[13px] text-muted">
              ניהול{mode === 'demo' ? ' (דמו)' : ''} | {settings.storeOpen ? 'פתוח' : 'סגור'}
            </span>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => navigate('/')} className="grid h-10 w-10 place-items-center rounded-full text-muted" aria-label="לחנות">
              <Store size={19} />
            </button>
            <button type="button" onClick={() => storage.adminSignOut()} className="grid h-10 w-10 place-items-center rounded-full text-muted" aria-label="יציאה">
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-4">
        {catalogEmpty && (
          <div className="card p-4">
            <p className="font-semibold">המסד בענן עוד ריק</p>
            <p className="mt-1 text-sm text-muted">לחיצה אחת מעלה את כל המוצרים וההגדרות ההתחלתיות.</p>
            <button type="button" className="btn-primary mt-3" onClick={() => storage.seedCatalog()}>
              העלאת הקטלוג
            </button>
          </div>
        )}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'admins' && <AdminsTab auth={auth} />}
        {tab === 'settings' && <SettingsTab />}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white" aria-label="ניווט ניהול">
        <div className="mx-auto grid max-w-3xl grid-cols-4 px-2 pt-1.5">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id)
                window.scrollTo(0, 0)
              }}
              aria-current={tab === id ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-1.5 text-[12px] ${tab === id ? 'font-semibold text-ink' : 'text-muted'}`}
            >
              <Icon size={21} strokeWidth={tab === id ? 2.2 : 1.8} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default function AdminApp() {
  const { mode } = useData()
  const [auth, setAuth] = useState(null)
  useEffect(() => storage.onAdminChange(setAuth), [])
  useEffect(() => {
    document.title = 'ניהול | Y&B CRAVE'
    setThemeColor('#FAF9F6')
    return () => {
      document.title = 'Y&B CRAVE'
      setThemeColor('#141318')
    }
  }, [])

  let screen = null
  if (!auth) screen = <div className="grid min-h-dvh place-items-center text-muted">טוענים...</div>
  else if (auth.status === 'admin') screen = <Shell auth={auth} />
  else if (auth.status === 'unverified') screen = <Verify auth={auth} onState={setAuth} />
  else if (auth.status === 'notAdmin') screen = <NoAccess auth={auth} />
  else screen = <Login mode={mode} />

  return <AdminToastProvider>{screen}</AdminToastProvider>
}
