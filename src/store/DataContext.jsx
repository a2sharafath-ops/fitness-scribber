import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { loadDB, saveDB } from '../lib/storage'
import { hasBackend } from '../lib/supabase'
import { fetchAll, persistDiff } from '../api/sync'

const DataContext = createContext(null)

export function DataProvider({ children, initialDb, initialError = null, backend = hasBackend }) {
  // Local mode: hydrate from localStorage immediately. Backend mode: load async.
  const [db, setDb] = useState(() => (initialDb !== undefined ? initialDb : backend ? null : loadDB()))
  const [loadError, setLoadError] = useState(initialError)
  // Tables whose last write failed (missing column/table) — surfaced in the UI.
  const [writeIssues, setWriteIssues] = useState([])
  const [saveStatus, setSaveStatus] = useState('idle')
  const writeQueueRef = useRef(Promise.resolve())
  const pendingWritesRef = useRef(0)
  const writeFailedRef = useRef(false)
  const localSavePendingRef = useRef(false)
  const commitVersionRef = useRef(0)
  // Authoritative latest snapshot, so commit() never relies on the updater running
  // (React StrictMode double-invokes updaters in dev — side effects must stay out of them).
  const dbRef = useRef(db)
  useEffect(() => { dbRef.current = db }, [db])

  // Re-pull the whole dataset from the backend (used after seeding / wearable sync
  // so we never need a full window.location.reload()). No-op in local mode.
  const refresh = useCallback(() => {
    if (!backend) return Promise.resolve()
    return writeQueueRef.current.then(() => {
      if (writeFailedRef.current) throw new Error('Unsaved changes are still shown locally. Resolve the save issue before reloading data.')
      const version = commitVersionRef.current
      return fetchAll().then((d) => {
        if (commitVersionRef.current !== version) throw new Error('Changes were made while data refreshed. Try again after they finish saving.')
        return d
      })
    }).then((d) => {
      dbRef.current = d
      writeFailedRef.current = false
      setWriteIssues([])
      setSaveStatus('idle')
      setLoadError(null)
      setDb(d)
    })
  }, [backend])

  useEffect(() => {
    if (!backend) return undefined
    let active = true
    fetchAll().then((d) => { if (active) { dbRef.current = d; setLoadError(null); setDb(d) } })
      .catch((e) => { if (active) { console.error('load failed', e); setLoadError(e) } })
    return () => { active = false }
  }, [backend])

  // Local mode persists the whole store; backend mode persists diffs per commit.
  useEffect(() => {
    if (!backend && db) {
      const saved = saveDB(db)
      if (localSavePendingRef.current) {
        localSavePendingRef.current = false
        setSaveStatus(saved ? 'saved' : 'failed')
        if (saved) setWriteIssues([])
        else setWriteIssues([{ table: 'local storage', message: 'Browser storage is unavailable', kind: 'write' }])
      } else if (!saved) {
        setSaveStatus('failed')
        setWriteIssues([{ table: 'local storage', message: 'Browser storage is unavailable', kind: 'write' }])
      }
    }
  }, [backend, db])

  const commit = useCallback((mutator) => {
    const prev = dbRef.current
    if (!prev) return
    const next = structuredClone(prev)
    mutator(next)
    commitVersionRef.current += 1
    dbRef.current = next
    setDb(next)
    setSaveStatus('saving')
    if (backend) {
      pendingWritesRef.current += 1
      writeQueueRef.current = writeQueueRef.current
        .then(() => persistDiff(prev, next))
        .then((issues) => {
          if (issues?.length) {
            writeFailedRef.current = true
            setWriteIssues((current) => [...current.filter((item) => !issues.some((issue) => issue.table === item.table)), ...issues])
            setSaveStatus('failed')
          }
        })
        .catch((error) => {
          console.error('persist failed', error)
          writeFailedRef.current = true
          setWriteIssues((current) => [...current.filter((item) => item.table !== 'database connection'),
            { table: 'database connection', message: error?.message || 'Save failed', kind: 'write' }])
          setSaveStatus('failed')
        })
        .finally(() => {
          pendingWritesRef.current -= 1
          if (pendingWritesRef.current === 0) setSaveStatus(writeFailedRef.current ? 'failed' : 'saved')
        })
    } else {
      localSavePendingRef.current = true
    }
  }, [backend])

  const value = useMemo(() => {
    // Combine load failures (missing table) and write failures (missing column),
    // de-duped by table, for the schema-warning banner.
    const byTable = new Map()
    for (const i of [...(db?._loadIssues || []), ...writeIssues]) {
      byTable.set(i.table, { table: i.table, message: i.message, kind: i.kind || 'load' })
    }
    return { db, commit, refresh, saveStatus, tz: db?.settings?.tz, units: db?.settings?.units, dbIssues: [...byTable.values()] }
  }, [db, commit, refresh, saveStatus, writeIssues])

  if (backend && !db) {
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
