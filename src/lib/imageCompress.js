/**
 * דחיסת תמונה בצד הלקוח לפני שמירה.
 * צילומי תשלום נשמרים כ-JPEG קטן (בדרך כלל 80–250KB) כדי להיכנס בנוחות למסמך Firestore
 * ולעבוד בחבילה החינמית בלי Cloud Storage.
 */

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('לא הצלחנו לקרוא את התמונה. נסו צילום מסך אחר.'))
    }
    img.src = url
  })

const approxBytes = (dataUrl) => Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)

export async function compressImage(file, { maxSide = 1280, maxBytes = 300_000, type = 'image/jpeg', background = '#FFFFFF' } = {}) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('צריך לבחור קובץ תמונה')
  const img = await loadImage(file)
  let side = maxSide
  let quality = 0.78
  let out = ''
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (type === 'image/jpeg') {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(img, 0, 0, w, h)
    out = canvas.toDataURL(type, quality)
    if (approxBytes(out) <= maxBytes) break
    if (quality > 0.5) quality -= 0.12
    else side = Math.round(side * 0.8)
  }
  if (approxBytes(out) > maxBytes * 1.3) throw new Error('התמונה גדולה מדי גם אחרי דחיסה. נסו צילום מסך רגיל.')
  return { dataUrl: out, bytes: approxBytes(out) }
}

/** תמונת מוצר: קטנה, עם שקיפות (WebP כשנתמך) */
export const compressProductImage = (file) =>
  compressImage(file, { maxSide: 520, maxBytes: 70_000, type: 'image/webp' })
