import { useState } from 'react'
import { Copy, Download, ExternalLink, Share } from 'lucide-react'
import { promptInstall, useInstall } from '../lib/install.js'

/** איזה דפדפן ומכשיר — כדי לתת הוראות מדויקות */
function platform() {
  const ua = navigator.userAgent || ''
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const android = /Android/i.test(ua)
  const inapp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat|MicroMessenger|; wv\)/i.test(ua)
  if (ios) return inapp || /CriOS|FxiOS|EdgiOS/i.test(ua) || !/Safari\//i.test(ua) ? 'ios-other' : 'ios'
  if (android) {
    if (inapp) return 'inapp'
    if (/MiuiBrowser|XiaoMi\//i.test(ua)) return 'miui'
    if (/SamsungBrowser/i.test(ua)) return 'samsung'
    return 'android'
  }
  return 'desktop'
}

const STEPS = {
  ios: ['לוחצים על כפתור השיתוף בתחתית Safari (ריבוע עם חץ למעלה).', 'גוללים ובוחרים "הוספה למסך הבית".', 'לוחצים "הוסף". האייקון של Y&B יופיע במסך הבית.'],
  'ios-other': ['פותחים את האתר ב-Safari (מעתיקים את הכתובת עם הכפתור למטה ומדביקים ב-Safari).', 'לוחצים על כפתור השיתוף ← "הוספה למסך הבית" ← "הוסף".'],
  android: ['לוחצים על שלוש הנקודות למעלה ב-Chrome.', 'בוחרים "התקנת אפליקציה" (או "הוספה למסך הבית").', 'מאשרים. האייקון של Y&B יופיע במסך הבית.'],
  samsung: ['לוחצים על התפריט (שלושה קווים) למטה.', 'בוחרים "הוספת דף אל" ← "מסך הבית".'],
  miui: ['הדפדפן של שיאומי לא מתקין אפליקציות כמו שצריך.', 'לוחצים "פתיחה ב-Chrome" למטה, ושם: שלוש נקודות ← "התקנת אפליקציה".'],
  inapp: ['האתר נפתח בתוך אפליקציה אחרת, ומשם אי אפשר להתקין.', 'לוחצים "פתיחה ב-Chrome" למטה (או שלוש נקודות ← "פתיחה בדפדפן").', 'ב-Chrome: שלוש נקודות ← "התקנת אפליקציה".'],
  desktop: ['הכי נוח בטלפון: פותחים את הכתובת בטלפון ומתקינים משם.', 'במחשב, ב-Chrome או ב-Edge: לוחצים על סמל ההתקנה בצד שורת הכתובת.'],
}

/** כפתור "הורדת האפליקציה" — בתחתית כל דף, לכל מי שעוד לא התקין */
export function InstallCard({ className = '' }) {
  const st = useInstall()
  const [help, setHelp] = useState(false)
  const [copied, setCopied] = useState(false)
  if (st.standalone) return null

  const kind = platform()
  const done = st.installed
  const url = window.location.origin
  const press = () => {
    if (st.canPrompt) promptInstall()
    else setHelp((h) => !h)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      /* */
    }
  }
  const chrome = () => {
    window.location.href = `intent://${window.location.host}/#Intent;scheme=https;package=com.android.chrome;end`
  }

  return (
    <div className={`rounded-[22px] bg-white p-4 text-ink ${className}`}>
      <div className="flex items-center gap-3">
        <img src="/brand/icon-192.png" alt="" width="48" height="48" className="h-12 w-12 shrink-0 rounded-[13px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold leading-tight">{done ? 'האפליקציה מותקנת' : 'האפליקציה של Y&B'}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">
            {done ? 'פותחים אותה מהאייקון במסך הבית.' : 'אייקון במסך הבית, התראות על ההזמנה, ומתעדכנת לבד.'}
          </p>
        </div>
      </div>
      {!done && (
        <button type="button" onClick={press} className="btn-primary mt-3 w-full py-3.5 text-[16px]" aria-expanded={st.canPrompt ? undefined : help}>
          <Download size={18} /> הורדת האפליקציה
        </button>
      )}
      {help && !st.canPrompt && !done && (
        <div className="mt-3 rounded-xl bg-tile px-3.5 py-3">
          <ol className="list-inside list-decimal space-y-1.5 text-[14px] leading-relaxed">
            {STEPS[kind].map((t) => (
              <li key={t}>
                {t}
                {kind === 'ios' && t.includes('השיתוף') && <Share size={14} className="mr-1 inline align-[-2px]" />}
              </li>
            ))}
          </ol>
          {['miui', 'inapp', 'ios-other', 'desktop'].includes(kind) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {['miui', 'inapp'].includes(kind) && (
                <button type="button" onClick={chrome} className="btn-secondary whitespace-nowrap bg-white px-2 py-2.5 text-[13px]">
                  <ExternalLink size={15} /> פתיחה ב-Chrome
                </button>
              )}
              <button type="button" onClick={copy} className={`btn-secondary whitespace-nowrap bg-white px-2 py-2.5 text-[13px] ${['miui', 'inapp'].includes(kind) ? '' : 'col-span-2'}`}>
                <Copy size={15} /> {copied ? 'הכתובת הועתקה' : 'העתקת הכתובת'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
