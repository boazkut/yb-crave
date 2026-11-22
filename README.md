# Y&B CRAVE

חנות הנשנושים והשתייה של Y&B: מזמינים מהטלפון, משלמים ב-PayBox / Bit / מזומן, ומקבלים עד החדר.

React + Vite + Tailwind CSS + lucide-react + Firebase (חבילת Spark החינמית).
האתר רץ ב-Netlify ומתעדכן לבד בכל push לענף `main`.

---

## מה יש באתר

**ללקוחות:** קטלוג מסודר לפי קטגוריות עם סרגל דביק, חיפוש, סינון לפי תקציב (עד 5 / 10 / 20 ₪), הרכבת שקית חמצוצים, קומבואים, טופס הזמנה (שם, טלפון ישראלי, מספר חדר, הערה), תשלום ב-PayBox עם חובת צילום אישור, Bit עם צילום לא חובה, או מזומן עם עודף. אחרי השליחה: מספר הזמנה וסטטוס חי. כל לקוח רואה רק את ההזמנות שלו.

**למנהלים (`/admin`, אין אליו קישור באתר):** הזמנות והעברות בלייב, אישור או דחיית תשלום מתוך צילום המסך (עם סיבה), ניהול מנהלים והרשאות, מוצרים / מחירים / תמונות / מלאי / קטגוריות, מתג פתוח-סגור, מספר להעברות, וסיכום כספי עם חלוקה 50/50 בין Y ל-B אחרי עלות סחורה.

**מצב דמו:** כל עוד Firebase לא מחובר, הכל עובד אבל נשמר רק בדפדפן. הכניסה ל-`/admin` היא עם הקוד `2580`.

---

## חיבור Firebase (כ-10 דקות, חינם)

1. **פרויקט:** נכנסים ל-[console.firebase.google.com](https://console.firebase.google.com) ← Create project (אפשר בלי Analytics). נשארים בחבילת Spark.
2. **מסד נתונים:** Build ← Firestore Database ← Create database ← Production mode ← מיקום `eur3`.
3. **חוקי אבטחה:** באותו מסך, לשונית **Rules**: מוחקים הכל, מדביקים את כל התוכן של הקובץ [`firestore.rules`](firestore.rules) ולוחצים **Publish**. החוקים האלה הם מה שמונע מכל אחד שאינו מנהל לראות הזמנות, טלפונים וצילומי תשלום, או לשנות מחירים.
4. **התחברות:** Build ← Authentication ← Get started ← Sign-in method. מפעילים:
   - **Email/Password** (למנהלים)
   - **Anonymous** (ללקוחות, כדי שכל אחד יראה רק את ההזמנה שלו)
   
   ובלשונית Settings ← Authorized domains מוסיפים `yb-crave.netlify.app`.
5. **המנהל הראשי:** Firestore ← Start collection ← שם: `admins` ← Document ID: **האימייל שלכם באותיות קטנות** ← שדות: `name` (string) = השם, `role` (string) = `owner`.
6. **פרטי החיבור:** ⚙️ Project settings ← Your apps ← `</>` ← רושמים אפליקציה ← מעתיקים את ה-`firebaseConfig`.
   ב-Netlify: Project configuration ← Environment variables, מוסיפים:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
   ואז Deploys ← Trigger deploy.
7. **כניסה ראשונה:** נכנסים ל-`/admin` ← "כניסה ראשונה? יצירת סיסמה" עם אותו אימייל ← מאשרים את מייל האימות ← לוחצים "העלאת הקטלוג".

מנהלים נוספים: המנהל הראשי מוסיף אותם בטאב "מנהלים" (שם + אימייל), והם נכנסים בדיוק כמו בשלב 7.

> **למה אין `storage.rules`?** Cloud Storage של Firebase דורש היום חבילה בתשלום (Blaze). לכן צילומי התשלום נדחסים בטלפון של הלקוח לכ-100–300KB ונשמרים בקולקציה נפרדת ב-Firestore (`paymentProofs`), שרק מנהלים יכולים לקרוא. בהגדרות יש כפתור שמוחק צילומים של הזמנות ישנות כדי לשמור על המסד קטן.

> מפתח ה-Web של Firebase אינו סוד (הוא תמיד גלוי בדפדפן). ההגנה האמיתית היא חוקי ה-Firestore משלב 3.

---

## העלאה בחינם

**Netlify (כבר מחובר):** כל push ל-`main` בריפו הזה עולה לאוויר תוך כחצי דקה. ההגדרות בקובץ `netlify.toml`.

**Vercel (אם רוצים במקום):** vercel.com ← Add New ← Project ← מייבאים את הריפו `yb-crave` מ-GitHub ← Framework: Vite ← מוסיפים את אותם משתני `VITE_FIREBASE_*` ← Deploy. הקובץ `vercel.json` כבר דואג שהנתיב `/admin` יעבוד. לא לשכוח להוסיף את הדומיין של Vercel ל-Authorized domains ב-Firebase.

---

## איפה משנים מה

| מה | איפה |
|---|---|
| מספר להעברות, קישורי PayBox/Bit, וואטסאפ | `/admin` ← הגדרות (ברירת מחדל ב-`src/config.js`) |
| מוצרים, מחירים, תמונות, מלאי, קטגוריות | `/admin` ← מוצרים |
| הקטלוג ההתחלתי | `src/data/catalog.js` |
| חוקי אבטחה | `firestore.rules` |

הרצה מקומית: `npm install` ואז `npm run dev`.
