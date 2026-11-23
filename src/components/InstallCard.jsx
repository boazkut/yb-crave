import { useState } from 'react'
import { Download, Share } from 'lucide-react'
import { promptInstall, useInstall } from '../lib/install.js'

/** כרטיס "להוריד את האפליקציה": התקנה בלחיצה באנדרואיד, הסבר קצר באייפון */
export function InstallCard({ className = '' }) {
  const st = useInstall()
  const [help, setHelp] = useState(false)
  if (st.standalone) return null
  if (!st.canPrompt && !st.ios && !st.android) return null

  const done = st.installed
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
        {!done &&
          (st.canPrompt ? (
            <button type="button" onClick={() => promptInstall()} className="btn-primary shrink-0 px-4 py-2.5 text-[15px]">
              <Download size={17} /> התקנה
            </button>
          ) : (
            <button type="button" onClick={() => setHelp((h) => !h)} className="btn-secondary shrink-0 px-3 py-2.5 text-[14px]" aria-expanded={help}>
              איך מתקינים?
            </button>
          ))}
      </div>
      {help && !st.canPrompt && (
        <ol className="mt-3 list-inside list-decimal space-y-1 rounded-xl bg-tile px-3.5 py-3 text-[14px] leading-relaxed">
          {st.ios ? (
            <>
              <li>
                פותחים את האתר ב-Safari ולוחצים על כפתור השיתוף <Share size={14} className="inline align-[-2px]" /> למטה.
              </li>
              <li>בוחרים "הוספה למסך הבית" ואז "הוסף".</li>
              <li>מעכשיו פותחים מהאייקון. שם גם עובדות ההתראות.</li>
            </>
          ) : (
            <>
              <li>פותחים את האתר ב-Chrome.</li>
              <li>לוחצים על שלוש הנקודות למעלה.</li>
              <li>בוחרים "התקנת אפליקציה" (או "הוספה למסך הבית").</li>
            </>
          )}
        </ol>
      )}
    </div>
  )
}
