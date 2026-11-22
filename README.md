# Y&B CRAVE 🍬

**צנח הסוכר? אנחנו בדרך.**
חנות הנשנושים והשתייה של בית הספר: מזמינים מהטלפון, משלמים בביט / פייבוקס / מזומן, ומקבלים בהפסקה.

React + Vite + Tailwind CSS + Framer Motion. עלות תפעול: 0 ₪ (Netlify חינם + Firebase Spark חינם).

---

## מה יש באתר

**לתלמידים:** קטלוג של כ-140 מוצרים ב-6 קטגוריות, פס חדשות רץ, סטטוס חנות וספירה לאחור להפסקה, פחית שמרחפת ומסתובבת עם הגלילה, אזור שתייה קר עם בועות, כרטיסי מוצר תלת-ממדיים, טיסה לעגלה, חיפוש + תגיות + "יש לי רק X ₪", הרכבת שקית חמצוצים, רולטה, קומבואים, הזמנה קבוצתית, "הזמן שוב את הרגיל שלי", כרטיסיית ניקובים, תפריט סודי (5 לחיצות על הלוגו או הקוד `CRAVE5` בחיפוש), הכי נמכרים + הצבעה + "תודיעו לי כשחוזר", קופונים, תשלום ב-Bit/PayBox/מזומן, מעקב הזמנה חי ושליחה לוואטסאפ.

**למנהלים (`/admin`):** לוח הזמנות חי עם צליל להזמנה חדשה, אימות תשלום בקליק, ניהול מלאי/מחירים/תמונות/מוצרים, מתג פתוח/סגור, עריכת הפס הרץ וההפסקות, קישורי תשלום, קופונים, הצבעות, גיבוי, וסיכום כספי עם פיצול 50/50 בין Y ל-B.

קוד PIN ברירת מחדל לדשבורד: **2580** (מחליפים בלשונית "שליטה").

---

## 5 שלבים להפעלה מלאה

### 1. להחליף את מספרי Bit / PayBox / WhatsApp
הכי מהיר: נכנסים ל-`/admin` → "שליטה" → "תשלומים ויצירת קשר" ומעדכנים.
ברירות המחדל (למי שנכנס לראשונה) נמצאות בקובץ `src/config.js`, בשדות `bitPhone`, `bitLink`, `payboxLink`, `whatsappNumber`.
מספר וואטסאפ כותבים בפורמט בינלאומי: `972501234567` (בלי + ובלי 0).

### 2. להוסיף תמונות אמיתיות של מוצרים
כל מוצר מגיע עם ציור אריזה מובנה, אז לא חייבים. כשרוצים תמונה אמיתית יש שתי דרכים:
- **הכי פשוט:** שמים קובץ PNG שקוף בתיקייה `src/assets/products/` בשם של ה-id של המוצר (למשל `bamba.png`, `coke.png`, `takis.png`). אחרי push לגיטהאב הוא מופיע לבד. רשימת ה-id נמצאת ב-`src/data/catalog.js`.
- **מהדשבורד:** "מלאי" → לוחצים על מוצר → מדביקים קישור לתמונה.

### 3. לחבר Firebase (סנכרון חי בין כל הטלפונים, חינם)
בלי Firebase, כל טלפון שומר נתונים לעצמו וההזמנות מגיעות אליכם בוואטסאפ. עם Firebase, הזמנות, מלאי ומחירים מסתנכרנים בלייב.
1. נכנסים ל-[console.firebase.google.com](https://console.firebase.google.com) → Add project (בלי Analytics).
2. Build → **Firestore Database** → Create database → Production mode → מיקום `eur3`.
3. בלשונית **Rules** מדביקים את התוכן של הקובץ `firestore.rules` ולוחצים Publish.
4. Build → **Authentication** → Get started → Email/Password → Enable. בלשונית Users → Add user: המייל `admin@yb-crave.app` וסיסמה שתבחרו (זו הסיסמה לדשבורד).
5. ⚙️ Project settings → Your apps → `</>` (Web) → מעתיקים את ה-`firebaseConfig`.
6. ב-Netlify: Site configuration → Environment variables, מוסיפים:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
   ואז Deploys → Trigger deploy.
7. נכנסים ל-`/admin` עם הסיסמה מסעיף 4 ולוחצים "העלה קטלוג התחלתי".

> מפתח ה-Web של Firebase הוא לא סוד (הוא תמיד חשוף בדפדפן). ההגנה היא חוקי ה-Firestore שבקובץ `firestore.rules`.

### 4. האתר באוויר: GitHub → Netlify
הריפו מחובר ל-Netlify, וכל push לענף `main` מעלה גרסה חדשה תוך דקה. אין צורך להריץ שום דבר.
הגדרות הבנייה כבר בקובץ `netlify.toml` (`npm run build`, תיקיית `dist`).

### 5. לעבוד על האתר מקומית (לא חובה)
```bash
npm install
npm run dev
```

---

## מבנה הקוד

```
src/
  config.js                 ← טלפונים, קישורים, PIN, הפסקות, Firebase
  data/catalog.js           ← כל המוצרים והקטגוריות
  services/storageService.js← שכבת הנתונים (בוחרת לבד בין מקומי ל-Firebase)
  services/localAdapter.js  ← LocalStorage
  services/firebaseAdapter.js← Firestore + Auth
  components/               ← לוגו, פס רץ, פחית מרחפת, כרטיסי מוצר...
  features/                 ← עגלה וקופה, שקית חמצוצים, רולטה, קומבו, מעקב
  admin/                    ← הדשבורד
```
