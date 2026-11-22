import { sameSavedRecord } from './confirmedPersistence'
import { workoutEffort } from './workoutCorrection'

const prefix = 'fitscribe:correction:'
const changed = 'workout-correction-recovery'
const keyFor = (scope, { clientId, date, id, bookingId }) => prefix + JSON.stringify([scope, clientId, date, id, bookingId ?? null])

export function readCorrectionDraft(scope, workout) {
  try { return workout?.status === 'completed' ? localStorage.getItem(keyFor(scope, workout)) : null }
  catch { return null }
}

export function subscribeToCorrectionDrafts(listener) {
  const onStorage = (event) => {
    if (event.key === null || event.key?.startsWith(prefix)) listener()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(changed, listener)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(changed, listener)
  }
}

export function inspectCorrectionDraft(scope, db, workout, raw = readCorrectionDraft(scope, workout)) {
  if (!raw || !workout || workout.status !== 'completed') return null
  let attempt
  try { attempt = JSON.parse(raw) } catch { return null }
  const key = keyFor(scope, workout)
  if (!attempt?.id || !attempt.expected || !attempt.workout ||
    keyFor(scope, attempt.expected) !== key || keyFor(scope, attempt.workout) !== key) return null

  const effort = attempt.effort && workoutEffort(db, workout)
  const matchesEffort = (value) => !attempt.effort || (effort.editable && sameSavedRecord(effort.row, value))
  if (sameSavedRecord(workout, attempt.workout) && matchesEffort(attempt.effort?.row))
    return { kind: 'saved', attempt }
  if (sameSavedRecord(workout, attempt.expected) && matchesEffort(attempt.effort?.expected))
    return { kind: 'retry', attempt }
  return { kind: 'conflict', attempt }
}

export function rememberCorrectionDraft(scope, attempt) {
  try { localStorage.setItem(keyFor(scope, attempt.workout), JSON.stringify(attempt)) }
  catch { throw new Error('This browser could not keep a recovery copy. Your edits are still open.') }
  window.dispatchEvent(new Event(changed))
}

export function forgetCorrectionDraft(scope, attempt) {
  try {
    const raw = readCorrectionDraft(scope, attempt.workout)
    if (JSON.parse(raw)?.id !== attempt.id) return
    localStorage.removeItem(keyFor(scope, attempt.workout))
    window.dispatchEvent(new Event(changed))
  } catch { /* A verified correction can still be recognized on the next open. */ }
}
