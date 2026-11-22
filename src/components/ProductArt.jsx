import { memo } from 'react'
import { inkOn, shade } from '../lib/color.js'

/**
 * ציור אריזה מובנה — מוצג רק כשאין עדיין תמונה אמיתית למוצר (ראו ProductImage).
 */

const FONT = "'Heebo Variable', Heebo, sans-serif"
const RAINBOW = ['#E5212B', '#FF7A1A', '#FFD23F', '#7CCB2B', '#5B7CFF']

const fitSize = (label, max = 22) => {
  const n = [...String(label)].length
  if (n <= 3) return max
  if (n <= 5) return max * 0.86
  if (n <= 7) return max * 0.72
  if (n <= 9) return max * 0.6
  if (n <= 12) return max * 0.5
  return max * 0.42
}

const Label = ({ x = 60, y = 74, text, color, size = 22, rotate = 0 }) => (
  <text
    x={x}
    y={y}
    textAnchor="middle"
    dominantBaseline="central"
    fontFamily={FONT}
    fontWeight={800}
    fontSize={fitSize(text, size)}
    fill={color}
    transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
  >
    {text}
  </text>
)

const Sticker = ({ text, y = 122, tilt = -4 }) => (
  <g transform={`rotate(${tilt} 60 ${y})`}>
    <rect x={22} y={y - 11} width={76} height={22} rx={4} fill="#F4EAD5" stroke="#1C1A17" strokeWidth={2} />
    <Label x={60} y={y + 1} text={text} color="#1C1A17" size={15} />
  </g>
)

const Sugar = ({ seed = 1 }) => (
  <g fill="#fff" opacity={0.75}>
    {Array.from({ length: 14 }).map((_, i) => {
      const x = 14 + ((i * 37 + seed * 13) % 92)
      const y = 26 + ((i * 53 + seed * 7) % 70)
      return <rect key={i} x={x} y={y} width={2.2} height={2.2} rx={0.6} transform={`rotate(${i * 25} ${x} ${y})`} />
    })}
  </g>
)

const shapes = {
  bag: ({ c1, c2, label }) => (
    <>
      <path d="M22 16 Q60 8 98 16 L102 124 Q60 132 18 124 Z" fill={c1} />
      <rect x={20} y={8} width={80} height={12} fill={shade(c1, -0.25)} />
      <rect x={18} y={120} width={84} height={12} fill={shade(c1, -0.25)} />
      <g stroke={shade(c1, -0.45)} strokeWidth={1.4} opacity={0.6}>
        {Array.from({ length: 13 }).map((_, i) => (
          <line key={i} x1={23 + i * 6} y1={9} x2={23 + i * 6} y2={19} />
        ))}
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={`b${i}`} x1={21 + i * 6} y1={121} x2={21 + i * 6} y2={131} />
        ))}
      </g>
      <path d="M16 56 L104 48 L104 88 L16 96 Z" fill={c2} />
      <Label x={60} y={72} text={label} color={inkOn(c2)} rotate={-5} size={24} />
      <path d="M34 26 Q38 70 32 114" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.22} fill="none" />
    </>
  ),
  tube: ({ c1, c2, label }) => (
    <>
      <rect x={34} y={12} width={52} height={118} rx={8} fill={c1} />
      <ellipse cx={60} cy={14} rx={26} ry={6} fill={shade(c1, -0.35)} />
      <ellipse cx={60} cy={13} rx={20} ry={3.6} fill={shade(c1, 0.25)} />
      <rect x={48} y={26} width={24} height={96} rx={3} fill={c2} />
      <Label x={60} y={74} text={label} color={inkOn(c2)} rotate={-90} size={20} />
      <rect x={38} y={20} width={5} height={104} rx={2.5} fill="#fff" opacity={0.25} />
    </>
  ),
  bar: ({ c1, c2, label }) => {
    const top = 40
    const bot = 100
    const ys = Array.from({ length: 9 }).map((_, i) => top + (i * (bot - top)) / 8)
    const left = ys.map((y, i) => `${i % 2 ? 7 : 12},${y}`)
    const right = [...ys].reverse().map((y, i) => `${i % 2 ? 113 : 108},${y}`)
    return (
      <g transform="rotate(-14 60 70)">
        <polygon points={[...left, ...right].join(' ')} fill={c1} />
        <rect x={30} y={top} width={60} height={bot - top} fill={c2} />
        <Label x={60} y={(top + bot) / 2} text={label} color={inkOn(c2)} size={24} />
        <rect x={12} y={top + 4} width={96} height={5} fill="#fff" opacity={0.22} />
        <rect x={12} y={bot - 6} width={96} height={6} fill="#000" opacity={0.18} />
      </g>
    )
  },
  box: ({ c1, c2, label }) => (
    <>
      <polygon points="22,40 40,24 106,24 88,40" fill={shade(c1, 0.25)} />
      <polygon points="88,40 106,24 106,112 88,128" fill={shade(c1, -0.3)} />
      <rect x={22} y={40} width={66} height={88} fill={c1} />
      <rect x={22} y={68} width={66} height={32} fill={c2} />
      <Label x={55} y={84} text={label} color={inkOn(c2)} size={20} />
    </>
  ),
  cookie: ({ c1, c2, label }) => (
    <>
      <circle cx={60} cy={64} r={48} fill={c1} />
      <circle cx={60} cy={64} r={48} fill="none" stroke={shade(c1, -0.25)} strokeWidth={4} />
      {[
        [40, 40], [72, 36], [86, 62], [46, 70], [66, 82], [34, 92], [80, 96], [58, 54],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={6} ry={4.5} fill={c2} transform={`rotate(${i * 40} ${x} ${y})`} />
      ))}
      <Sticker text={label} y={120} />
    </>
  ),
  strip: ({ c1, c2, label }) => {
    const wave = 'M12 50 C34 22 56 82 80 50 S110 30 110 50'
    const wave2 = 'M12 76 C34 48 56 108 80 76 S110 56 110 76'
    return (
      <>
        {c1 === 'rainbow' ? (
          RAINBOW.map((c, i) => (
            <path key={i} d={wave} transform={`translate(0 ${i * 7 - 4})`} stroke={c} strokeWidth={8} fill="none" strokeLinecap="round" />
          ))
        ) : (
          <>
            <path d={wave} stroke={c1} strokeWidth={26} fill="none" strokeLinecap="round" />
            <path d={wave} stroke={c2} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray="1 10" />
            <path d={wave2} stroke={shade(c1, 0.2)} strokeWidth={18} fill="none" strokeLinecap="round" opacity={0.9} />
          </>
        )}
        <Sugar seed={3} />
        <Sticker text={label} y={120} />
      </>
    )
  },
  gummy: ({ c1, c2, label }) => {
    const cols = [c1, c2, shade(c1, 0.3), c1, shade(c2, -0.2)]
    const spots = [[36, 52, -20], [66, 40, 15], [84, 70, -10], [50, 80, 30], [26, 86, 5]]
    return (
      <>
        {spots.map(([x, y, r], i) => (
          <g key={i} transform={`rotate(${r} ${x} ${y})`}>
            <rect x={x - 15} y={y - 12} width={30} height={24} rx={11} fill={cols[i]} />
            <circle cx={x - 6} cy={y - 14} r={6} fill={cols[i]} />
            <circle cx={x + 6} cy={y - 14} r={6} fill={cols[i]} />
            <ellipse cx={x - 5} cy={y - 4} rx={5} ry={3} fill="#fff" opacity={0.35} />
          </g>
        ))}
        <Sugar seed={5} />
        <Sticker text={label} y={120} />
      </>
    )
  },
  lolly: ({ c1, c2, label }) => (
    <>
      <rect x={57} y={70} width={6} height={46} rx={3} fill="#F4EAD5" />
      <circle cx={60} cy={50} r={36} fill={c1} />
      <path
        d="M60 50 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 8 a14 14 0 1 1 -14 -14 a20 20 0 1 1 20 20 a26 26 0 1 1 -26 -26"
        fill="none"
        stroke={c2}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <ellipse cx={46} cy={34} rx={9} ry={5} fill="#fff" opacity={0.35} transform="rotate(-30 46 34)" />
      <Sticker text={label} y={122} />
    </>
  ),
  can: ({ c1, c2, label }) => (
    <>
      <rect x={32} y={16} width={56} height={114} rx={8} fill={c1} />
      <ellipse cx={60} cy={18} rx={28} ry={7} fill="#C9C6C0" />
      <ellipse cx={60} cy={17} rx={22} ry={4.5} fill="#9E9A93" />
      <rect x={54} y={13} width={12} height={4} rx={2} fill="#7B776F" />
      <rect x={32} y={118} width={56} height={10} fill={shade(c1, -0.3)} />
      <Label x={60} y={70} text={label} color={c2} rotate={-90} size={30} />
      <rect x={38} y={26} width={6} height={90} rx={3} fill="#fff" opacity={0.28} />
      <rect x={78} y={26} width={4} height={90} rx={2} fill="#000" opacity={0.18} />
    </>
  ),
  bottle: ({ c1, c2, label }) => (
    <>
      <path
        d="M50 16 h20 v12 q0 6 8 12 q10 8 10 22 v60 q0 8 -8 8 h-40 q-8 0 -8 -8 v-60 q0 -14 10 -22 q8 -6 8 -12 z"
        fill={c1}
        opacity={0.92}
      />
      <rect x={48} y={6} width={24} height={12} rx={3} fill={c2} />
      <rect x={32} y={62} width={56} height={36} fill={c2} />
      <Label x={60} y={80} text={label} color={inkOn(c2)} size={20} />
      <rect x={38} y={46} width={5} height={70} rx={2.5} fill="#fff" opacity={0.35} />
    </>
  ),
  pouch: ({ c1, c2, label }) => (
    <>
      <path d="M72 30 L86 4" stroke={c2} strokeWidth={5} strokeLinecap="round" />
      <rect x={28} y={28} width={64} height={102} rx={12} fill={c1} />
      <rect x={28} y={28} width={64} height={12} rx={6} fill={shade(c1, -0.25)} />
      <rect x={28} y={66} width={64} height={34} fill={c2} />
      <Label x={60} y={83} text={label} color={inkOn(c2)} size={20} />
      <rect x={34} y={44} width={5} height={78} rx={2.5} fill="#fff" opacity={0.25} />
    </>
  ),
  supply: ({ c1, c2, label }) => (
    <g transform="rotate(-6 60 70)">
      <path d="M30 24 L90 24 L102 40 L102 118 L18 118 L18 40 Z" fill={c1} stroke={shade(c1 === '#F4EAD5' ? '#C9C2B0' : c1, -0.15)} strokeWidth={2} />
      <circle cx={60} cy={38} r={6} fill="#F4F4F2" stroke={shade(c1, -0.25)} strokeWidth={2} />
      <Label x={60} y={80} text={label} color={c2} size={26} />
    </g>
  ),
  mystery: ({ c1, c2, label }) => (
    <>
      <path d="M24 34 L96 34 L104 128 L16 128 Z" fill={c1} />
      <path d="M24 34 L36 18 L84 18 L96 34 Z" fill={shade(c1, -0.2)} />
      <rect x={44} y={26} width={32} height={12} fill="#F4EAD5" opacity={0.9} transform="rotate(-6 60 32)" />
      <text x={60} y={84} textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontWeight={800} fontSize={60} fill={c2}>
        ?
      </text>
      <Sticker text={`${label} ₪`} y={118} tilt={5} />
    </>
  ),
  combo: ({ c1, c2, label }) => (
    <>
      <rect x={70} y={14} width={30} height={60} rx={5} fill="#E5212B" transform="rotate(12 85 44)" />
      <path d="M78 22 Q92 12 104 26 L102 70 L74 72 Z" fill="#FF7A1A" transform="rotate(-8 90 46)" />
      <path d="M18 44 L102 44 L96 128 L24 128 Z" fill={c1} />
      <path d="M18 44 L102 44 L100 56 L20 56 Z" fill={shade(c1, -0.25)} />
      <Label x={60} y={92} text={label} color={inkOn(c1)} size={22} rotate={-4} />
      <circle cx={34} cy={34} r={8} fill="#B5F23A" />
      <circle cx={24} cy={24} r={4} fill={c2} />
    </>
  ),
}

function ProductArtBase({ product, className = '', dim = false }) {
  const art = product?.art || { shape: 'bag', c1: '#555', c2: '#F4EAD5', label: product?.name || '' }
  const Shape = shapes[art.shape] || shapes.bag
  return (
    <svg viewBox="0 0 120 140" className={`${className} select-none ${dim ? 'grayscale opacity-60' : ''}`} role="img" aria-label={product?.name}>
      <Shape c1={art.c1} c2={art.c2} label={art.label || product?.name} glyph={art.glyph} />
    </svg>
  )
}

export const ProductArt = memo(ProductArtBase)
