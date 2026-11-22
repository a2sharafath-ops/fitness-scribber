import { calcSRPETL } from './calc'
import { correctClassicWorkout, workoutEffortId } from './classicWorkflow'

export const workoutMinutes = (seconds) => seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : null
export const maxWorkoutMinutes = Math.floor(2147483647 / 60)

export function workoutEffort(db, workout) {
  const observations = db.srpe.filter(row => row.clientId === workout.clientId && row.date === workout.date)
  const matches = observations.filter(row => row.source === 'Workout completion' &&
    (workout.bookingId ? row.sessionId === workout.bookingId : row.sessionId == null && row.id === workoutEffortId(workout)))
  if (matches.length === 1) return { row: matches[0], editable: true }
  // Older unbooked observations lack a workout identifier. Leave them alone
  // instead of guessing from the date or adding a second possible copy.
  const unlinked = row => row.sessionId == null && !row.id.startsWith('workout-rpe:') &&
    ['Workout completion', 'Client workout'].includes(row.source)
  return { row: null, editable: matches.length === 0 && (Boolean(workout.bookingId) || !observations.some(unlinked)) }
}

export function prepareWorkoutCorrection(db, expected, workout, effort) {
  const previous = db.workouts.find(row => row.id === expected.id)
  if (!previous || JSON.stringify(previous) !== JSON.stringify(expected))
    throw new Error('This workout changed. Reopen the saved workout before editing it.')
  const currentEffort = workoutEffort(db, previous)
  if (effort && (!currentEffort.editable || JSON.stringify(currentEffort.row) !== JSON.stringify(effort.expected)))
    throw new Error('The session RPE changed. Reopen the saved workout before editing it.')

  const oldRow = currentEffort.row
  const rpe = effort ? effort.rpe : oldRow?.rpe ?? null
  if (oldRow && rpe == null) throw new Error('Enter a session RPE from 1 to 10.')
  const minutes = workoutMinutes(workout.durationSec) ??
    (workout.durationSec === previous.durationSec && rpe === oldRow?.rpe ? oldRow?.duration : null)
  if (rpe != null && (!Number.isInteger(rpe) || rpe < 1 || rpe > 10 || minutes == null))
    throw new Error('Enter a workout duration and a session RPE from 1 to 10.')
  const newRow = rpe == null ? null : {
    id: oldRow?.id ?? workoutEffortId(workout), clientId: previous.clientId, date: previous.date,
    sessionId: previous.bookingId ?? null, rpe, duration: minutes, tl: calcSRPETL(rpe, minutes),
    source: 'Workout completion',
  }
  const effortChange = currentEffort.editable ? { expected: oldRow, row: newRow } : null

  const next = structuredClone(db)
  const mainChanged = JSON.stringify(previous.main || []) !== JSON.stringify(workout.main || [])
  correctClassicWorkout(next, previous.clientId, workout)
  if (newRow) {
    next.srpe = next.srpe.filter(row => row.id !== oldRow?.id)
    next.srpe.push(newRow)
  }
  const strength = mainChanged ? {
    maxes: next.maxes.filter(row => row.sourceWorkoutId === workout.id),
    assessments: next.assessments.filter(row => row.data?.sourceWorkoutId === workout.id),
  } : null
  return { next, strength, effort: effortChange }
}
