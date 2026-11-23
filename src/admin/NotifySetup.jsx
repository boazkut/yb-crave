import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, BellOff, BellRing, Check, Copy, ExternalLink, Loader2, RotateCw, X } from 'lucide-react'
import { storage } from '../services/storageService.js'
import { b64ToBytes, isIOS, isStandalone, registerSW } from '../lib/push.js'
import { useScrollLock } from '../components/Overlays.jsx'
import { useAdminOrders } from './adminOrders.jsx'

/**
 * הפעלת התראות למנהל, צעד אחר צעד.
 * כל שלב שנכשל מקבל הסבר ברור: מה לא עבד, איפה מוצאים את הבעיה ואיך מתקנים — לפי סוג הטלפון והדפדפן.
 */

const SITE = typeof window !== 'undefined' ? window.location.host : 'yb-sell-nosh.netlify.app'

function detectEnv() {
  const ua = navigator.userAgent || ''
  const ios = isIOS()
  const standalone = isStandalone()
  return {
    ios,
    android: /Android/i.test(ua),
    standalone,
    // דפדפן בתוך אפליקציה (אינסטגרם, טיקטוק, פייסבוק, חלון רשת של אנדרואיד)
    inapp: /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat|MicroMessenger|; wv\)/i.test(ua) || (ios && !/Safari\//i.test(ua) && !standalone),
    miui: /MiuiBrowser|XiaoMi\//i.test(ua),
    samsung: /SamsungBrowser/i.test(ua),
  }
}

const withTimeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error(label), { name: 'Timeout' })), ms))])

/** מריץ את כל השלבים ומחזיר { ok } או { problem, detail } */
async function runSetup() {
  const env = detectEnv()
  if (env.ios && !env.standalone) return { problem: 'ios-install' }
  if (env.inapp) return { problem: 'inapp' }
  // הדפדפן של שיאומי לא באמת מקבל התראות מאתרים
  if (env.miui) return { problem: 'browser' }
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { problem: env.miui ? 'browser' : env.ios ? 'ios-old' : 'browser' }
  }
  if (Notification.permission === 'denied') return { problem: 'denied' }

  let perm = Notification.permission
  if (perm === 'default') {
    try {
      perm = await Notification.requestPermission()
    } catch {
      perm = Notification.permission
    }
  }
  if (perm === 'denied') return { problem: 'denied' }
  if (perm !== 'granted') return { problem: 'dismissed' }

  let reg
  try {
    reg = (await registerSW()) || (await withTimeout(navigator.serviceWorker.ready, 10_000, 'sw'))
    await withTimeout(navigator.serviceWorker.ready, 10_000, 'sw')
  } catch (e) {
    return { problem: 'sw', detail: e.message }
  }

  const key = storage.vapidPublicKey || (await storage.ensureHealth?.())?.vapidPublicKey
  if (!key) return { problem: 'network' }

  let sub
  try {
    sub = await reg.pushManager.getSubscription()
    if (!sub) sub = await withTimeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }), 20_000, 'subscribe')
  } catch (e) {
    if (e?.name === 'NotAllowedError') return { problem: 'denied' }
    return { problem: 'push-service', detail: `${e?.name || ''} ${e?.message || ''}`.trim() }
  }

  try {
    await storage.saveAdminPush(sub.toJSON())
  } catch (e) {
    return { problem: e?.status === 401 ? 'session' : 'network', detail: e?.message }
  }
  try {
    await storage.testAdminPush(sub.endpoint)
  } catch {
    /* הבדיקה לא קריטית */
  }
  return { ok: true }
}

function openInChrome() {
  const url = `${window.location.origin}/admin`
  if (detectEnv().android) window.location.href = `intent://${SITE}/admin#Intent;scheme=https;package=com.android.chrome;end`
  else window.open(url, '_blank')
}

/** הסבר לכל בעיה: כותרת, למה זה קורה, ושלבי תיקון */
function problemInfo(problem, env) {
  const installed = env.standalone
  switch (problem) {
    case 'ios-install':
      return {
        title: 'באייפון התראות עובדות רק מהאפליקציה במסך הבית',
        why: 'Safari רגיל לא מקבל התראות מאתרים. צריך להוסיף את האתר למסך הבית ולפתוח משם.',
        steps: ['פותחים את האתר ב-Safari.', 'לוחצים על כפתור השיתוף (ריבוע עם חץ למעלה) בתחתית.', 'בוחרים "הוספה למסך הבית" ואז "הוסף".', 'פותחים את Y&B מהאייקון החדש, נכנסים למנהלים ולוחצים "אישור התראות".', 'צריך iOS 16.4 ומעלה (הגדרות ← כללי ← עדכון תוכנה).'],
      }
    case 'ios-old':
      return {
        title: 'גרסת האייפון ישנה מדי להתראות',
        why: 'התראות מאתרים נתמכות מ-iOS 16.4.',
        steps: ['הגדרות ← כללי ← עדכון תוכנה, ומעדכנים.', 'אחרי העדכון פותחים את Y&B מהאייקון במסך הבית ולוחצים שוב "אישור התראות".'],
      }
    case 'inapp':
      return {
        title: 'פתחתם את האתר מתוך אפליקציה אחרת',
        why: 'בחלון שנפתח מתוך וואטסאפ, אינסטגרם או טיקטוק אין אפשרות להתראות.',
        steps: ['לוחצים על שלוש הנקודות בפינה ובוחרים "פתיחה בדפדפן" / "Open in Chrome".', 'או לוחצים למטה "פתיחה ב-Chrome".', 'נכנסים שוב למנהלים ולוחצים "אישור התראות".'],
        actions: ['chrome', 'copy'],
      }
    case 'browser':
      return {
        title: env.miui ? 'הדפדפן של שיאומי לא תומך בהתראות' : 'הדפדפן הזה לא תומך בהתראות',
        why: 'צריך Google Chrome (או Samsung Internet בסמסונג).',
        steps: ['לוחצים למטה "פתיחה ב-Chrome" (או מעתיקים את הכתובת ומדביקים ב-Chrome).', 'אין Chrome? מתקינים אותו מחנות Play.', 'נכנסים שוב למנהלים ולוחצים "אישור התראות".'],
        actions: ['chrome', 'copy'],
      }
    case 'denied':
      return {
        title: 'ההתראות חסומות לאתר הזה',
        why: 'מישהו לחץ פעם "חסימה" בשאלה על התראות, ומאז הטלפון לא שואל שוב. צריך לשחרר את החסימה בהגדרות.',
        steps: env.ios
          ? ['הגדרות האייפון ← התראות.', 'מוצאים את Y&B ברשימה.', 'מפעילים "אפשר התראות".', 'חוזרים לכאן ולוחצים "לנסות שוב".']
          : installed
            ? ['לוחצים לחיצה ארוכה על האייקון של Y&B במסך הבית ← "פרטי אפליקציה" (סמל i).', 'נכנסים ל"התראות" ומפעילים.', 'חוזרים לכאן ולוחצים "לנסות שוב".']
            : [
                'לוחצים על הסמל שליד כתובת האתר למעלה (מנעול או שני פסים).',
                'נכנסים ל"הרשאות" ← "התראות" ובוחרים "אישור" / "Allow".',
                `אם אין שם: תפריט Chrome (שלוש נקודות) ← הגדרות ← הגדרות אתר ← התראות ← מוצאים את ${SITE} ← אישור.`,
                'חוזרים לכאן ולוחצים "לנסות שוב".',
              ],
      }
    case 'dismissed':
      return {
        title: 'השאלה נסגרה בלי אישור',
        why: 'כשהטלפון שואל "לאפשר התראות?" צריך לבחור "אישור" / "Allow".',
        steps: ['לוחצים "לנסות שוב" ובוחרים "אישור".', 'לא קופצת שאלה? מחפשים סמל של פעמון עם קו ליד כתובת האתר, לוחצים עליו ובוחרים "אישור".', 'עדיין לא? עוקבים אחרי ההסבר של "חסומות": סמל ליד הכתובת ← הרשאות ← התראות.'],
      }
    case 'sw':
      return {
        title: 'הדפדפן לא הצליח להפעיל את רכיב ההתראות',
        why: 'זה קורה בגלישה בסתר, או כשהדף נטען חלקית.',
        steps: ['אם אתם בגלישה בסתר — פותחים את האתר בלשונית רגילה.', 'סוגרים את הלשונית ופותחים את האתר מחדש.', 'לוחצים שוב "אישור התראות".'],
      }
    case 'push-service':
      return {
        title: 'שירות ההתראות של הטלפון לא זמין',
        why: 'הדפדפן לא הצליח להירשם לשירות ההתראות של Google. זה קורה כש-Chrome לא מעודכן, כשאין חיבור טוב, בטלפונים בלי שירותי Google (חלק מדגמי Huawei), או כשחוסם פרסומות/VPN חוסם.',
        steps: ['מעדכנים את Chrome ואת "שירותי Google Play" בחנות Play.', 'מכבים VPN או חוסם פרסומות, ומוודאים שיש אינטרנט.', 'סוגרים את Chrome לגמרי ופותחים מחדש.', 'לוחצים "לנסות שוב".'],
      }
    case 'session':
      return { title: 'החיבור למנהלים פג', why: 'צריך להיכנס שוב עם הקוד.', steps: ['יוצאים ונכנסים שוב לאזור המנהלים.', 'לוחצים שוב "אישור התראות".'] }
    default:
      return { title: 'אין חיבור לשרת', why: 'הבקשה לא הגיעה לשרת של החנות.', steps: ['בודקים שיש אינטרנט (וואי-פיי או חבילת גלישה).', 'לוחצים "לנסות שוב".'] }
  }
}

/** כשההתראה לא הגיעה למרות שהכל אושר: הגדרות של הטלפון עצמו */
function notArrivedSteps(env) {
  if (env.ios) {
    return [
      'הגדרות האייפון ← התראות ← Y&B ← "אפשר התראות" דולק, ו"באנרים" מסומן.',
      'בודקים שאין מצב ריכוז / "נא לא להפריע" פעיל (מרכז הבקרה).',
      'פותחים את Y&B מהאייקון ולוחצים שוב "שליחת התראת בדיקה".',
    ]
  }
  return [
    'הגדרות הטלפון ← אפליקציות ← Chrome ← התראות: להפעיל את הכל (כולל "אתרים").',
    'בשיאומי / רדמי / POCO: הגדרות ← אפליקציות ← ניהול אפליקציות ← Chrome: "התראות" דולק, "הפעלה אוטומטית" דולק, ו"חיסכון בסוללה" ← "ללא הגבלות".',
    'בסמסונג: הגדרות ← אפליקציות ← Chrome ← סוללה ← "ללא הגבלה".',
    'בודקים ש"נא לא להפריע" כבוי.',
    'לוחצים "שליחת התראת בדיקה".',
  ]
}

function Steps({ items }) {
  return (
    <ol className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-[15px] leading-snug">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold text-white">{i + 1}</span>
          <span className="pt-0.5">{t}</span>
        </li>
      ))}
    </ol>
  )
}

/** החלון עצמו: אישור → בדיקה → "הגיעה?" או הסבר מה לא עבד */
export function NotifyPanel({ onClose, start = 'intro' }) {
  useScrollLock()
  const ctx = useAdminOrders()
  const env = detectEnv()
  const [state, setState] = useState({ view: start })
  const [copied, setCopied] = useState(false)

  const run = async () => {
    setState({ view: 'working' })
    const res = await runSetup()
    if (res.ok) {
      ctx?.setPushOn?.(true)
      setState({ view: 'sent' })
    } else setState({ view: 'problem', ...res })
  }
  const test = async () => {
    setState({ view: 'working' })
    const res = await runSetup()
    setState(res.ok ? { view: 'sent' } : { view: 'problem', ...res })
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/admin`)
      setCopied(true)
    } catch {
      /* */
    }
  }

  const info = state.view === 'problem' ? problemInfo(state.problem, env) : null

  return createPortal(
    <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="התראות לטלפון"
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        className="safe-bottom max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[26px] bg-white p-5 sm:rounded-[26px]"
      >
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-tile" aria-label="סגירה">
            <X size={18} />
          </button>
        </div>

        {state.view === 'intro' && (
          <div className="text-center">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-ink text-white">
              <BellRing size={36} />
            </span>
            <h2 className="mt-4 text-[26px] font-extrabold leading-tight">אישור התראות</h2>
            <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-muted">כדי שהטלפון יצלצל על כל הזמנה חדשה, גם כשהאפליקציה סגורה. אחרי הלחיצה הטלפון ישאל — בוחרים "אישור".</p>
            <button type="button" onClick={run} className="btn-primary mt-6 w-full py-4 text-[17px]">
              <BellRing size={19} /> אישור התראות
            </button>
            <button type="button" onClick={onClose} className="btn-ghost mt-1 w-full text-[14px] text-muted">
              אחר כך
            </button>
          </div>
        )}

        {state.view === 'working' && (
          <div className="py-10 text-center">
            <Loader2 size={34} className="mx-auto animate-spin" />
            <p className="mt-3 text-[16px] font-semibold">מפעילים התראות...</p>
            <p className="mt-1 text-[13px] text-muted">אם הטלפון שואל — בוחרים "אישור"</p>
          </div>
        )}

        {state.view === 'sent' && (
          <div className="text-center">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#1F9D55] text-white">
              <Check size={38} strokeWidth={2.6} />
            </span>
            <h2 className="mt-4 text-[24px] font-extrabold leading-tight">ההתראות פעילות</h2>
            <p className="mt-2 text-[15px] text-muted">שלחנו עכשיו התראת בדיקה לטלפון הזה. היא הגיעה?</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setState({ view: 'notArrived' })} className="btn-secondary py-3.5">
                לא הגיעה
              </button>
              <button type="button" onClick={onClose} className="btn-primary py-3.5">
                הגיעה
              </button>
            </div>
          </div>
        )}

        {state.view === 'problem' && info && (
          <div>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#FDECEA] text-danger">
              {state.problem === 'denied' ? <BellOff size={26} /> : <AlertTriangle size={26} />}
            </span>
            <h2 className="mt-3 text-[22px] font-extrabold leading-tight">{info.title}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{info.why}</p>
            <p className="mt-4 text-[13px] font-bold text-muted">איך מתקנים</p>
            <div className="mt-2">
              <Steps items={info.steps} />
            </div>
            {info.actions?.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {info.actions.includes('chrome') && (
                  <button type="button" onClick={openInChrome} className="btn-secondary py-3">
                    <ExternalLink size={16} /> פתיחה ב-Chrome
                  </button>
                )}
                {info.actions.includes('copy') && (
                  <button type="button" onClick={copy} className="btn-secondary py-3">
                    <Copy size={16} /> {copied ? 'הועתק' : 'העתקת הכתובת'}
                  </button>
                )}
              </div>
            )}
            <button type="button" onClick={run} className="btn-primary mt-4 w-full py-3.5">
              <RotateCw size={17} /> לנסות שוב
            </button>
            {state.detail && <p className="mt-3 text-center text-[11px] text-[#A3A3A3]" dir="ltr">{state.detail}</p>}
          </div>
        )}

        {state.view === 'notArrived' && (
          <div>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#FFF4E5] text-[#9A5B00]">
              <BellOff size={26} />
            </span>
            <h2 className="mt-3 text-[22px] font-extrabold leading-tight">ההתראה לא הגיעה</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">האתר מאושר, אבל הטלפון עצמו חוסם או משתיק התראות. בודקים בהגדרות הטלפון:</p>
            <div className="mt-4">
              <Steps items={notArrivedSteps(env)} />
            </div>
            <button type="button" onClick={test} className="btn-primary mt-5 w-full py-3.5">
              <BellRing size={17} /> שליחת התראת בדיקה
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  )
}

/** קופץ מיד בכניסה למנהלים כשההתראות לא פעילות בטלפון הזה */
export function NotifyGate() {
  const ctx = useAdminOrders()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!ctx?.pushChecked || ctx.pushOn || !storage.saveAdminPush) return
    let later = false
    try {
      later = Boolean(window.sessionStorage.getItem('ybc:notifyLater'))
    } catch {
      /* */
    }
    if (!later) setOpen(true)
  }, [ctx?.pushChecked, ctx?.pushOn])
  const close = () => {
    try {
      window.sessionStorage.setItem('ybc:notifyLater', '1')
    } catch {
      /* */
    }
    setOpen(false)
  }
  return <AnimatePresence>{open && <NotifyPanel onClose={close} />}</AnimatePresence>
}

/** שורת מצב + כפתור, בעמוד ההזמנות ובהגדרות */
export function NotifyStatus({ full = false }) {
  const ctx = useAdminOrders()
  const [panel, setPanel] = useState(null)
  if (!storage.saveAdminPush || !ctx) return null
  const on = ctx.pushOn
  if (on && !full) return null
  return (
    <>
      <div className={`card flex items-center gap-3 p-4 ${on ? '' : 'border-ink'}`}>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${on ? 'bg-[#E7F6EC] text-[#1F9D55]' : 'bg-ink text-white'}`}>
          {on ? <BellRing size={20} /> : <BellOff size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{on ? 'התראות פעילות בטלפון הזה' : 'התראות לא פעילות בטלפון הזה'}</p>
          <p className="text-[13px] text-muted">{on ? 'לא מגיעות? אפשר לבדוק ולתקן.' : 'בלי זה לא תדעו על הזמנה חדשה כשהאפליקציה סגורה.'}</p>
        </div>
        <button type="button" onClick={() => setPanel(on ? 'notArrived' : 'intro')} className={`${on ? 'btn-secondary' : 'btn-primary'} shrink-0 px-3 py-2.5 text-sm`}>
          {on ? 'בדיקה' : 'אישור'}
        </button>
      </div>
      <AnimatePresence>{panel && <NotifyPanel start={panel} onClose={() => setPanel(null)} />}</AnimatePresence>
    </>
  )
}
