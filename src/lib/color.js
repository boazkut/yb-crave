const norm = (hex) => {
  let h = String(hex || '#888').replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return h.padEnd(6, '0').slice(0, 6)
}

export const toRgb = (hex) => {
  const h = norm(hex)
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

export const shade = (hex, amt) => {
  const [r, g, b] = toRgb(hex)
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)
  return `#${[f(r), f(g), f(b)].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`
}

export const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const inkOn = (hex) => (luminance(hex) > 0.38 ? '#1C1A17' : '#F4EAD5')

export const alpha = (hex, a) => {
  const [r, g, b] = toRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
