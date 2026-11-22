import { useRef } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { vibrate } from '../lib/utils.js'

/**
 * לוגו Y&B CRAVE — אותיות עם נזילה + סרט CRAVE עם בועות גז.
 * 5 לחיצות ברצף פותחות את התפריט הסודי.
 */
export function Logo({ onSecret, className = '' }) {
  const taps = useRef([])
  const controls = useAnimationControls()

  const handleTap = () => {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < 2500), now]
    controls.start({ rotate: [0, -4, 3, 0], transition: { duration: 0.3 } })
    if (taps.current.length >= 5) {
      taps.current = []
      vibrate([20, 40, 20])
      onSecret?.()
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleTap}
      animate={controls}
      aria-label="Y&B CRAVE"
      className={`block shrink-0 ${className}`}
    >
      <svg viewBox="0 0 230 92" className="h-full w-auto overflow-visible" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
        {/* נזילה */}
        <g fill="#E5212B">
          <rect x="6" y="50" width="118" height="8" rx="3" />
          <path d="M20 56 h8 v14 a4 4 0 0 1 -8 0 z" />
          <circle cx="24" cy="74" r="5" />
          <path d="M52 56 h7 v22 a3.5 3.5 0 0 1 -7 0 z" />
          <circle cx="55.5" cy="82" r="4.5" />
          <path d="M84 56 h6 v8 a3 3 0 0 1 -6 0 z" />
          <path d="M104 56 h8 v16 a4 4 0 0 1 -8 0 z" />
          <circle cx="108" cy="76" r="4" />
        </g>
        <text
          x="4"
          y="54"
          fontFamily="'Secular One', 'Rubik Variable', sans-serif"
          fontSize="66"
          fill="#E5212B"
          stroke="#1C1A17"
          strokeWidth="2"
          paintOrder="stroke"
          letterSpacing="-2"
        >
          Y&amp;B
        </text>
        {/* סרט CRAVE */}
        <g transform="rotate(-7 176 44)">
          <rect x="124" y="26" width="102" height="38" fill="#B5F23A" stroke="#1C1A17" strokeWidth="3" />
          <text
            x="175"
            y="55"
            textAnchor="middle"
            fontFamily="'Rubik Variable', Rubik, sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="26"
            fill="#1C1A17"
            letterSpacing="0.5"
          >
            CRAVE
          </text>
        </g>
        {/* בועות גז */}
        <g fill="none" stroke="#B5F23A" strokeWidth="2.5">
          <circle cx="214" cy="14" r="5" />
          <circle cx="200" cy="6" r="3" />
          <circle cx="224" cy="2" r="2" />
        </g>
      </svg>
    </motion.button>
  )
}
