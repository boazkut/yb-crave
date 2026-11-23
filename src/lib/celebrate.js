const COLORS = ['#E5212B', '#FFD23F', '#7CCB2B', '#5B7CFF', '#FF4FA3', '#FF7A1A', '#FFFFFF']

/** קונפטי חגיגי כשהזמנה נשלחת */
export async function celebrate() {
  try {
    const { default: confetti } = await import('canvas-confetti')
    const base = { particleCount: 60, spread: 70, startVelocity: 48, ticks: 220, zIndex: 300, colors: COLORS, disableForReducedMotion: true }
    confetti({ ...base, angle: 60, origin: { x: 0, y: 0.8 } })
    confetti({ ...base, angle: 120, origin: { x: 1, y: 0.8 } })
    setTimeout(() => confetti({ ...base, particleCount: 90, spread: 110, startVelocity: 35, origin: { x: 0.5, y: 0.35 } }), 250)
  } catch {
    /* בלי קונפטי — לא קריטי */
  }
}
