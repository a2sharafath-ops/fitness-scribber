import { useEffect, useRef, useState, useCallback } from 'react'
import { applyLiveAction, prepareLiveSession, liveClosed } from '../lib/liveSession'
import { getWorkoutDraft } from '../lib/workoutDraft'

const fingerprint = (value) => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
  ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b))) : entry)
const recoveryKey = (scope, workout) => `fitscribe:live:${scope}:${workout.clientId}:${workout.id}`
function recover(key, workout, resolveTm) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null')
    if (stored && stored.base && !liveClosed(workout)) return {
      session: stored.draft, baseline: stored.base,
      conflict: fingerprint(stored.base) !== fingerprint(workout),
    }
  } catch { /* The save indicator reports storage failures on the first write. */ }
  return { session: prepareLiveSession(getWorkoutDraft(workout, 'run') || workout, resolveTm), baseline: workout, conflict: false }
}

// Writes are serialized. Each acknowledged snapshot becomes the baseline for
// the next conditional server write. A failed save retains its recovery copy.
export default function useLiveSession(workout, scope, resolveTm, onPersist) {
  const key = recoveryKey(scope, workout)
  const [recovered] = useState(() => recover(key, workout, resolveTm))
  const [session, setSession] = useState(recovered.session)
  const latest = useRef(session)
  const saved = useRef(recovered.baseline)
  const saving = useRef(null)
  const allowReload = useRef(false)
  const persist = useRef(onPersist)
  persist.current = onPersist
  const [status, setStatus] = useState(recovered.conflict ? 'failed' : 'saving')
  const [error, setError] = useState(recovered.conflict ? 'This saved session changed elsewhere. Your recovered draft has been kept. Download it before reloading the saved session.' : '')
  const [storageFailed, setStorageFailed] = useState(false)
  const mounted = useRef(true)
  const store = useCallback((draft, base = saved.current) => {
    try {
      localStorage.setItem(key, JSON.stringify({ base, draft }))
      if (mounted.current) setStorageFailed(false)
    } catch { if (mounted.current) setStorageFailed(true) }
  }, [key])
  const change = useCallback((action) => {
    const next = applyLiveAction(latest.current, action)
    latest.current = next
    store(next)
    setSession(next)
    setStatus('saving')
    setError('')
    return next
  }, [store])
  const flush = useCallback(() => {
    if (saving.current) return saving.current
    const operation = async () => {
      setStatus('saving')
      try {
        while (fingerprint(latest.current) !== fingerprint(saved.current)) {
          const snapshot = latest.current
          const result = await persist.current(snapshot, saved.current)
          if (!result?.saved) throw new Error(result?.issues?.map((issue) => issue.message).join(' · ') || 'The session could not be saved. Please retry.')
          saved.current = snapshot
          store(latest.current, snapshot)
        }
        if (mounted.current) { setStatus('saved'); setError('') }
        return true
      } catch (failure) {
        if (mounted.current) { setStatus('failed'); setError(failure.message) }
        return false
      } finally { saving.current = null }
    }
    saving.current = Promise.resolve().then(operation)
    return saving.current
  }, [store])
  useEffect(() => {
    store(session)
    if (recovered.conflict) return undefined
    const timeout = setTimeout(flush, 450)
    return () => clearTimeout(timeout)
  }, [session, store, flush, recovered.conflict])
  useEffect(() => {
    mounted.current = true
    const warn = (event) => {
      if (!allowReload.current && fingerprint(latest.current) !== fingerprint(saved.current)) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warn)
    return () => { mounted.current = false; window.removeEventListener('beforeunload', warn) }
  }, [])
  const reloadSaved = () => {
    try {
      localStorage.setItem(key + ':recovery:' + Date.now(), JSON.stringify({ base: saved.current, draft: latest.current }))
      localStorage.removeItem(key)
      allowReload.current = true
      window.location.reload()
    } catch {
      setError('The browser could not keep a recovery copy. Download the draft before closing this session.')
    }
  }
  return { session, change, flush, status, error, storageFailed, reloadSaved }
}
