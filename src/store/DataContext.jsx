import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { loadDB, saveDB } from '../lib/storage'
import { hasBackend } from '../lib/supabase'
import { fetchAll, persistDiff } from '../api/sync'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  // Local mode: hydrate from localStorage immediately. Backend mode: load async.
  const [db, setDb] = useState(() => (hasBackend ? null : loadDB()))
  // Authoritative latest snapshot, so commit() never relies on the updater running
  // (React StrictMode double-invokes updaters in dev — side effects must stay out of them).
  const dbRef = useRef(db)
  useEffect(() => { dbRef.current = db }, [db])

  useEffect(() => {
    if (hasBackend) fetchAll().then(setDb).catch((e) => console.error('load failed', e))
  }, [])

  // Local mode persists the whole store; backend mode persists diffs per commit.
  useEffect(() => {
    if (!hasBackend && db) saveDB(db)
  }, [db])

  const commit = useCallback((mutator) => {
    const prev = dbRef.current
    if (!prev) return
    const next = structuredClone(prev)
    mutator(next)
    dbRef.current = next
    setDb(next)
    if (hasBackend) persistDiff(prev, next).catch((e) => console.error('persist failed', e))
  }, [])

  const value = useMemo(
    () => ({ db, commit, tz: db?.settings?.tz, units: db?.settings?.units }),
    [db, commit],
  )

  if (hasBackend && !db) {
    return <div className="empty" style={{ paddingTop: 120 }}><div className="big">⏳</div>Loading your athletes…</div>
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
