import { completeClassicWorkout } from './classicWorkflow'

const progressTables = ['srpe', 'maxes', 'assessments']
const storageKey = (scope, { clientId, id }) => `fitscribe:finish:${JSON.stringify([scope, clientId, id])}`

export function readWorkoutCompletion(scope, workout) {
  if (!workout) return null
  try {
    const attempt = JSON.parse(localStorage.getItem(storageKey(scope, workout)))
    if (attempt?.workout?.id === workout.id && attempt.workout.clientId === workout.clientId &&
      attempt.workout.date === workout.date && (attempt.workout.bookingId ?? null) === (workout.bookingId ?? null) &&
      attempt.workout.liveState?.completionId && attempt.expected && attempt.progress) return attempt
  } catch { /* An unavailable recovery store must not prevent opening a workout. */ }
  return null
}

export function rememberWorkoutCompletion(scope, attempt) {
  localStorage.setItem(storageKey(scope, attempt.workout), JSON.stringify(attempt))
}

export function forgetWorkoutCompletion(scope, attempt) {
  try {
    const saved = readWorkoutCompletion(scope, attempt.workout)
    if (saved?.workout.liveState.completionId === attempt.workout.liveState.completionId)
      localStorage.removeItem(storageKey(scope, attempt.workout))
  } catch { /* Replaying an already confirmed attempt is safe. */ }
}

export function prepareWorkoutCompletion(db, expected, workout, rpe, minutes) {
  if (expected?.id !== workout.id || expected.status !== 'in_progress' || !workout.liveState)
    throw new Error('Open the saved workout before finishing it.')
  const draft = { workouts: [], clients: db.clients, srpe: [], maxes: [...db.maxes], assessments: [] }
  const candidate = { ...workout, liveState: { ...workout.liveState, completionId: crypto.randomUUID() } }
  const peaks = completeClassicWorkout(draft, workout.clientId, candidate, rpe, minutes)
  return { expected, workout: draft.workouts[0], rpe, minutes, peaks,
    progress: { srpe: draft.srpe, maxes: draft.maxes.slice(db.maxes.length), assessments: draft.assessments } }
}

export function applyWorkoutCompletion(db, attempt, saved) {
  const next = { ...db, workouts: db.workouts.map(row => row.id === saved.workout.id ? saved.workout : row) }
  for (const table of progressTables) {
    const attemptedIds = new Set(attempt.progress[table].map(row => row.id))
    next[table] = [...(db[table] || []).filter(row => !attemptedIds.has(row.id)), ...saved.progress[table]]
  }
  return next
}
