import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { storage } from '../services/storageService.js'
import { useData } from '../state/DataContext.jsx'
import { navigate } from '../lib/router.js'
import { Logo } from '../components/Logo.jsx'
import { OrdersBoard } from './OrdersBoard.jsx'
import { ProductsManager } from './ProductsManager.jsx'
import { ControlCenter } from './ControlCenter.jsx'
import { Finance } from './Finance.jsx'
import { AdminToasts, AdminToastProvider } from './adminUi.jsx'

const TABS = [
  { id: 'orders', label: 'הזמנות', icon: '🧾' },
  { id: 'products', label: 'מלאי', icon: '📦' },
  { id: 'control', label: 'שליטה', icon: '🎛️' },
  { id: 'money', label: 'כספים', icon: '💰' },
]

function Login() {
  const { mode } = useData()
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isPin = mode === 'local'

  const submit = async (e) => {
    e?.preventDefault()
    if (!secret) return
    setBusy(true)
    setError('')
    try {
      await storage.adminSignIn(secret)
    } catch (err) {
      setError(err.message || 'הכניסה נכשלה')
      setSecret('')
    } finally {
      setBusy(false)
    }
  }

  const press = (d) => {
    if (d === 'del') return setSecret((s) => s.slice(0, -1))
    setSecret((s) => (s + d).slice(0, 8))
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 py-10">
      <Logo className="h-16" />
      <h1 className="display mt-6 text-3xl">כניסת צוות</h1>
      <p className="mt-1 text-sm text-paper/60">{isPin ? 'הקלידו את קוד ה-PIN' : 'הקלידו את סיסמת המנהל'}</p>
      <form onSubmit={submit} className="mt-6 w-full">
        <input
          type="password"
          inputMode={isPin ? 'numeric' : 'text'}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="field text-center text-2xl tracking-[0.5em]"
          autoFocus
          aria-label={isPin ? 'קוד PIN' : 'סיסמה'}
        />
        {error && <p className="mt-2 text-center text-sm font-bold text-cola">{error}</p>}
        {isPin && (
          <div className="mt-4 grid grid-cols-3 gap-2" dir="ltr">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].map((d) => (
              <button
                key={d}
                type={d === 'ok' ? 'submit' : 'button'}
                onClick={d === 'ok' ? undefined : () => press(d)}
                className={`h-14 rounded-[8px] border-2 text-xl font-black ${
                  d === 'ok' ? 'border-coal bg-lime text-coal' : 'border-paper/15 active:bg-paper/10'
                }`}
              >
                {d === 'del' ? '⌫' : d === 'ok' ? 'כניסה' : d}
              </button>
            ))}
          </div>
        )}
        {!isPin && (
          <button type="submit" disabled={busy} className="btn-lime mt-4 w-full">
            {busy ? 'נכנסים...' : 'כניסה'}
          </button>
        )}
      </form>
      <button type="button" onClick={() => navigate('/')} className="mt-8 text-sm text-paper/50 underline">
        חזרה לחנות
      </button>
    </div>
  )
}

function Shell() {
  const [tab, setTab] = useState('orders')
  const { mode, settings, catalogEmpty } = useData()

  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-30 border-b-2 border-coal bg-coal/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Logo className="h-10" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold">דשבורד</div>
              <div className={`text-[11px] font-bold ${settings.storeOpen ? 'text-lime' : 'text-cola'}`}>
                {settings.storeOpen ? 'החנות פתוחה' : 'החנות סגורה'}
                <span className="text-paper/40"> | {mode === 'firebase' ? 'מסונכרן בענן' : 'מצב מקומי'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate('/')} className="btn-ghost px-3 py-2 text-xs">
              לחנות
            </button>
            <button type="button" onClick={() => storage.adminSignOut()} className="btn-ghost px-3 py-2 text-xs">
              יציאה
            </button>
          </div>
        </div>
      </header>

      {mode === 'local' && (
        <div className="mx-auto mt-3 max-w-3xl px-4">
          <p className="rounded-[6px] border-2 border-[#FFB000]/60 bg-[#FFB000]/10 px-3 py-2 text-xs font-bold leading-relaxed">
            מצב מקומי: הנתונים נשמרים רק בטלפון הזה, והזמנות של תלמידים מגיעות אליכם בוואטסאפ. כדי לראות כאן הזמנות מכל
            הטלפונים בלייב, מחברים Firebase (הסבר ב-README).
          </p>
        </div>
      )}
      {catalogEmpty && (
        <div className="mx-auto mt-3 max-w-3xl px-4">
          <div className="rounded-[6px] border-2 border-lime bg-lime/10 p-3">
            <p className="text-sm font-extrabold">מסד הנתונים בענן עוד ריק.</p>
            <p className="mt-1 text-xs text-paper/70">לחצו כדי להעלות את כל הקטלוג וההגדרות ההתחלתיות (פעם אחת).</p>
            <button type="button" className="btn-lime mt-2 px-3 py-2 text-sm" onClick={() => storage.seedCatalog('missing')}>
              העלה קטלוג התחלתי
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === 'orders' && <OrdersBoard />}
            {tab === 'products' && <ProductsManager />}
            {tab === 'control' && <ControlCenter />}
            {tab === 'money' && <Finance />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-2 border-coal bg-coal-2" aria-label="ניווט דשבורד">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1 px-2 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-col items-center rounded-[8px] py-2 text-xs font-extrabold ${
                tab === t.id ? 'bg-lime text-coal' : 'text-paper/70'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="mt-1">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default function AdminApp() {
  const [isAdmin, setIsAdmin] = useState(null)
  useEffect(() => storage.onAdminChange(setIsAdmin), [])

  useEffect(() => {
    document.title = 'דשבורד · Y&B CRAVE'
    return () => {
      document.title = 'Y&B CRAVE · צנח הסוכר? אנחנו בדרך.'
    }
  }, [])

  if (isAdmin === null) return null
  return (
    <AdminToastProvider>
      {isAdmin ? <Shell /> : <Login />}
      <AdminToasts />
    </AdminToastProvider>
  )
}
