/**
 * ===============================================
 *  Y&B CRAVE — קובץ ההגדרות הראשי
 *  את רוב הדברים אפשר לשנות גם מהדשבורד ב-/admin → הגדרות.
 * ===============================================
 */

export const SITE_CONFIG = {
  // מספר הטלפון שמקבל העברות ב-PayBox וב-Bit
  transferPhone: '055-775-7686',
  // קישור שנפתח בכפתור "פתח PayBox" (אפשר לשים קישור לקבוצת PayBox שלכם)
  payboxLink: 'https://payboxapp.page.link/',
  // קישור שנפתח בכפתור "פתח Bit"
  bitLink: 'https://www.bitpay.co.il/he',
  // וואטסאפ ללקוחות שצריכים עזרה (פורמט בינלאומי, בלי + ובלי 0): 972557757686
  whatsappNumber: '972557757686',

  // מצב דמו (לפני חיבור Firebase): קוד הכניסה לאזור המנהלים
  demoAdminPin: '2580',
}

/**
 * חיבור ל-Firebase (חינם, חבילת Spark).
 * ממלאים את הערכים כאן, או מגדירים משתני סביבה ב-Netlify / Vercel:
 * VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID
 * כל עוד apiKey ריק — האתר רץ במצב דמו (הכל נשמר בטלפון בלבד).
 */
const env = import.meta.env
export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
}

export const isFirebaseConfigured = () => Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId)
