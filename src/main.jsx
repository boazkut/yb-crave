import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/secular-one/hebrew.css'
import '@fontsource/secular-one/latin.css'
import '@fontsource-variable/rubik/index.css'
import './index.css'
import { App } from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
