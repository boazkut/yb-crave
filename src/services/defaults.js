import { SITE_CONFIG } from '../config.js'
import { DEFAULT_VOTE_OPTIONS } from '../data/catalog.js'

export const DEFAULT_SETTINGS = {
  storeOpen: true,
  marquee: SITE_CONFIG.marquee,
  breaks: SITE_CONFIG.breaks,
  cutoffMinutes: SITE_CONFIG.cutoffMinutes,
  schoolDays: SITE_CONFIG.schoolDays,
  meetPoints: SITE_CONFIG.meetPoints,
  bitPhone: SITE_CONFIG.bitPhone,
  bitLink: SITE_CONFIG.bitLink,
  payboxLink: SITE_CONFIG.payboxLink,
  whatsappNumber: SITE_CONFIG.whatsappNumber,
  coupons: [{ code: 'YB10', kind: 'percent', value: 10, active: true }],
  voteOptions: DEFAULT_VOTE_OPTIONS,
  secretCode: SITE_CONFIG.secretCode,
  loyaltyGoal: SITE_CONFIG.loyaltyGoal,
  adminPinHash: '',
  costLog: [],
}

export const DEFAULT_VOTES = { round: 1, counts: {} }

export const withSettingsDefaults = (s) => ({ ...DEFAULT_SETTINGS, ...(s || {}) })
