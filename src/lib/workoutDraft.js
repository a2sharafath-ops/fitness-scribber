// In-memory drafts survive navigation within the coach app without writing
// incomplete sets to a client's permanent workout history.
const drafts = new Map()
const keyOf = (workout, mode) => `${workout.clientId}:${workout.id}:${mode}`

export const getWorkoutDraft = (workout, mode) => drafts.get(keyOf(workout, mode)) || null
export const setWorkoutDraft = (workout, mode, draft) => drafts.set(keyOf(workout, mode), draft)
export function clearWorkoutDraft(workout, mode) {
  if (!workout) return
  if (mode) drafts.delete(keyOf(workout, mode))
  else { drafts.delete(keyOf(workout, 'run')); drafts.delete(keyOf(workout, 'edit')) }
}
