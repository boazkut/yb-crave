import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { initStorage, storage } from '../services/storageService.js'
import { DEFAULT_SETTINGS, DEFAULT_VOTES } from '../services/defaults.js'
import { SEED_PRODUCTS } from '../data/catalog.js'

const DataCtx = createContext(null)

export function DataProvider({ children }) {
  const [products, setProducts] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [votes, setVotes] = useState(DEFAULT_VOTES)
  const [mode, setMode] = useState('local')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let unsubs = []
    let alive = true
    initStorage().then((a) => {
      if (!alive) return
      setMode(a.mode)
      unsubs = [
        storage.subscribeProducts((list) => setProducts(list)),
        storage.subscribeSettings(setSettings),
        storage.subscribeVotes(setVotes),
      ]
      setReady(true)
    })
    return () => {
      alive = false
      unsubs.forEach((u) => u && u())
    }
  }, [])

  const value = useMemo(() => {
    // אם המסד בענן עוד ריק — מציגים את הקטלוג המובנה כדי שהאתר לא ייראה ריק
    const seeded = products && products.length > 0
    const list = seeded ? products : SEED_PRODUCTS
    const byId = Object.fromEntries(list.map((p) => [p.id, p]))
    return {
      ready: ready && products !== null,
      products: list,
      byId,
      catalogEmpty: products !== null && !seeded,
      settings,
      votes,
      mode,
    }
  }, [products, settings, votes, mode, ready])

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

export const useData = () => useContext(DataCtx)
