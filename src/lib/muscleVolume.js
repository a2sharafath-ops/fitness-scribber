// Stable anatomy groups for later report/body-model use.
import { recommendedMuscleTargets } from './exerciseMuscleMap.js'
export const MUSCLES = ['Chest', 'Lats', 'Upper back', 'Trapezius', 'Front delts', 'Side delts', 'Rear delts', 'Rotator cuff', 'Serratus anterior', 'Biceps', 'Triceps', 'Forearms', 'Quadriceps', 'Hamstrings', 'Glutes', 'Hip abductors', 'Hip flexors', 'Adductors', 'Calves', 'Tibialis anterior', 'Tibialis posterior', 'Abdominals', 'Spinal erectors', 'Neck flexors']
export const exerciseKey = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()
const number = (v) => v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v)
const count = (v) => Number.isInteger(number(v)) && number(v) > 0 ? number(v) : null

export function muscleTargets(exercise) {
  const mapping = exercise?.muscleTargets === undefined ? recommendedMuscleTargets(exercise?.name, exercise?.mode) : exercise?.muscleTargets
  const direct = MUSCLES.filter((m) => mapping?.direct?.includes(m))
  const indirect = MUSCLES.filter((m) => !direct.includes(m) && mapping?.indirect?.includes(m))
  return { direct, indirect }
}

export function resolveMuscleExercise(exercises, item) {
  const byId = item.exId && exercises.find((e) => e.id === item.exId)
  if (byId) return byId
  const matches = exercises.filter((e) => exerciseKey(e.name) === exerciseKey(item.name))
  // Ambiguous duplicate names need correction, not an arbitrary first match.
  return matches.length === 1 ? matches[0] : null
}

export function muscleVolume(db, clientId, start, end) {
  const observations = []
  const inWindow = (r) => r.clientId === clientId && r.date >= start && r.date <= end
  const add = (row, name, sets, reps, load, key, exId) => {
    if (!sets) return
    const exercise = resolveMuscleExercise(db.exercises || [], { name, exId })
    const targets = muscleTargets(exercise)
    const validLoad = number(load)
    const validReps = count(reps)
    observations.push({ key, date: row.date, name: name || 'Unnamed exercise', exercise, targets, sets,
      source: row.source || 'Source not recorded',
      volume: validReps != null && validLoad != null && validLoad >= 0 ? sets * validReps * validLoad : null })
  }
  for (const w of (db.workouts || []).filter((w) => inWindow(w) && w.status === 'completed')) {
    for (const [i, item] of (w.main || []).entries()) {
      const row = { ...w, source: 'Completed workout' }
      if (Array.isArray(item.setRows) && item.setRows.length) {
        item.setRows.forEach((s, j) => { if (s.done) add(row, item.name, 1, s.reps, s.load, `workout:${w.id}:${i}:${j}`, item.exId) })
      } else if (item.done) {
        // Legacy actuals only. Prescribed sets/reps/weight are not performance.
        add(row, item.name, count(item.doneSets), item.doneReps, item.doneWeight, `workout:${w.id}:${i}`, item.exId)
        if (!count(item.doneSets)) observations.push({ key: `workout:${w.id}:${i}`, date: w.date, name: item.name || 'Unnamed exercise', source: row.source, sets: 0, volume: null, targets: { direct: [], indirect: [] }, unknownSets: true })
      }
    }
  }
  for (const r of (db.resistance || []).filter(inWindow)) {
    add(r, r.exercise, count(r.sets), r.reps, r.weight, `resistance:${r.id}`)
  }
  const muscles = MUSCLES.map((muscle) => {
    const direct = observations.filter((r) => r.targets.direct.includes(muscle))
    const indirect = observations.filter((r) => r.targets.indirect.includes(muscle))
    const sumSets = (rows) => rows.reduce((sum, r) => sum + r.sets, 0)
    const directSets = sumSets(direct), indirectSets = sumSets(indirect)
    const known = direct.filter((r) => r.volume != null)
    return { muscle, directSets, indirectSets, fractionalSets: directSets + indirectSets * 0.5,
      volume: known.length ? known.reduce((sum, r) => sum + r.volume, 0) : null,
      missingVolumeSets: sumSets(direct.filter((r) => r.volume == null)), observations: [...direct, ...indirect] }
  }).filter((r) => r.directSets || r.indirectSets)
  return { muscles, observations, unmapped: observations.filter((r) => !r.targets.direct.length && !r.targets.indirect.length),
    totalSets: observations.reduce((sum, r) => sum + r.sets, 0) }
}
