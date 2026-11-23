import { SITE_CONFIG } from '../config.js'
import { DEFAULT_CATEGORIES, REMOVED_CATEGORIES } from '../data/catalog.js'

export const DEFAULT_SETTINGS = {
  storeOpen: true,
  transferPhone: SITE_CONFIG.transferPhone,
  payboxLink: SITE_CONFIG.payboxLink,
  bitLink: SITE_CONFIG.bitLink,
  whatsappNumber: SITE_CONFIG.whatsappNumber,
  supportPhones: SITE_CONFIG.supportPhones,
  categories: DEFAULT_CATEGORIES,
  deals: [],
  costLog: [],
}

export const withSettingsDefaults = (s) => {
  const merged = { ...DEFAULT_SETTINGS, ...(s || {}) }
  if (!Array.isArray(merged.categories) || !merged.categories.length) merged.categories = DEFAULT_CATEGORIES
  const known = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, c]))
  merged.categories = merged.categories
    .filter((c) => !REMOVED_CATEGORIES.includes(c.id))
    .map((c) => (c.id === 'sour' && c.name === 'חמצוצים וגומי' ? { ...c, name: known.sour.name, desc: known.sour.desc } : c))
    // השקית בהרכבה הוסרה
    .map((c) => (c.desc && c.desc.includes('שקית שמרכיבים') ? { ...c, desc: known[c.id]?.desc || c.desc.replace(/\s*ו?שקית שמרכיבים לבד/, '') } : c))
    .map((c) => ({ desc: known[c.id]?.desc || '', ...c }))
  if (!Array.isArray(merged.supportPhones)) merged.supportPhones = SITE_CONFIG.supportPhones
  if (!Array.isArray(merged.deals)) merged.deals = []
  return merged
}
