/**
 * פתיחת אפליקציית התשלום ישירות מהאתר.
 * באנדרואיד נפתחת האפליקציה עצמה (ואם היא לא מותקנת — החנות של גוגל).
 * באייפון נפתח דף האפליקציה ב-App Store, ומשם "פתח".
 * אם בדשבורד הוגדר קישור משלכם (למשל קבוצת PayBox או קישור תשלום עסקי) — הוא נפתח במקום.
 */
const APPS = {
  paybox: {
    pkg: 'com.payboxapp',
    play: 'https://play.google.com/store/apps/details?id=com.payboxapp',
    ios: 'https://apps.apple.com/il/app/id895491053',
    web: 'https://www.payboxapp.com/',
  },
  bit: {
    pkg: 'com.bnhp.payments.paymentsapp',
    play: 'https://play.google.com/store/apps/details?id=com.bnhp.payments.paymentsapp',
    ios: 'https://apps.apple.com/il/app/id1182007739',
    web: 'https://www.bitpay.co.il/he',
  },
}

// קישורים כלליים שהיו ברירת מחדל בגרסה קודמת — לא נחשבים "קישור משלכם"
const GENERIC = ['https://payboxapp.page.link/', 'https://www.bitpay.co.il/he', 'https://www.bitpay.co.il/', '']

export function openPayApp(method, customLink = '') {
  const a = APPS[method]
  if (!a) return
  if (customLink && !GENERIC.includes(customLink.trim())) {
    window.location.href = customLink.trim()
    return
  }
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) {
    window.location.href = `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${a.pkg};S.browser_fallback_url=${encodeURIComponent(a.play)};end`
  } else if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    window.location.href = a.ios
  } else {
    window.open(a.web, '_blank', 'noopener')
  }
}
