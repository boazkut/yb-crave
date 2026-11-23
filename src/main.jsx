import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/heebo/index.css'
import './index.css'
import { App } from './App.jsx'
import { initInstall } from './lib/install.js'
import { registerSW } from './lib/push.js'

// מוכנים להתקנה כאפליקציה ולהתראות מהרגע הראשון
initInstall()
registerSW()

// כל כניסה מחדש מתחילה מדף הבית (המנהלים נשארים באזור שלהם)
if (/^\/(c|deal)\//.test(window.location.pathname)) window.history.replaceState({}, '', '/')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
