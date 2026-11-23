import { useEffect, useState } from 'react'

/**
 * סרטוני הרקע: יש דפדפנים שחוטפים כל <video> ופותחים אותו בנגן משלהם
 * (הדפדפן של שיאומי, דפדפנים בתוך אפליקציות כמו אינסטגרם/טיקטוק, ועוד).
 * אצלם מציגים תמונות במקום סרטונים. ואם בכל זאת סרטון קופץ למסך מלא או לחלון צף —
 * סוגרים אותו מיד ועוברים לתמונות עד סוף הביקור.
 */
const KEY = 'ybc:noVideo'
const EVENT = 'ybc:novideo'

const HIJACKERS =
  /MiuiBrowser|XiaoMi\/|UCBrowser|UCWEB|HeyTapBrowser|HuaweiBrowser|HONORBrowser|VivoBrowser|OppoBrowser|Quark\/|baiduboxapp|MQQBrowser|MicroMessenger|FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat|Twitter|Pinterest/i

function iosInAppWebView(ua) {
  const ios = /iPhone|iPad|iPod/i.test(ua)
  // ב-Safari ובכל דפדפן רגיל באייפון יש "Safari/" ב-UA; בחלונות בתוך אפליקציות אין
  return ios && !/Safari\//i.test(ua) && !window.navigator.standalone
}

function computeAllowed() {
  if (typeof window === 'undefined') return false
  try {
    if (window.sessionStorage.getItem(KEY)) return false
  } catch {
    /* פרטי */
  }
  const ua = navigator.userAgent || ''
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  if (navigator.connection?.saveData === true) return false
  if (HIJACKERS.test(ua) || iosInAppWebView(ua)) return false
  return true
}

let allowed = computeAllowed()

export function disableVideos() {
  if (!allowed) return
  allowed = false
  try {
    window.sessionStorage.setItem(KEY, '1')
  } catch {
    /* פרטי */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useVideoAllowed() {
  const [ok, setOk] = useState(allowed)
  useEffect(() => {
    const f = () => setOk(allowed)
    window.addEventListener(EVENT, f)
    return () => window.removeEventListener(EVENT, f)
  }, [])
  return ok
}

/** מגן על סרטון: אם נפתח במסך מלא או בחלון צף — סוגרים ועוברים לתמונות */
export function guardVideo(el) {
  if (!el || el.dataset.guarded) return
  el.dataset.guarded = '1'
  const bail = () => {
    try {
      el.webkitExitFullscreen?.()
    } catch {
      /* */
    }
    try {
      if (document.pictureInPictureElement) document.exitPictureInPicture()
    } catch {
      /* */
    }
    try {
      if (document.fullscreenElement) document.exitFullscreen()
    } catch {
      /* */
    }
    el.pause()
    disableVideos()
  }
  el.addEventListener('webkitbeginfullscreen', bail)
  el.addEventListener('enterpictureinpicture', bail)
  el.addEventListener('fullscreenchange', bail)
  el.addEventListener('webkitfullscreenchange', bail)
}

if (typeof document !== 'undefined') {
  const onFs = () => {
    const fs = document.fullscreenElement || document.webkitFullscreenElement
    if (fs && fs.tagName === 'VIDEO') {
      try {
        ;(document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
      } catch {
        /* */
      }
      disableVideos()
    }
  }
  document.addEventListener('fullscreenchange', onFs)
  document.addEventListener('webkitfullscreenchange', onFs)
}

/** תכונות שמבקשות מהדפדפן לנגן בתוך הדף ובלי נגן משלו */
export const INLINE_VIDEO_PROPS = {
  muted: true,
  playsInline: true,
  disablePictureInPicture: true,
  disableRemotePlayback: true,
  controls: false,
  controlsList: 'nodownload nofullscreen noremoteplayback noplaybackrate',
  tabIndex: -1,
  'webkit-playsinline': 'true',
  'x5-playsinline': 'true',
  'x5-video-player-type': 'h5-page',
  'x5-video-player-fullscreen': 'false',
  'x-webkit-airplay': 'deny',
  'aria-hidden': 'true',
}
