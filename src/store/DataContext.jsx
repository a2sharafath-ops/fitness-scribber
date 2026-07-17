import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { loadDB, saveDB } from '../lib/storage'
import { hasBackend } from '../lib/supabase'
import { fetchAll, persistDiff } from '../api/sync'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  // Local mode: hydrate from localStorage immediately. Backend mode: load async.
  const [db, setDb] = useState(() => (hasBackend ? null : loadDB()))
  const [loadError, setLoadError] = useState(null)
  // Authoritative latest snapshot, so commit() never relies on the updater running
  // (React StrictMode double-invokes updaters in dev — side effects must stay out of them).
  const dbRef = useRef(db)
  useEffect(() => { dbRef.current = db }, [db])

  // Re-pull the whole dataset from the backend (used after seeding / wearable sync
  // so we never need a full window.location.reload()). No-op in local mode.
  const refresh = useCallback(() => {
    if (!hasBackend) return Promise.resolve()
    return fetchAll().then((d) => { setLoadError(null); setDb(d) })
  }, [])

  useEffect(() => {
    if (hasBackend) fetchAll().then((d) => { setLoadError(null); setDb(d) }).catch((e) => { console.error('load failed', e); setLoadError(e) })
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
    () => ({ db, commit, refresh, tz: db?.settings?.tz, units: db?.settings?.units, loadIssues: db?._loadIssues || [] }),
    [db, commit, refresh],
  )

  if (hasBackend && !db) {
    if (loadError) {
      return (
        <div className="empty" style={{ paddingTop: 120 }}>
          <div className="big">⚠️</div>
          Couldn’t load your data.
          <div className="muted" style={{ fontSize: 13, margin: '6px 0 14px' }}>{loadError.message || 'Check your connection and try again.'}</div>
          <button className="btn" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )
    }
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
