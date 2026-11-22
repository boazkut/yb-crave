/**
 * הקטלוג ההתחלתי של Y&B CRAVE.
 * הוא נטען בפעם הראשונה למערכת, ומשם הכל ניתן לעריכה בדשבורד (/admin).
 *
 * art = הציור המובנה שמוצג כשאין עדיין תמונה אמיתית:
 *   shape: bag | tube | bar | box | cookie | strip | gummy | lolly | can | bottle | pouch | supply | mystery | combo
 *   c1 = צבע עטיפה ראשי, c2 = צבע הדגשה, label = הטקסט שמודפס על העטיפה
 */

export const CATALOG_VERSION = 4

export const CATEGORIES = [
  { id: 'salty', name: 'מלוחים', sub: "קראנץ' שמחזיק עד סוף השיעור", color: '#FF7A1A', ink: '#1C1A17', emoji: '🥨' },
  { id: 'choco', name: 'שוקולד ועוגיות', sub: 'לפני מבחן במתמטיקה. או אחרי.', color: '#D9A23B', ink: '#1C1A17', emoji: '🍫' },
  { id: 'sour', name: 'חמצוצים וגומי', sub: 'חמוץ ברמה שעושה פרצוף', color: '#B5F23A', ink: '#1C1A17', emoji: '🍋' },
  { id: 'drinks', name: 'פחיות ושתייה', sub: 'קר. ממש קר.', color: '#E5212B', ink: '#F4EAD5', emoji: '🥤' },
  { id: 'rescue', name: 'הצלה לבית ספר', sub: 'שכחת עט? קורה לטובים ביותר', color: '#5B7CFF', ink: '#F4EAD5', emoji: '🛟' },
  { id: 'combos', name: 'קומבואים והפתעות', sub: 'שורדים שיעור כפול', color: '#FF4FA3', ink: '#1C1A17', emoji: '🎁' },
]

export const TAGS = [
  { id: 'hot', label: 'חריף', emoji: '🌶️' },
  { id: 'sour', label: 'חמוץ', emoji: '🍋' },
  { id: 'sweet', label: 'מתוק', emoji: '🍫' },
  { id: 'salty', label: 'מלוח', emoji: '🥨' },
  { id: 'cold', label: 'קר', emoji: '🧊' },
  { id: 'parve', label: 'פרווה', emoji: '🌿' },
  { id: 'hit', label: 'להיט', emoji: '🔥' },
]

const base = (category, shape, tags) => (id, name, price, o = {}) => ({
  id,
  name,
  category,
  price,
  imageUrl: '',
  stock: o.stock || 'in',
  qty: o.qty ?? 24,
  tags: o.tags ?? tags,
  art: { shape: o.shape || shape, c1: o.c1 || '#444', c2: o.c2 || '#F4EAD5', label: o.label || name, glyph: o.glyph || '' },
  blurb: o.blurb || '',
  secret: Boolean(o.secret),
  bagEligible: Boolean(o.bag),
  deposit: o.deposit || 0,
  compareAt: o.compareAt || 0,
  comboSlots: o.comboSlots || null,
  notifyCount: 0,
  soldCount: 0,
  weekSold: 0,
})

const salty = base('salty', 'bag', ['salty', 'parve'])
const choco = base('choco', 'bar', ['sweet'])
const sour = base('sour', 'gummy', ['sour', 'sweet', 'parve'])
const drink = base('drinks', 'can', ['cold', 'parve'])
const rescue = base('rescue', 'supply', [])
const combo = base('combos', 'combo', [])

export const SEED_PRODUCTS = [
  // ---------------- מלוחים ----------------
  salty('bamba', 'במבה', 5, { c1: '#F5C400', c2: '#E5212B', tags: ['salty', 'parve', 'hit'], blurb: 'הקלאסיקה. אין מה להוסיף.' }),
  salty('bamba-nougat', 'במבה נוגט', 6, { c1: '#3B2414', c2: '#F5C400', label: 'במבה נוגט', tags: ['sweet'] }),
  salty('bamba-red', 'במבה אדומה', 6, { c1: '#D61F3C', c2: '#F5C400', label: 'במבה אדומה', tags: ['sweet'] }),
  salty('bisli-grill', 'ביסלי גריל', 5, { c1: '#E5212B', c2: '#FFD23F', label: 'ביסלי גריל', tags: ['salty', 'parve', 'hit'] }),
  salty('bisli-bbq', 'ביסלי ברביקיו', 5, { c1: '#7A2E12', c2: '#FF7A1A', label: 'ביסלי BBQ' }),
  salty('bisli-pizza', 'ביסלי פיצה', 5, { c1: '#2E8B3A', c2: '#E5212B', label: 'ביסלי פיצה' }),
  salty('bisli-onion', 'ביסלי בצל', 5, { c1: '#8A5A2B', c2: '#F4EAD5', label: 'ביסלי בצל' }),
  salty('doritos-sour-hot', 'דוריטוס חמוץ חריף', 7, { c1: '#0E7C3A', c2: '#B5F23A', label: 'דוריטוס', tags: ['hot', 'sour', 'salty'] }),
  salty('doritos-nacho', "דוריטוס נאצ'ו", 7, { c1: '#D62828', c2: '#FFB000', label: 'דוריטוס' }),
  salty('doritos-fire', 'דוריטוס אש', 7, { c1: '#2A0E0E', c2: '#FF3D00', label: 'דוריטוס אש', tags: ['hot', 'salty'] }),
  salty('tapuchips-natural', "תפוצ'יפס טבעי", 6, { c1: '#F5C400', c2: '#1D4ED8', label: "תפוצ'יפס" }),
  salty('tapuchips-onion', "תפוצ'יפס שמנת בצל", 6, { c1: '#2E9E5B', c2: '#F4EAD5', label: "תפוצ'יפס", tags: ['salty'] }),
  salty('tapuchips-crunch', "תפוצ'יפס קראנץ'", 6, { c1: '#3B3B3B', c2: '#F5C400', label: "קראנץ'" }),
  salty('cheetos-cheese', "צ'יטוס גבינה", 6, { c1: '#FF7A1A', c2: '#FFD23F', label: "צ'יטוס", tags: ['salty'] }),
  salty('cheetos-kafa', "צ'יטוס כאפה", 6, { c1: '#FF5A1A', c2: '#5B7CFF', label: 'כאפה' }),
  salty('cheetos-hot', "צ'יטוס חריף", 6, { c1: '#C1121F', c2: '#FF7A1A', label: "צ'יטוס", tags: ['hot', 'salty'] }),
  salty('apropo', 'אפרופו', 6, { c1: '#1F7A4D', c2: '#F5C400' }),
  salty('dubonim', 'דובונים', 5, { c1: '#C2410C', c2: '#FDE68A', tags: ['salty'] }),
  salty('pretzels-flat', 'בייגלה שטוחים', 5, { c1: '#B5651D', c2: '#F4EAD5', label: 'בייגלה' }),
  salty('pretzels-choco', 'בייגלה מצופה שוקולד', 7, { c1: '#3B2414', c2: '#D9A23B', label: 'בייגלה שוקו', tags: ['sweet', 'salty'] }),
  salty('popko', 'פופקו', 4, { c1: '#FFD23F', c2: '#E5212B', tags: ['sweet'] }),
  salty('pringles-original', 'פרינגלס קטן טבעי', 8, { shape: 'tube', c1: '#E5212B', c2: '#F4EAD5', label: 'פרינגלס' }),
  salty('pringles-onion', 'פרינגלס קטן שמנת בצל', 8, { shape: 'tube', c1: '#2E9E5B', c2: '#F4EAD5', label: 'פרינגלס', tags: ['salty'] }),
  salty('pringles-hot', 'פרינגלס קטן חריף', 8, { shape: 'tube', c1: '#FF5A1A', c2: '#2A0E0E', label: 'פרינגלס', tags: ['hot', 'salty'] }),
  salty('takis', 'טאקיס חריף', 12, { c1: '#4A1D7A', c2: '#FF3D00', label: 'TAKIS', tags: ['hot', 'sour', 'salty', 'hit'], blurb: 'רק לאמיצים. ביקשנו להזהיר.' }),
  salty('popcorn-sweet', 'פופקורן מתוק', 5, { c1: '#F4EAD5', c2: '#E5212B', label: 'פופקורן', tags: ['sweet', 'parve'] }),
  salty('popcorn-butter', 'פופקורן חמאה', 5, { c1: '#FFD23F', c2: '#E5212B', label: 'פופקורן', tags: ['salty'] }),
  salty('crackers', 'קרקרים מלוחים', 4, { c1: '#C68A3E', c2: '#F4EAD5', label: 'קרקרים' }),
  salty('protein-bar', 'חטיף חלבון', 9, { shape: 'bar', c1: '#2B2B2B', c2: '#B5F23A', label: 'PROTEIN', tags: [] }),
  salty('munchies', "מאנצ'יז פיצוחים", 6, { c1: '#7A4E1D', c2: '#FFD23F', label: 'פיצוחים' }),

  // ---------------- שוקולד, עוגיות ומאפים ----------------
  choco('bueno', 'קינדר בואנו', 8, { c1: '#F2EFE8', c2: '#E25822', label: 'בואנו', tags: ['sweet', 'hit'] }),
  choco('bueno-white', 'קינדר בואנו לבן', 8, { c1: '#FFFFFF', c2: '#9C6B3C', label: 'בואנו לבן' }),
  choco('kinder-fingers', 'אצבעות קינדר', 6, { c1: '#F2EFE8', c2: '#1D4ED8', label: 'אצבעות' }),
  choco('klik-cornflakes', 'קליק קורנפלקס', 6, { shape: 'bag', c1: '#E5212B', c2: '#FFD23F', label: 'קליק' }),
  choco('klik-pillows', 'קליק כריות', 6, { shape: 'bag', c1: '#E5212B', c2: '#F4EAD5', label: 'קליק כריות' }),
  choco('klik-biscuit', 'קליק ביסקוויט', 6, { shape: 'bag', c1: '#E5212B', c2: '#C68A3E', label: 'קליק' }),
  choco('klik-xl', 'קליק XL', 9, { shape: 'bag', c1: '#B0151E', c2: '#FFD23F', label: 'קליק XL' }),
  choco('pesek-zman', 'פסק זמן', 5, { c1: '#1E3A8A', c2: '#E5212B', label: 'פסק זמן', tags: ['sweet', 'hit'] }),
  choco('kif-kef', 'כיף כף', 4, { c1: '#E5212B', c2: '#FFD23F', label: 'כיף כף' }),
  choco('mekupelet', 'מקופלת', 5, { c1: '#6B2E1A', c2: '#F4EAD5' }),
  choco('tortit', 'טורטית', 5, { c1: '#3B2414', c2: '#E5212B' }),
  choco('egozi', 'אגוזי', 5, { c1: '#B8860B', c2: '#3B2414' }),
  choco('taami', 'טעמי', 5, { c1: '#E5212B', c2: '#F4EAD5' }),
  choco('twist', 'טוויסט', 5, { c1: '#1D4ED8', c2: '#FFD23F' }),
  choco('oreo', 'אוראו', 7, { shape: 'box', c1: '#1E3A8A', c2: '#F4EAD5', label: 'אוראו', tags: ['sweet', 'parve'] }),
  choco('mms', "M&M's", 8, { shape: 'bag', c1: '#6B3A1E', c2: '#FFD23F', label: "M&M's" }),
  choco('snickers', 'סניקרס', 7, { c1: '#5B3418', c2: '#1D4ED8' }),
  choco('twix', 'טוויקס', 7, { c1: '#C49A2C', c2: '#E5212B' }),
  choco('mars', 'מארס', 7, { c1: '#1C1A17', c2: '#E5212B' }),
  choco('bounty', 'באונטי', 7, { c1: '#1E7FBF', c2: '#F4EAD5' }),
  choco('hersheys', 'הרשיז', 9, { c1: '#3B2414', c2: '#D9D9D9' }),
  choco('reeses', 'ריסז', 9, { c1: '#FF7A1A', c2: '#5B3418' }),
  choco('para-milk', 'פרה מיני חלב', 3, { c1: '#1D4ED8', c2: '#F4EAD5', label: 'פרה' }),
  choco('para-popping', 'פרה מיני סוכריות קופצות', 3, { c1: '#FF4FA3', c2: '#F4EAD5', label: 'פרה קופצת' }),
  choco('para-biscuit', 'פרה מיני ביסקוויט', 3, { c1: '#C68A3E', c2: '#1D4ED8', label: 'פרה' }),
  choco('loacker', 'וופל לואקר', 6, { c1: '#E5212B', c2: '#F4EAD5', label: 'לואקר' }),
  choco('chocata', "עוגיות צ'וקטה", 6, { shape: 'box', c1: '#5B3418', c2: '#FFD23F', label: "צ'וקטה" }),
  choco('lotus', 'לוטוס', 5, { shape: 'box', c1: '#B0151E', c2: '#F4EAD5', tags: ['sweet', 'parve'] }),
  choco('giant-cookie', "עוגיית שוקולד צ'יפס ענקית", 8, { shape: 'cookie', c1: '#C68A3E', c2: '#3B2414', label: 'ענקית', tags: ['sweet', 'hit'] }),
  choco('brownie', 'בראוניז ארוז', 8, { shape: 'box', c1: '#3B2414', c2: '#D9A23B', label: 'בראוניז' }),
  choco('belgian-waffle', 'וופל בלגי קטן', 6, { shape: 'cookie', c1: '#E0A64B', c2: '#7A4E1D', label: 'וופל' }),
  choco('cornflakes-crunch', "קראנץ' קורנפלקס", 5, { c1: '#FFB000', c2: '#3B2414', label: "קראנץ'" }),
  choco('nature-valley', 'חטיף אנרגיה (נייטשר ואלי)', 6, { c1: '#2E7D32', c2: '#F4EAD5', label: 'אנרגיה', tags: ['sweet', 'parve'] }),

  // ---------------- חמצוצים, גומי וממתקים ----------------
  sour('strip-strawberry', 'פס חמוץ תות', 2, { shape: 'strip', c1: '#E5212B', c2: '#FFD23F', label: 'תות', bag: true, tags: ['sour', 'sweet', 'parve', 'hit'] }),
  sour('strip-apple', 'פס חמוץ תפוח', 2, { shape: 'strip', c1: '#7CCB2B', c2: '#FFD23F', label: 'תפוח', bag: true }),
  sour('strip-cola', 'פס חמוץ קולה', 2, { shape: 'strip', c1: '#5B3418', c2: '#F4EAD5', label: 'קולה', bag: true }),
  sour('strip-rainbow', 'פס חמוץ קשת', 2, { shape: 'strip', c1: 'rainbow', c2: '#F4EAD5', label: 'קשת', bag: true }),
  sour('sour-carpets', 'שטיחים חמוצים', 3, { shape: 'strip', c1: '#FF4FA3', c2: '#B5F23A', label: 'שטיחים', bag: true }),
  sour('sour-snakes', 'נחשי גומי חמוצים', 1, { c1: '#B5F23A', c2: '#E5212B', label: 'נחשים', bag: true }),
  sour('strawberries', 'תותים', 1, { c1: '#E5212B', c2: '#F4EAD5', bag: true }),
  sour('cola-bottles', 'בקבוקי קולה', 1, { c1: '#7A3E12', c2: '#F4EAD5', label: 'קולה', bag: true }),
  sour('sour-wheels', 'גלגלי חמצוץ', 2, { c1: '#FF7A1A', c2: '#B5F23A', label: 'גלגלים', bag: true }),
  sour('watermelon', 'גומי אבטיח', 1, { c1: '#2E9E5B', c2: '#E5212B', label: 'אבטיח', bag: true }),
  sour('fried-eggs', 'ביצי עין', 1, { c1: '#FFFFFF', c2: '#FFC300', label: 'ביצי עין', bag: true, tags: ['sweet'] }),
  sour('bananas', 'בננות', 1, { c1: '#FFD23F', c2: '#7A4E1D', bag: true, tags: ['sweet', 'parve'] }),
  sour('gummy-bears', 'דובוני גומי', 1, { c1: '#FF7A1A', c2: '#E5212B', label: 'דובונים', bag: true, tags: ['sweet'] }),
  sour('filled-sours', 'חמצוצים ממולאים בקרם', 2, { c1: '#FF4FA3', c2: '#FFFFFF', label: 'ממולאים', bag: true }),
  sour('popping-candy', 'סוכריות קופצות', 3, { shape: 'pouch', c1: '#5B7CFF', c2: '#FF4FA3', label: 'קופצות', tags: ['sweet'] }),
  sour('chupa-chups', "צ'ופה צ'ופס", 2, { shape: 'lolly', c1: '#FF4FA3', c2: '#FFD23F', label: "צ'ופה", tags: ['sweet'] }),
  sour('push-pop', 'פוש פופ', 6, { shape: 'lolly', c1: '#E5212B', c2: '#5B7CFF', label: 'פוש פופ', tags: ['sweet'] }),
  sour('ring-pop', 'טבעת יהלום', 6, { shape: 'lolly', c1: '#8FE3FF', c2: '#FF4FA3', label: 'טבעת', tags: ['sweet'] }),
  sour('fruit-toffee', 'טופי פירות', 1, { c1: '#FFB000', c2: '#E5212B', label: 'טופי', bag: true, tags: ['sweet'] }),
  sour('marshmallow', 'מרשמלו', 1, { c1: '#FFC2DD', c2: '#FFFFFF', bag: true, tags: ['sweet'] }),
  sour('skittles', 'סקיטלס', 6, { shape: 'bag', c1: '#E5212B', c2: '#F4EAD5', label: 'סקיטלס', tags: ['sweet', 'sour'] }),
  sour('smarties', 'סמארטיז', 5, { shape: 'tube', c1: '#5B7CFF', c2: '#FFD23F', label: 'סמארטיז', tags: ['sweet'] }),
  sour('jelly-beans', "ג'לי בין", 5, { shape: 'bag', c1: '#FF4FA3', c2: '#B5F23A', label: "ג'לי בין", tags: ['sweet'] }),
  sour('roll-ups', 'רול-אפס', 5, { shape: 'strip', c1: '#FF7A1A', c2: '#5B7CFF', label: 'רול-אפס', tags: ['sweet', 'sour'] }),
  sour('mentos', 'מנטוס', 5, { shape: 'tube', c1: '#1D4ED8', c2: '#F4EAD5', label: 'מנטוס', tags: ['sweet'] }),
  sour('tic-tac', 'טיק-טק', 6, { shape: 'box', c1: '#F4EAD5', c2: '#2E9E5B', label: 'טיק-טק', tags: ['sweet'] }),
  sour('bazooka-single', 'מסטיק בזוקה (בודד)', 1, { shape: 'bar', c1: '#FF4FA3', c2: '#1D4ED8', label: 'בזוקה', tags: ['sweet'] }),
  sour('bazooka-pack', 'מסטיק בזוקה (חבילה)', 6, { shape: 'box', c1: '#FF4FA3', c2: '#1D4ED8', label: 'בזוקה', tags: ['sweet'] }),
  sour('mast-single', 'מסטיק מאסט (בודד)', 1, { shape: 'bar', c1: '#2E9E5B', c2: '#F4EAD5', label: 'מאסט', tags: ['sweet'] }),
  sour('mast-pack', 'מסטיק מאסט (חבילה)', 7, { shape: 'box', c1: '#2E9E5B', c2: '#F4EAD5', label: 'מאסט', tags: ['sweet'] }),
  sour('orbit-single', 'מסטיק אורביט (בודד)', 1, { shape: 'bar', c1: '#1D4ED8', c2: '#F4EAD5', label: 'אורביט', tags: ['sweet'] }),
  sour('orbit-pack', 'מסטיק אורביט (חבילה)', 7, { shape: 'box', c1: '#1D4ED8', c2: '#F4EAD5', label: 'אורביט', tags: ['sweet'] }),

  // ---------------- פחיות ושתייה ----------------
  drink('coke', 'קוקה קולה', 7, { c1: '#E5212B', c2: '#F4EAD5', label: 'קולה', tags: ['cold', 'parve', 'hit'], blurb: 'קפואה. כמו שצריך.' }),
  drink('coke-zero', 'קולה זירו', 7, { c1: '#1C1A17', c2: '#E5212B', label: 'זירו' }),
  drink('sprite', 'ספרייט', 6, { c1: '#1F9D55', c2: '#FFD23F' }),
  drink('fanta-orange', 'פאנטה תפוזים', 6, { c1: '#FF7A1A', c2: '#1D4ED8', label: 'פאנטה' }),
  drink('fanta-grape', 'פאנטה ענבים', 6, { c1: '#6B2FA0', c2: '#FFD23F', label: 'פאנטה' }),
  drink('fanta-exotic', 'פאנטה אקזוטי', 6, { c1: '#FF4FA3', c2: '#FFD23F', label: 'פאנטה' }),
  drink('fuze-peach', 'פיוז טי אפרסק', 7, { shape: 'bottle', c1: '#F59E66', c2: '#7A2E12', label: 'פיוז טי' }),
  drink('fuze-mango', 'פיוז טי מנגו-אננס', 7, { shape: 'bottle', c1: '#FFB000', c2: '#2E9E5B', label: 'פיוז טי' }),
  drink('xl-regular', 'XL אנרגיה רגיל', 8, { c1: '#1D4ED8', c2: '#B5F23A', label: 'XL' }),
  drink('xl-watermelon', 'XL אבטיח', 8, { c1: '#E5212B', c2: '#2E9E5B', label: 'XL' }),
  drink('blu-regular', 'BLU רגיל', 8, { c1: '#1E40AF', c2: '#F4EAD5', label: 'BLU' }),
  drink('blu-ten', 'BLU טן', 8, { c1: '#0F766E', c2: '#F4EAD5', label: 'BLU TEN' }),
  drink('monster-regular', 'מונסטר', 12, { c1: '#1C1A17', c2: '#7CCB2B', label: 'מונסטר' }),
  drink('monster-white', 'מונסטר לבן', 12, { c1: '#F4F4F4', c2: '#9CA3AF', label: 'מונסטר' }),
  drink('monster-mango', 'מונסטר מנגו', 12, { c1: '#2DD4BF', c2: '#FF7A1A', label: 'מונסטר' }),
  drink('prime', 'פריים', 15, { shape: 'bottle', c1: '#1D4ED8', c2: '#FF4FA3', label: 'PRIME' }),
  drink('schweppes', 'שוופס בטעמים', 6, { c1: '#FFD23F', c2: '#1C1A17', label: 'שוופס' }),
  drink('soda', 'סודה', 4, { shape: 'bottle', c1: '#BFE9FF', c2: '#1D4ED8' }),
  drink('prigat-grape', 'פריגת ענבים', 5, { shape: 'pouch', c1: '#6B2FA0', c2: '#B5F23A', label: 'פריגת' }),
  drink('prigat-orange', 'פריגת תפוזים', 5, { shape: 'pouch', c1: '#FF7A1A', c2: '#2E9E5B', label: 'פריגת' }),
  drink('prigat-straw-banana', 'פריגת תות-בננה', 5, { shape: 'pouch', c1: '#FF4FA3', c2: '#FFD23F', label: 'פריגת' }),
  drink('tropit', 'טרופית קרה', 2, { shape: 'pouch', c1: '#FFD23F', c2: '#E5212B', label: 'טרופית', tags: ['cold', 'parve', 'hit'] }),
  drink('water', 'מים מינרליים קרים', 4, { shape: 'bottle', c1: '#BFE9FF', c2: '#1D4ED8', label: 'מים' }),
  drink('flavored-water', 'מים בטעמים', 6, { shape: 'bottle', c1: '#FFB3D1', c2: '#2E9E5B', label: 'מים בטעם' }),
  drink('shoko-bag', 'שוקו בשקית', 4, { shape: 'pouch', c1: '#5B3418', c2: '#F4EAD5', label: 'שוקו', tags: ['cold', 'sweet'] }),
  drink('shoko-bottle', 'שוקו בבקבוק', 6, { shape: 'bottle', c1: '#5B3418', c2: '#F4EAD5', label: 'שוקו', tags: ['cold', 'sweet'] }),
  drink('ice-coffee', 'פחית אייס קפה', 8, { c1: '#3B2414', c2: '#D9A23B', label: 'אייס קפה', tags: ['cold'] }),

  // ---------------- הצלה לבית ספר ----------------
  rescue('pen-black', 'עט שחור', 3, { glyph: '🖊️', c1: '#1C1A17', c2: '#F4EAD5', label: 'עט שחור' }),
  rescue('pen-blue', 'עט כחול', 3, { glyph: '🖊️', c1: '#1D4ED8', c2: '#F4EAD5', label: 'עט כחול' }),
  rescue('tipex', 'טיפקס', 6, { glyph: '🩹', c1: '#F4EAD5', c2: '#E5212B', label: 'טיפקס' }),
  rescue('eraser', 'מחק', 2, { glyph: '🧽', c1: '#FF4FA3', c2: '#F4EAD5', label: 'מחק' }),
  rescue('paper-lines', 'דפי שורות (5)', 1, { glyph: '📄', c1: '#F4EAD5', c2: '#5B7CFF', label: 'שורות' }),
  rescue('paper-grid', 'דפי משבצות (5)', 1, { glyph: '📐', c1: '#F4EAD5', c2: '#2E9E5B', label: 'משבצות' }),
  rescue('tissues', 'חבילת טישו אישית', 2, { glyph: '🤧', c1: '#8FE3FF', c2: '#1D4ED8', label: 'טישו' }),
  rescue('wipes', 'מגבונים', 5, { glyph: '🧻', c1: '#B5F23A', c2: '#1C1A17', label: 'מגבונים' }),
  rescue('toothpicks', 'קיסמים', 1, { glyph: '🦷', c1: '#D9A23B', c2: '#1C1A17', label: 'קיסמים' }),
  rescue('hair-ties', 'גומיות לשיער', 3, { glyph: '🎀', c1: '#FF4FA3', c2: '#1C1A17', label: 'גומיות' }),
  rescue('charger-rent', 'השכרת מטען להפסקה', 5, {
    glyph: '🔋', c1: '#B5F23A', c2: '#1C1A17', label: 'מטען', deposit: 20, qty: 4,
    blurb: '+ 20 ₪ פיקדון שחוזר אליך כשמחזירים את המטען.',
  }),

  // ---------------- קומבואים והפתעות ----------------
  combo('combo-double', 'קומבו שיעור כפול', 15, {
    c1: '#FF4FA3', c2: '#1C1A17', label: 'שיעור כפול', tags: ['hit'],
    blurb: 'פחית + חטיף + 2 חמצוצים. בוחרים הכל.',
    comboSlots: [
      { label: 'פחית', pick: { category: 'drinks', shape: 'can' } },
      { label: 'חטיף', pick: { category: 'salty' } },
      { label: 'חמצוץ ראשון', pick: { bag: true } },
      { label: 'חמצוץ שני', pick: { bag: true } },
    ],
  }),
  combo('combo-sweet', 'קומבו מתוק', 14, {
    c1: '#D9A23B', c2: '#1C1A17', label: 'קומבו מתוק', tags: ['sweet'],
    blurb: 'שוקולד + שתייה + חמצוץ.',
    comboSlots: [
      { label: 'שוקולד', pick: { category: 'choco' } },
      { label: 'שתייה', pick: { category: 'drinks' } },
      { label: 'חמצוץ', pick: { bag: true } },
    ],
  }),
  combo('mystery-10', 'שקית הפתעה 10 ₪', 10, { shape: 'mystery', c1: '#C9A26B', c2: '#1C1A17', label: '10', blurb: 'שווה יותר ממה ששילמת. לא אומרים מה בפנים.' }),
  combo('mystery-15', 'שקית הפתעה 15 ₪', 15, { shape: 'mystery', c1: '#B5F23A', c2: '#1C1A17', label: '15', blurb: 'יותר גדולה, יותר מטורפת.' }),
  combo('mystery-25', 'שקית הפתעה 25 ₪', 25, { shape: 'mystery', c1: '#E5212B', c2: '#F4EAD5', label: '25', tags: ['hit'], blurb: 'השקית האגדית. יש בה פחית בטוח.' }),

  // ---------------- התפריט הסודי ----------------
  salty('secret-blue-heat', 'טאקיס בלו היט', 14, { secret: true, qty: 6, c1: '#1D4ED8', c2: '#8FE3FF', label: 'BLUE HEAT', tags: ['hot', 'salty'], blurb: 'מגיע במשלוח פרטי. נגמר מהר.' }),
  choco('secret-matcha', "קיט קאט מאצ'ה", 12, { secret: true, qty: 6, c1: '#7CB342', c2: '#F4EAD5', label: "מאצ'ה", blurb: 'יבוא אישי מיפן. כמויות של מעבדה.' }),
  combo('secret-combo-b', 'הקומבו של B', 18, { secret: true, compareAt: 24, qty: 8, c1: '#1C1A17', c2: '#D9A23B', label: 'של B', blurb: 'מונסטר + טאקיס + 3 חמצוצים. מה ש-B אוכל בשיעור כפול.' }),
]

export const DEFAULT_VOTE_OPTIONS = ['טאקיס בלו היט', 'פאנטה לימון', 'אוראו גולדן', 'קינדר מקסי קינג']
