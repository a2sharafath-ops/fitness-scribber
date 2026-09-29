import { EXERCISE_LIBRARY } from './exerciseLibrary'

export const LIFT_GROUPS = ['Power Ballistic', 'Main Lift', 'Accessory Lifts']

const keyOf = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()
const validName = (name) => name && !['exercise', 'new exercise'].includes(keyOf(name))
const numeric = (value) => value === '' || value == null ? null : Number.isFinite(Number(value)) ? Number(value) : null
const libraryByName = new Map(EXERCISE_LIBRARY.map((exercise) => [keyOf(exercise.name), exercise]))
const ballisticName = /\b(clean|snatch|jerk|jump|throw|plyometric|power shrug|high pull)\b/i
const mainName = /\b(back squat|front squat|barbell squat|deadlift|bench press|overhead press|military press|leg press|hip thrust|pull-up|chin-up|barbell row)\b/i

function groupFor(name, blockType, exercises) {
  const exercise = (exercises || []).find((item) => keyOf(item.name) === keyOf(name))
  const libraryExercise = libraryByName.get(keyOf(name))
  if (exercise?.category === 'Ballistic' || libraryExercise?.category === 'Ballistic' || ballisticName.test(name) || /power|ballistic/i.test(blockType || '')) return 'Power Ballistic'
  if (blockType === 'Main Lifts') return 'Main Lift'
  if (['Assisted', 'Core/Others', 'Core/Hypertrophy'].includes(blockType)) return 'Accessory Lifts'
  return mainName.test(name) ? 'Main Lift' : 'Accessory Lifts'
}

// Only observations of completed work qualify. A prescription, a manually
// tracked name, or a standalone 1RM checkpoint does not prove performance.
export function performedLiftHistory(db, clientId) {
  const rows = []
  for (const workout of db.workouts || []) {
    if (workout.clientId !== clientId || workout.status !== 'completed') continue
    for (const item of workout.main || []) {
      if (!validName(item.name)) continue
      const sets = Array.isArray(item.setRows) && item.setRows.length
        ? item.setRows.filter((set) => set.done).map((set) => ({ load: numeric(set.load ?? set.pLoadKg), reps: numeric(set.reps ?? set.pReps) }))
        : item.done ? [{ load: numeric(item.doneWeight ?? item.weight), reps: numeric(item.doneReps ?? item.reps) }] : []
      if (!sets.length) continue
      const loaded = sets.filter((set) => set.load != null)
      const best = loaded.sort((a, b) => b.load - a.load)[0]
      rows.push({ name: item.name.trim(), date: workout.date, source: 'Completed workout', blockType: item.blockType || '', sets: item.doneSets || sets.length, reps: best?.reps ?? sets[0].reps, loadKg: best?.load ?? null })
    }
  }
  for (const row of db.resistance || []) {
    if (row.clientId !== clientId || !validName(row.exercise)) continue
    rows.push({ name: row.exercise.trim(), date: row.date, source: row.source || 'Resistance log', blockType: '', sets: numeric(row.sets), reps: numeric(row.reps), loadKg: numeric(row.weight) })
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date))
}

export function performedLiftOptions(db, clientId) {
  const byName = new Map()
  for (const row of performedLiftHistory(db, clientId)) {
    const key = keyOf(row.name)
    if (!byName.has(key)) byName.set(key, { name: row.name, group: groupFor(row.name, row.blockType, db.exercises) })
  }
  return [...byName.values()].sort((a, b) => LIFT_GROUPS.indexOf(a.group) - LIFT_GROUPS.indexOf(b.group) || a.name.localeCompare(b.name))
}
