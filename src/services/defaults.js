import { SITE_CONFIG } from '../config.js'
import { DEFAULT_CATEGORIES } from '../data/catalog.js'

export const DEFAULT_SETTINGS = {
  storeOpen: true,
  transferPhone: SITE_CONFIG.transferPhone,
  payboxLink: SITE_CONFIG.payboxLink,
  bitLink: SITE_CONFIG.bitLink,
  whatsappNumber: SITE_CONFIG.whatsappNumber,
  categories: DEFAULT_CATEGORIES,
  costLog: [],
}

export const withSettingsDefaults = (s) => {
  const merged = { ...DEFAULT_SETTINGS, ...(s || {}) }
  if (!Array.isArray(merged.categories) || !merged.categories.length) merged.categories = DEFAULT_CATEGORIES
  return merged
}
