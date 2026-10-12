import { prepareTrainingPlanSave } from '../lib/trainingSchedule'
import { applyAssignment } from '../lib/programLibrary'
import { todayISO, coachTimeZone } from '../lib/dates'
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { loadDB, saveDB, readStoredDB, localStorageKey } from '../lib/storage'
import { hasBackend } from '../lib/supabase'
import { fetchAll, persistDiff, deleteClientRemote, saveScheduleRemote, saveAssignmentRemote, saveTrainingPlansRemote } from '../api/sync'
import { createSnapshotQueue } from '../lib/confirmedPersistence'
import { applyScheduleRequest } from '../lib/schedule'

const DataContext = createContext(null)

const removeClientFromSnapshot = (snapshot, clientId) => {
  snapshot.clients = snapshot.clients.filter((c) => c.id !== clientId)
  ;['sessions', 'logs', 'wellness', 'srpe', 'resistance', 'cardio', 'wearable',
    'concerns', 'programAssignments', 'prescriptions', 'workouts', 'maxes', 'assessments', 'screenings']
    .forEach((key) => {
      if (snapshot[key]) snapshot[key] = snapshot[key].filter((row) => row.clientId !== clientId)
    })
}

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
  const persistenceRef = useRef(null)
  const commitVersionRef = useRef(0)
  const scheduleSavingRef = useRef(false)
  // Authoritative latest snapshot, so commit() never relies on the updater running
  // (React StrictMode double-invokes updaters in dev — side effects must stay out of them).
  const dbRef = useRef(db)
  useEffect(() => { dbRef.current = db }, [db])

  useEffect(() => {
    if (backend) return undefined
    const changed = e => {
      if (e.key !== localStorageKey || !e.newValue || scheduleSavingRef.current) return
      try { const latest = readStoredDB(); dbRef.current = latest; setDb(latest) } catch { /* Retain visible data if storage becomes unavailable. */ }
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [backend])

  // Re-pull the whole dataset from the backend (used after seeding / wearable sync
  // so we never need a full window.location.reload()). No-op in local mode.
  const refresh = useCallback(() => {
    if (scheduleSavingRef.current) return Promise.reject(new Error('Wait for the booking to finish saving.'))
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
      persistenceRef.current?.reset(d)
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
    fetchAll().then((d) => { if (active) { dbRef.current = d; persistenceRef.current?.reset(d); setLoadError(null); setDb(d) } })
      .catch((e) => { if (active) { console.error('load failed', e); setLoadError(e) } })
    return () => { active = false }
  }, [backend])

  // Local mode persists the whole store; backend mode persists diffs per commit.
  useEffect(() => {
    if (!backend && db) {
      const saved = saveDB(db)
      if (!saved) {
        setSaveStatus('failed')
        setWriteIssues([{ table: 'local storage', message: 'Browser storage is unavailable', kind: 'write' }])
      }
    }
  }, [backend, db])

  const commit = useCallback((mutator) => {
    if (scheduleSavingRef.current) throw new Error('A booking is saving. Please wait, then try again.')
    const prev = dbRef.current
    if (!prev) return Promise.resolve({ saved: false, issues: [] })
    const next = structuredClone(prev)
    mutator(next)
    commitVersionRef.current += 1
    dbRef.current = next
    setDb(next)
    setSaveStatus('saving')
    if (backend) {
      pendingWritesRef.current += 1
      if (!persistenceRef.current) persistenceRef.current = createSnapshotQueue(prev, persistDiff)
      const result = persistenceRef.current.enqueue(next)
      writeQueueRef.current = result.then((outcome) => {
        writeFailedRef.current = !outcome.saved
        setWriteIssues(outcome.issues)
        if (!outcome.saved) setSaveStatus('failed')
        return outcome
      }).finally(() => {
        pendingWritesRef.current -= 1
        if (pendingWritesRef.current === 0) setSaveStatus(writeFailedRef.current ? 'failed' : 'saved')
      })
      return writeQueueRef.current
    }
    const saved = saveDB(next)
    setSaveStatus(saved ? 'saved' : 'failed')
    const issues = saved ? [] : [{ table: 'local storage', message: 'Browser storage is unavailable', kind: 'write' }]
    setWriteIssues(issues)
    return Promise.resolve({ saved, local: true, issues })
  }, [backend])

  // A calendar move can update three collections. Publish only after the whole
  // transaction succeeds, and prevent an unrelated optimistic edit racing it.
  const saveSchedule = useCallback(async (request) => {
    if (scheduleSavingRef.current) throw new Error('A booking is already saving. Please wait.')
    scheduleSavingRef.current = true
    try {
      await writeQueueRef.current
      if (writeFailedRef.current) throw new Error('Resolve the existing save issue before changing the schedule.')
      const next = backend ? structuredClone(dbRef.current) : readStoredDB()
      applyScheduleRequest(next, request)
      setSaveStatus('saving')
      if (backend) await saveScheduleRemote(request)
      else if (!saveDB(next)) throw new Error('Browser storage is unavailable. The booking was not changed.')
      commitVersionRef.current += 1
      persistenceRef.current?.reset(next)
      dbRef.current = next
      setDb(next)
      setSaveStatus('saved')
      return { saved: true }
    } catch (error) {
      setSaveStatus(writeFailedRef.current ? 'failed' : 'idle')
      throw error
    } finally { scheduleSavingRef.current = false }
  }, [backend])

  const saveProgramAssignment = useCallback(async (prepared) => {
    if (scheduleSavingRef.current) throw new Error('A program assignment is already saving. Please wait.')
    scheduleSavingRef.current = true
    try {
      await writeQueueRef.current
      if (writeFailedRef.current) throw new Error('Resolve the existing save issue before changing the schedule.')
      const next = backend ? structuredClone(dbRef.current) : readStoredDB()
      applyAssignment(next, prepared, todayISO(next.settings?.tz))
      setSaveStatus('saving')
      if (backend) await saveAssignmentRemote(prepared)
      else if (!saveDB(next)) throw new Error('Browser storage is unavailable. The program assignment was not changed.')
      commitVersionRef.current += 1
      persistenceRef.current?.reset(next)
      dbRef.current = next
      setDb(next)
      setSaveStatus('saved')
      return { saved: true }
    } catch (error) {
      setSaveStatus(writeFailedRef.current ? 'failed' : 'idle')
      throw error
    } finally { scheduleSavingRef.current = false }
  }, [backend])

  const saveTrainingPlans = useCallback(async (mutate, syncClientIds = []) => {
    if (scheduleSavingRef.current) throw new Error('A schedule update is saving. Please wait.')
    scheduleSavingRef.current = true
    try {
      await writeQueueRef.current
      if (writeFailedRef.current) throw new Error('Resolve the existing save issue first.')
      const previous = backend ? structuredClone(dbRef.current) : readStoredDB()
      const next = structuredClone(previous)
      mutate(next)
      const request = prepareTrainingPlanSave(previous, next, syncClientIds)
      setSaveStatus('saving')
      if (backend) await saveTrainingPlansRemote(request)
      else if (!saveDB(next)) throw new Error('Browser storage is unavailable. Nothing was changed.')
      commitVersionRef.current += 1
      persistenceRef.current?.reset(next)
      dbRef.current = next; setDb(next); setSaveStatus('saved')
      return { saved: true, local: !backend, bookings: request.bookings.length }
    } catch(error) {
      setSaveStatus(writeFailedRef.current ? 'failed' : 'idle'); throw error
    } finally { scheduleSavingRef.current = false }
  }, [backend])

  const deleteClient = useCallback(async (clientId) => {
    if (scheduleSavingRef.current) throw new Error('Wait for the booking to finish saving.')
    if (!backend) {
      commit((current) => removeClientFromSnapshot(current, clientId))
      return
    }
    await writeQueueRef.current
    if (writeFailedRef.current) {
      throw new Error('Resolve the existing save issue before deleting a client.')
    }
    await deleteClientRemote(clientId)
    try {
      await refresh()
    } catch (error) {
      // The database transaction already succeeded. Keep the visible roster
      // accurate even if reloading other tables temporarily fails.
      const next = structuredClone(dbRef.current)
      removeClientFromSnapshot(next, clientId)
      commitVersionRef.current += 1
      dbRef.current = next
      setDb(next)
      console.error('Client deleted, but refresh failed', error)
      return { refreshFailed: true }
    }
  }, [backend, commit, refresh])

  const value = useMemo(() => {
    // Combine load failures (missing table) and write failures (missing column),
    // de-duped by table, for the schema-warning banner.
    const byTable = new Map()
    for (const i of [...(db?._loadIssues || []), ...writeIssues]) {
      byTable.set(i.table, { table: i.table, message: i.message, kind: i.kind || 'load' })
    }
    return { db, commit, saveSchedule, saveProgramAssignment, saveTrainingPlans, deleteClient, refresh, saveStatus, tz: coachTimeZone(db?.settings?.tz), units: db?.settings?.units, dbIssues: [...byTable.values()] }
  }, [db, commit, saveSchedule, saveProgramAssignment, saveTrainingPlans, deleteClient, refresh, saveStatus, writeIssues])

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
