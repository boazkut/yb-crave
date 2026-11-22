/**
 * ===============================================
 *  Y&B CRAVE — קובץ ההגדרות הראשי
 *  כאן מחליפים מספרי טלפון, קישורי תשלום וקוד מנהל.
 *  (אפשר לשנות את רוב הדברים גם מהדשבורד ב-/admin)
 * ===============================================
 */

export const SITE_CONFIG = {
  // ---------- תשלומים ויצירת קשר ----------
  // מספר הטלפון שמקבל העברות ב-Bit (יוצג ללקוח + כפתור העתקה)
  bitPhone: '050-0000000',
  // קישור ישיר לתשלום ב-Bit (אם יש לכם קישור תשלום אישי). אם ריק — הכפתור פותח את אפליקציית Bit
  bitLink: '',
  // קישור לקבוצת PayBox של Y&B
  payboxLink: 'https://payboxapp.page.link/',
  // מספר WhatsApp לקבלת הזמנות — בפורמט בינלאומי בלי + ובלי 0 בהתחלה (למשל 972501234567)
  whatsappNumber: '972500000000',

  // ---------- דשבורד מנהלים ----------
  // קוד PIN ברירת מחדל לכניסה ל-/admin (מומלץ להחליף מהדשבורד מיד אחרי הכניסה הראשונה)
  defaultAdminPin: '2580',
  // במצב Firebase: המייל של משתמש המנהל ב-Firebase Authentication (הסיסמה נבחרת אצלכם ב-Firebase)
  adminEmail: 'admin@yb-crave.app',

  // ---------- זמני הפסקות ----------
  breaks: ['10:00', '11:45', '13:30'],
  // כמה דקות לפני ההפסקה נסגרות ההזמנות אליה
  cutoffMinutes: 10,
  // ימי פעילות (0 = ראשון ... 5 = שישי)
  schoolDays: [0, 1, 2, 3, 4],

  // ---------- שונות ----------
  marquee:
    '🔥 עכשיו במלאי: קולה קפואה • הזמנות להפסקת 11:45 נסגרות בקרוב • הגיעו טאקיס וחמצוצים חדשים 🔥',
  meetPoints: ['בכיתה', 'ליד הקיוסק', 'בחצר'],
  secretCode: 'CRAVE5',
  loyaltyGoal: 8,
}

/**
 * חיבור ל-Firebase Firestore (חינם — חבילת Spark).
 * ממלאים כאן את ה-firebaseConfig מהקונסול של Firebase, או מגדירים משתני סביבה ב-Netlify
 * (VITE_FIREBASE_API_KEY וכו'). כל עוד apiKey ריק — האתר עובד במצב מקומי (LocalStorage).
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
