import { useData } from '../state/DataContext.jsx'
import { useNow } from '../lib/useNow.js'
import { getSchedule, formatCountdown } from '../lib/shop.js'

export function useSchedule() {
  const { settings } = useData()
  const now = useNow(1000)
  return { ...getSchedule(settings, now), now }
}

export function StatusBadge({ compact = false }) {
  const { open, reason, next, now } = useSchedule()

  if (!open) {
    return (
      <div className="flex items-center gap-2 rounded-[6px] border-2 border-cola/60 bg-cola/10 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-cola" />
        <div className="leading-tight">
          <div className="text-sm font-extrabold">סגור כרגע</div>
          {!compact && (
            <div className="text-xs text-paper/60">{reason === 'closed' ? 'נחזור ממש בקרוב' : 'אין הפסקות פתוחות להזמנה'}</div>
          )}
        </div>
      </div>
    )
  }

  const today = next.today
  return (
    <div className="flex items-center gap-2.5 rounded-[6px] border-2 border-lime/60 bg-lime/10 px-3 py-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime" />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-extrabold">{today ? 'פתוח עכשיו' : 'פתוח להזמנה מראש'}</div>
        <div className="text-xs text-paper/70">
          {today ? (
            <>
              הזמנות ל-{next.time} נסגרות בעוד{' '}
              <span className="font-extrabold tabular-nums text-lime" dir="ltr">
                {formatCountdown(next.closesAt - now)}
              </span>
            </>
          ) : (
            <>חלוקה {next.label}</>
          )}
        </div>
      </div>
    </div>
  )
}
