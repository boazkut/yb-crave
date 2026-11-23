/**
 * מסך הפתיחה עם הסמל (נמצא ב-index.html כדי שיופיע מיד).
 * מוצג לשנייה בכל כניסה לאפליקציה, וגם כשחוזרים אליה אחרי שיצאו.
 */
const MIN_MS = 1000
const el = () => document.getElementById('boot')

let hideTimer = 0

function hideAfter(ms) {
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => el()?.classList.add('hide'), ms)
}

/** בכניסה ראשונה: מסתירים כשהאפליקציה מוכנה, אבל לא לפני שעברה שנייה */
export function hideBootSplash() {
  const node = el()
  if (!node || node.dataset.booted) return
  node.dataset.booted = '1'
  hideAfter(Math.max(0, MIN_MS - performance.now()))
}

/** כשחוזרים לאפליקציה: מציגים שוב את הסמל לשנייה */
export function flashSplash(ms = MIN_MS) {
  const node = el()
  if (!node) return
  node.classList.remove('hide')
  const svg = node.querySelector('svg')
  if (svg) {
    // מפעילים מחדש את אנימציית הכניסה
    svg.style.animation = 'none'
    void svg.getBoundingClientRect()
    svg.style.animation = ''
  }
  hideAfter(ms)
}

export function setThemeColor(color) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}
