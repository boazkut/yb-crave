/**
 * הקטלוג ההתחלתי של Y&B CRAVE.
 * נטען למערכת בפעם הראשונה, ומשם הכל (מוצרים, מחירים, קטגוריות) נערך מהדשבורד ב-/admin.
 *
 * art = הציור שמוצג כל עוד אין תמונה אמיתית למוצר:
 *   shape: bag | tube | bar | box | cookie | strip | gummy | lolly | can | bottle | pouch | supply | mystery | combo
 */

export const CATALOG_VERSION = 6

export const DEFAULT_CATEGORIES = [
  { id: 'drinks', name: 'פחיות ושתייה', desc: 'פחיות קרות, אנרגיה, מים ושוקו' },
  { id: 'salty', name: 'חטיפים מלוחים', desc: 'במבה, ביסלי, דוריטוס וכל החבר׳ה' },
  { id: 'sweets', name: 'שוקולדים ומתוקים', desc: 'קינדר, קליק, עוגיות וחטיפי שוקולד' },
  { id: 'sour', name: 'חמצוצים וגומי', desc: 'פסים, נחשים ושקית שמרכיבים לבד' },
  { id: 'combos', name: 'קומבואים והפתעות', desc: 'קומבו שיעור כפול ושקיות הפתעה' },
  { id: 'rescue', name: 'הצלה וציוד', desc: 'עטים, טיפקס, טישו ומטען' },
]

/** תמונה, צבע תגית וסרטון רקע לכל קטגוריה (קטגוריות חדשות מקבלות צבע לפי הסדר) */
export const CATEGORY_LOOK = {
  drinks: { image: '/media/cat-drinks.jpg', tone: 0, video: 'drinks' },
  salty: { image: '/media/cat-salty.jpg', tone: 1, video: 'salty' },
  sweets: { image: '/media/cat-sweets.jpg', tone: 2, video: 'sweets' },
  sour: { image: '/media/cat-sour.jpg', tone: 3, video: 'sweets' },
  combos: { image: '/media/cat-combos.jpg', tone: 4, video: 'drinks' },
  rescue: { image: '', tone: 5, video: 'salty' },
}

export const TONES = [
  { bg: '#E8F0FE', fg: '#1D4ED8' },
  { bg: '#FFF1E6', fg: '#C2410C' },
  { bg: '#FDE8EF', fg: '#BE185D' },
  { bg: '#E7F6EC', fg: '#15803D' },
  { bg: '#F1EAFE', fg: '#6D28D9' },
  { bg: '#EEF2F6', fg: '#334155' },
]

const make = (category, shape) => (id, name, price, o = {}) => ({
  id,
  name,
  category,
  price,
  imageUrl: '',
  stock: o.stock || 'in',
  art: { shape: o.shape || shape, c1: o.c1 || '#555', c2: o.c2 || '#F4EAD5', label: o.label || name, glyph: o.glyph || '' },
  note: o.note || '',
  bagEligible: Boolean(o.bag),
  comboSlots: o.comboSlots || null,
  sort: 0,
})

const drink = make('drinks', 'can')
const salty = make('salty', 'bag')
const sweet = make('sweets', 'bar')
const sour = make('sour', 'gummy')
const combo = make('combos', 'combo')
const rescue = make('rescue', 'supply')

const RAW = [
  // פחיות ושתייה
  drink('coke', 'קוקה קולה', 7, { c1: '#E5212B', c2: '#F4EAD5', label: 'קולה' }),
  drink('coke-zero', 'קולה זירו', 7, { c1: '#1C1A17', c2: '#E5212B', label: 'זירו' }),
  drink('sprite', 'ספרייט', 6, { c1: '#1F9D55', c2: '#FFD23F' }),
  drink('fanta-orange', 'פאנטה תפוזים', 6, { c1: '#FF7A1A', c2: '#1D4ED8', label: 'פאנטה' }),
  drink('fanta-grape', 'פאנטה ענבים', 6, { c1: '#6B2FA0', c2: '#FFD23F', label: 'פאנטה' }),
  drink('fanta-exotic', 'פאנטה אקזוטי', 6, { c1: '#FF4FA3', c2: '#FFD23F', label: 'פאנטה' }),
  drink('fuze-peach', 'פיוז טי אפרסק', 7, { shape: 'bottle', c1: '#F59E66', c2: '#7A2E12', label: 'פיוז טי' }),
  drink('fuze-mango', 'פיוז טי מנגו-אננס', 7, { shape: 'bottle', c1: '#FFB000', c2: '#2E9E5B', label: 'פיוז טי' }),
  drink('xl-regular', 'XL רגיל', 8, { c1: '#1D4ED8', c2: '#B5F23A', label: 'XL' }),
  drink('xl-watermelon', 'XL אבטיח', 8, { c1: '#E5212B', c2: '#2E9E5B', label: 'XL' }),
  drink('blu-regular', 'BLU רגיל', 8, { c1: '#1E40AF', c2: '#F4EAD5', label: 'BLU' }),
  drink('blu-ten', 'BLU טן', 8, { c1: '#0F766E', c2: '#F4EAD5', label: 'BLU TEN' }),
  drink('monster-regular', 'מונסטר', 12, { c1: '#1C1A17', c2: '#7CCB2B', label: 'מונסטר' }),
  drink('monster-white', 'מונסטר לבן', 12, { c1: '#F4F4F4', c2: '#6B6B6B', label: 'מונסטר' }),
  drink('monster-mango', 'מונסטר מנגו', 12, { c1: '#2DD4BF', c2: '#FF7A1A', label: 'מונסטר' }),
  drink('prime', 'פריים', 15, { shape: 'bottle', c1: '#1D4ED8', c2: '#FF4FA3', label: 'PRIME' }),
  drink('schweppes', 'סודה / שוופס', 5, { c1: '#FFD23F', c2: '#1C1A17', label: 'שוופס' }),
  drink('prigat', 'פריגת', 5, { shape: 'pouch', c1: '#FF7A1A', c2: '#2E9E5B', label: 'פריגת' }),
  drink('tropit', 'טרופית קרה', 2, { shape: 'pouch', c1: '#FFD23F', c2: '#E5212B', label: 'טרופית' }),
  drink('water', 'מים קרים', 4, { shape: 'bottle', c1: '#BFE9FF', c2: '#1D4ED8', label: 'מים' }),
  drink('shoko', 'שוקו', 5, { shape: 'pouch', c1: '#5B3418', c2: '#F4EAD5', label: 'שוקו' }),
  drink('ice-coffee', 'אייס קפה', 8, { c1: '#3B2414', c2: '#D9A23B', label: 'אייס קפה' }),

  // חטיפים מלוחים
  salty('bamba', 'במבה', 5, { c1: '#F5C400', c2: '#E5212B' }),
  salty('bamba-nougat', 'במבה נוגט', 6, { c1: '#3B2414', c2: '#F5C400' }),
  salty('bamba-red', 'במבה אדומה', 6, { c1: '#D61F3C', c2: '#F5C400' }),
  salty('bisli-grill', 'ביסלי גריל', 5, { c1: '#E5212B', c2: '#FFD23F' }),
  salty('bisli-bbq', 'ביסלי ברביקיו', 5, { c1: '#7A2E12', c2: '#FF7A1A', label: 'ביסלי BBQ' }),
  salty('bisli-pizza', 'ביסלי פיצה', 5, { c1: '#2E8B3A', c2: '#E5212B' }),
  salty('bisli-onion', 'ביסלי בצל', 5, { c1: '#8A5A2B', c2: '#F4EAD5' }),
  salty('doritos-sour-hot', 'דוריטוס חמוץ חריף', 7, { c1: '#0E7C3A', c2: '#B5F23A', label: 'דוריטוס' }),
  salty('doritos-nacho', "דוריטוס נאצ'ו", 7, { c1: '#D62828', c2: '#FFB000', label: 'דוריטוס' }),
  salty('doritos-fire', 'דוריטוס אש', 7, { c1: '#2A0E0E', c2: '#FF3D00', label: 'דוריטוס' }),
  salty('tapuchips-natural', "תפוצ'יפס טבעי", 6, { c1: '#F5C400', c2: '#1D4ED8', label: "תפוצ'יפס" }),
  salty('tapuchips-onion', "תפוצ'יפס שמנת בצל", 6, { c1: '#2E9E5B', c2: '#F4EAD5', label: "תפוצ'יפס" }),
  salty('tapuchips-crunch', "תפוצ'יפס קראנץ'", 6, { c1: '#3B3B3B', c2: '#F5C400', label: "קראנץ'" }),
  salty('cheetos-cheese', "צ'יטוס גבינה", 6, { c1: '#FF7A1A', c2: '#FFD23F', label: "צ'יטוס" }),
  salty('cheetos-kafa', "צ'יטוס כאפה", 6, { c1: '#FF5A1A', c2: '#5B7CFF', label: 'כאפה' }),
  salty('cheetos-hot', "צ'יטוס חריף", 6, { c1: '#C1121F', c2: '#FF7A1A', label: "צ'יטוס" }),
  salty('apropo', 'אפרופו', 6, { c1: '#1F7A4D', c2: '#F5C400' }),
  salty('dubonim', 'דובונים', 5, { c1: '#C2410C', c2: '#FDE68A' }),
  salty('pretzels-flat', 'בייגלה שטוחים', 5, { c1: '#B5651D', c2: '#F4EAD5', label: 'בייגלה' }),
  salty('pretzels-choco', 'בייגלה מצופה שוקולד', 7, { c1: '#3B2414', c2: '#D9A23B', label: 'בייגלה שוקו' }),
  salty('popko', 'פופקו', 4, { c1: '#FFD23F', c2: '#E5212B' }),
  salty('pringles', 'פרינגלס קטן', 8, { shape: 'tube', c1: '#E5212B', c2: '#F4EAD5', label: 'פרינגלס' }),
  salty('takis', 'טאקיס חריף', 12, { c1: '#4A1D7A', c2: '#FF3D00', label: 'TAKIS' }),
  salty('popcorn', 'פופקורן', 5, { c1: '#F4EAD5', c2: '#E5212B' }),
  salty('protein-bar', 'חטיף חלבון', 9, { shape: 'bar', c1: '#2B2B2B', c2: '#B5F23A', label: 'PROTEIN' }),
  salty('seeds', 'פיצוחים', 6, { c1: '#7A4E1D', c2: '#FFD23F' }),

  // שוקולדים ומתוקים
  sweet('bueno', 'קינדר בואנו', 8, { c1: '#F2EFE8', c2: '#E25822', label: 'בואנו' }),
  sweet('bueno-white', 'קינדר בואנו לבן', 8, { c1: '#FFFFFF', c2: '#9C6B3C', label: 'בואנו לבן' }),
  sweet('kinder-fingers', 'אצבעות קינדר', 6, { c1: '#F2EFE8', c2: '#1D4ED8', label: 'אצבעות' }),
  sweet('klik-cornflakes', 'קליק קורנפלקס', 6, { shape: 'bag', c1: '#E5212B', c2: '#FFD23F', label: 'קליק' }),
  sweet('klik-pillows', 'קליק כריות', 6, { shape: 'bag', c1: '#E5212B', c2: '#F4EAD5', label: 'קליק כריות' }),
  sweet('klik-biscuit', 'קליק ביסקוויט', 6, { shape: 'bag', c1: '#E5212B', c2: '#C68A3E', label: 'קליק' }),
  sweet('klik-xl', 'קליק XL', 9, { shape: 'bag', c1: '#B0151E', c2: '#FFD23F', label: 'קליק XL' }),
  sweet('pesek-zman', 'פסק זמן', 5, { c1: '#1E3A8A', c2: '#E5212B' }),
  sweet('kif-kef', 'כיף כף', 4, { c1: '#E5212B', c2: '#FFD23F' }),
  sweet('mekupelet', 'מקופלת', 5, { c1: '#6B2E1A', c2: '#F4EAD5' }),
  sweet('tortit', 'טורטית', 5, { c1: '#3B2414', c2: '#E5212B' }),
  sweet('egozi', 'אגוזי', 5, { c1: '#B8860B', c2: '#3B2414' }),
  sweet('taami', 'טעמי', 5, { c1: '#E5212B', c2: '#F4EAD5' }),
  sweet('twist', 'טוויסט', 5, { c1: '#1D4ED8', c2: '#FFD23F' }),
  sweet('oreo', 'אוראו', 7, { shape: 'box', c1: '#1E3A8A', c2: '#F4EAD5' }),
  sweet('mms', "M&M's", 8, { shape: 'bag', c1: '#6B3A1E', c2: '#FFD23F' }),
  sweet('snickers', 'סניקרס', 7, { c1: '#5B3418', c2: '#1D4ED8' }),
  sweet('twix', 'טוויקס', 7, { c1: '#C49A2C', c2: '#E5212B' }),
  sweet('mars', 'מארס', 7, { c1: '#1C1A17', c2: '#E5212B' }),
  sweet('reeses', 'ריסז', 9, { c1: '#FF7A1A', c2: '#5B3418' }),
  sweet('para-mini', 'שוקולד פרה מיני', 3, { c1: '#1D4ED8', c2: '#F4EAD5', label: 'פרה' }),
  sweet('loacker', 'וופל לואקר', 6, { c1: '#E5212B', c2: '#F4EAD5', label: 'לואקר' }),
  sweet('lotus', 'לוטוס', 5, { shape: 'box', c1: '#B0151E', c2: '#F4EAD5' }),
  sweet('chocata', "צ'וקטה", 6, { shape: 'box', c1: '#5B3418', c2: '#FFD23F' }),
  sweet('brownie', 'בראוניז', 8, { shape: 'box', c1: '#3B2414', c2: '#D9A23B' }),
  sweet('energy-bar', 'חטיף אנרגיה', 6, { c1: '#2E7D32', c2: '#F4EAD5', label: 'אנרגיה' }),

  // חמצוצים וגומי
  sour('strip-strawberry', 'פס חמוץ תות', 2, { shape: 'strip', c1: '#E5212B', c2: '#FFD23F', label: 'תות', bag: true }),
  sour('strip-apple', 'פס חמוץ תפוח', 2, { shape: 'strip', c1: '#7CCB2B', c2: '#FFD23F', label: 'תפוח', bag: true }),
  sour('strip-cola', 'פס חמוץ קולה', 2, { shape: 'strip', c1: '#5B3418', c2: '#F4EAD5', label: 'קולה', bag: true }),
  sour('strip-rainbow', 'פס חמוץ קשת', 2, { shape: 'strip', c1: 'rainbow', c2: '#F4EAD5', label: 'קשת', bag: true }),
  sour('sour-carpets', 'שטיחים חמוצים', 3, { shape: 'strip', c1: '#FF4FA3', c2: '#B5F23A', label: 'שטיחים', bag: true }),
  sour('sour-snakes', 'נחשי גומי חמוצים', 1, { c1: '#B5F23A', c2: '#E5212B', label: 'נחשים', bag: true }),
  sour('strawberries', 'תותים', 1, { c1: '#E5212B', c2: '#F4EAD5', bag: true }),
  sour('cola-bottles', 'בקבוקי קולה', 1, { c1: '#7A3E12', c2: '#F4EAD5', label: 'קולה', bag: true }),
  sour('sour-wheels', 'גלגלי חמצוץ', 2, { c1: '#FF7A1A', c2: '#B5F23A', label: 'גלגלים', bag: true }),
  sour('watermelon', 'גומי אבטיח', 1, { c1: '#2E9E5B', c2: '#E5212B', label: 'אבטיח', bag: true }),
  sour('fried-eggs', 'ביצי עין', 1, { c1: '#FFFFFF', c2: '#FFC300', label: 'ביצי עין', bag: true }),
  sour('gummy-bears', 'דובוני גומי', 1, { c1: '#FF7A1A', c2: '#E5212B', label: 'דובונים', bag: true }),
  sour('filled-sours', 'חמצוצים ממולאים', 2, { c1: '#FF4FA3', c2: '#FFFFFF', label: 'ממולאים', bag: true }),
  sour('popping-candy', 'סוכריות קופצות', 3, { shape: 'pouch', c1: '#5B7CFF', c2: '#FF4FA3', label: 'קופצות' }),
  sour('chupa-chups', "צ'ופה צ'ופס", 2, { shape: 'lolly', c1: '#FF4FA3', c2: '#FFD23F', label: "צ'ופה" }),
  sour('toffee', 'טופי', 1, { c1: '#FFB000', c2: '#E5212B', bag: true }),
  sour('marshmallow', 'מרשמלו', 1, { c1: '#FFC2DD', c2: '#FFFFFF', bag: true }),
  sour('skittles', 'סקיטלס', 6, { shape: 'bag', c1: '#E5212B', c2: '#F4EAD5' }),
  sour('roll-ups', 'רול-אפס', 5, { shape: 'strip', c1: '#FF7A1A', c2: '#5B7CFF' }),
  sour('mentos', 'מנטוס', 5, { shape: 'tube', c1: '#1D4ED8', c2: '#F4EAD5' }),
  sour('gum-bazooka', 'מסטיק בזוקה', 1, { shape: 'bar', c1: '#FF4FA3', c2: '#1D4ED8', label: 'בזוקה' }),
  sour('gum-mast', 'מסטיק מאסט', 7, { shape: 'box', c1: '#2E9E5B', c2: '#F4EAD5', label: 'מאסט' }),
  sour('gum-orbit', 'מסטיק אורביט', 7, { shape: 'box', c1: '#1D4ED8', c2: '#F4EAD5', label: 'אורביט' }),

  // קומבואים ושקיות הפתעה
  combo('combo-double', 'קומבו שיעור כפול', 15, {
    c1: '#E5212B', c2: '#F4EAD5', label: 'שיעור כפול',
    note: 'פחית, חטיף ו-2 חמצוצים לבחירה',
    comboSlots: [
      { label: 'פחית', pick: { category: 'drinks', shape: 'can' } },
      { label: 'חטיף', pick: { category: 'salty' } },
      { label: 'חמצוץ ראשון', pick: { bag: true } },
      { label: 'חמצוץ שני', pick: { bag: true } },
    ],
  }),
  combo('combo-sweet', 'קומבו מתוק', 14, {
    c1: '#D9A23B', c2: '#1C1A17', label: 'מתוק',
    note: 'שוקולד, שתייה וחמצוץ לבחירה',
    comboSlots: [
      { label: 'שוקולד', pick: { category: 'sweets' } },
      { label: 'שתייה', pick: { category: 'drinks' } },
      { label: 'חמצוץ', pick: { bag: true } },
    ],
  }),
  combo('mystery-10', 'שקית הפתעה 10 ₪', 10, { shape: 'mystery', c1: '#C9A26B', c2: '#1C1A17', label: '10', note: 'שקית אטומה. שווה יותר ממה ששילמת.' }),
  combo('mystery-15', 'שקית הפתעה 15 ₪', 15, { shape: 'mystery', c1: '#B08852', c2: '#1C1A17', label: '15', note: 'שקית אטומה, גדולה יותר.' }),
  combo('mystery-25', 'שקית הפתעה 25 ₪', 25, { shape: 'mystery', c1: '#8C6A3E', c2: '#F4EAD5', label: '25', note: 'השקית הגדולה. יש בה פחית.' }),

  // הצלה וציוד
  rescue('pen-black', 'עט שחור', 3, { glyph: '🖊️', c1: '#1C1A17', c2: '#F4EAD5', label: 'שחור' }),
  rescue('pen-blue', 'עט כחול', 3, { glyph: '🖊️', c1: '#1D4ED8', c2: '#F4EAD5', label: 'כחול' }),
  rescue('tipex', 'טיפקס', 6, { glyph: '🩹', c1: '#F4EAD5', c2: '#1C1A17', label: 'טיפקס' }),
  rescue('eraser', 'מחק', 2, { glyph: '🧽', c1: '#FFC2DD', c2: '#1C1A17', label: 'מחק' }),
  rescue('paper', 'דפים (5)', 1, { glyph: '📄', c1: '#F4EAD5', c2: '#1C1A17', label: 'דפים' }),
  rescue('tissues', 'חבילת טישו אישית', 2, { glyph: '🤧', c1: '#BFE9FF', c2: '#1C1A17', label: 'טישו' }),
  rescue('wipes', 'מגבונים', 5, { glyph: '🧻', c1: '#E8F5D0', c2: '#1C1A17', label: 'מגבונים' }),
  rescue('charger-rent', 'השכרת מטען', 5, { glyph: '🔋', c1: '#E8F5D0', c2: '#1C1A17', label: 'מטען', note: 'מחזירים בסוף ההפסקה' }),
]

export const SEED_PRODUCTS = RAW.map((p, i) => ({ ...p, sort: i }))
