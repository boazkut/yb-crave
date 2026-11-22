export function Marquee({ text }) {
  if (!text?.trim()) return null
  const speed = `${Math.max(22, text.length * 0.42)}s`
  return (
    <div className="relative z-40 overflow-hidden border-b-2 border-coal bg-cola text-paper" dir="ltr" aria-label={text}>
      <div className="flex w-max animate-marquee" style={{ '--marquee-speed': speed }} aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="flex shrink-0" dir="rtl">
            {[0, 1, 2].map((j) => (
              <span key={j} className="whitespace-nowrap px-6 py-2 text-[13px] font-extrabold tracking-tight">
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
