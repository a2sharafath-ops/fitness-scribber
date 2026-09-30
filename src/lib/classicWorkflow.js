import { calcSRPETL } from './calc'
import { uid } from './format'
import { applyWorkoutStrength, removeWorkoutStrength } from './program'

// These mutations run inside DataContext.commit so the workout, observations,
// and derived strength records are saved from the same draft snapshot.
export function logWorkoutCheckin(draft, clientId, values, workout) {
  if (workout && workout.clientId !== clientId) throw new Error('Workout belongs to another client')
  draft.wellness = [...draft.wellness, {
    id: uid(), clientId, ...values, source: 'Coach workout check-in',
  }]
  if (workout) draft.workouts = [...(draft.workouts || []).filter((row) => row.id !== workout.id), workout]
}

export function completeClassicWorkout(draft, clientId, workout, rpe, minutes) {
  if (workout.clientId !== clientId) throw new Error('Workout belongs to another client')
  const durationSec = minutes != null ? Math.max(60, Math.round(minutes * 60)) : workout.durationSec
  const completed = { ...workout, durationSec, status: 'completed' }
  draft.workouts = [...(draft.workouts || []).filter((row) => row.id !== workout.id), completed]
  if (rpe != null) {
    const duration = Math.max(1, Math.round(durationSec ? durationSec / 60 : 30))
    draft.srpe = [...draft.srpe, {
      id: uid(), clientId, date: workout.date, sessionId: null,
      rpe, duration, tl: calcSRPETL(rpe, duration), source: 'Workout completion',
    }]
  }
  return applyWorkoutStrength(draft, completed)
}

// Corrections to a finished workout keep its identity and other observations.
// Only a change to performed main work refreshes the auto-created strength
// peaks and their linked assessments; title/notes never rewrite that ledger.
export function correctClassicWorkout(draft, clientId, updated) {
  if (updated.clientId !== clientId || updated.status !== 'completed') throw new Error('Completed workout belongs to another client')
  const previous = (draft.workouts || []).find((item) => item.id === updated.id)
  if (!previous || previous.clientId !== clientId || previous.status !== 'completed') throw new Error('Completed workout was not found for this client')
  const changedMain = JSON.stringify(previous.main || []) !== JSON.stringify(updated.main || [])
  draft.workouts = draft.workouts.map((item) => item.id === updated.id && item.clientId === clientId ? updated : item)
  if (changedMain) {
    removeWorkoutStrength(draft, updated.id)
    applyWorkoutStrength(draft, updated)
  }
}
