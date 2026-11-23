import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { initStorage, storage } from '../services/storageService.js'
import { DEFAULT_SETTINGS } from '../services/defaults.js'
import { SEED_PRODUCTS } from '../data/catalog.js'

const DataCtx = createContext(null)

export function DataProvider({ children }) {
  const [products, setProducts] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [mode, setMode] = useState('demo')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let unsubs = []
    let alive = true
    initStorage().then((a) => {
      if (!alive) return
      setMode(a.mode)
      unsubs = [storage.subscribeProducts(setProducts), storage.subscribeSettings(setSettings)]
      setReady(true)
    })
    return () => {
      alive = false
      unsubs.forEach((u) => u && u())
    }
  }, [])

  const value = useMemo(() => {
    // הקטלוג המובנה מוצג רק במצב דמו מקומי. באתר האמיתי לעולם לא מחליפים את המוצרים שלכם ברשימה הישנה
    const seeded = products && products.length > 0
    const fallback = mode === 'demo' ? SEED_PRODUCTS : []
    const list = [...(seeded ? products : fallback)].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    return {
      ready: ready && products !== null,
      products: list,
      byId: Object.fromEntries(list.map((p) => [p.id, p])),
      categories: settings.categories,
      catalogEmpty: products !== null && !seeded,
      settings,
      mode,
    }
  }, [products, settings, mode, ready])

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

export const useData = () => useContext(DataCtx)
