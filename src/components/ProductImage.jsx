import { memo, useEffect, useRef, useState } from 'react'
import { ProductArt } from './ProductArt.jsx'
import { storage } from '../services/storageService.js'
import { readLS, writeLS } from '../lib/utils.js'

/**
 * תמונת מוצר אמיתית, לפי סדר עדיפויות:
 * 1. קובץ בתיקייה src/assets/products/<id>.(webp|jpg|png) — הכי מהיר (נבנה לתוך האתר)
 * 2. קישור לתמונה (imageUrl) שהוגדר בדשבורד
 * 3. תמונה שהועלתה מהטלפון בדשבורד (נטענת רק כשהמוצר מגיע למסך, ונשמרת במטמון)
 * אחרת: ציור אריזה מובנה.
 */
const bundled = import.meta.glob('../assets/products/*.{png,webp,jpg,jpeg,avif}', { eager: true, query: '?url', import: 'default' })
const BUNDLED = Object.fromEntries(Object.entries(bundled).map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, ''), url]))

const memory = new Map()
const pending = new Map()

async function loadUploaded(id, v) {
  const key = `${id}:${v}`
  if (memory.has(key)) return memory.get(key)
  const cached = storage.mode === 'firebase' ? readLS(`ybc2:img:${id}`, null) : null
  if (cached?.v === v) {
    memory.set(key, cached.d)
    return cached.d
  }
  if (!pending.has(key)) {
    pending.set(
      key,
      storage.getProductImage(id).then((d) => {
        memory.set(key, d)
        if (d && storage.mode === 'firebase') writeLS(`ybc2:img:${id}`, { v, d })
        return d
      }),
    )
  }
  return pending.get(key)
}

function useNearScreen(ref) {
  const [near, setNear] = useState(false)
  useEffect(() => {
    if (near || !ref.current) return undefined
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '300px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [near, ref])
  return near
}

function ProductImageBase({ product, className = '', artClass = 'h-[78%] w-[78%]', dim = false }) {
  const ref = useRef(null)
  const near = useNearScreen(ref)
  const direct = BUNDLED[product?.id] || product?.imageUrl || ''
  const v = product?.imageV || 0
  const [uploaded, setUploaded] = useState(() => (v ? memory.get(`${product.id}:${v}`) : null) || null)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    if (direct || !v || !near) return
    let alive = true
    loadUploaded(product.id, v)
      .then((d) => alive && setUploaded(d))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [direct, v, near, product?.id])

  const src = !broken && (direct || uploaded)
  return (
    <div ref={ref} className={`grid place-items-center overflow-hidden ${className}`}>
      {src ? (
        <img
          src={src}
          alt={product.name}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setBroken(true)}
          className={`h-full w-full object-cover ${dim ? 'grayscale opacity-60' : ''}`}
        />
      ) : (
        <ProductArt product={product} dim={dim} className={artClass} />
      )}
    </div>
  )
}

export const ProductImage = memo(ProductImageBase)
export const hasRealImage = (p) => Boolean(BUNDLED[p?.id] || p?.imageUrl || p?.imageV)
