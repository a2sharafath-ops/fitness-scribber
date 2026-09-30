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

export const WORKING_GROUPS = ['Main Lift', 'Accessory Lift', 'Power']
export function workingGroup(item) {
  // A warm-up/cool-down block always wins over a library or coach category.
  if (/warm[ -]?up|cool[ -]?down/i.test(item.blockType || '')) return null
  if (WORKING_GROUPS.includes(item.muscleVolumeGroup)) return item.muscleVolumeGroup
  return ({ 'Main Lifts': 'Main Lift', 'Main Lift': 'Main Lift', Assisted: 'Accessory Lift', 'Accessory Lift': 'Accessory Lift', 'Accessory Lifts': 'Accessory Lift', Power: 'Power', 'Power Ballistic': 'Power', Ballistic: 'Power' })[item.blockType] || null
}

export function muscleVolume(db, clientId, start, end, { workingOnly = false } = {}) {
  const observations = []
  const excluded = []
  const inWindow = (r) => r.clientId === clientId && r.date >= start && r.date <= end
  const add = (row, name, sets, reps, load, key, exId) => {
    if (!sets) return
    const exercise = resolveMuscleExercise(db.exercises || [], { name, exId })
    const targets = muscleTargets(exercise)
    const validLoad = number(load)
    const validReps = count(reps)
    observations.push({ key, date: row.date, name: name || 'Unnamed exercise', exercise, targets, sets, reps: validReps, load: validLoad, group: row.group,
      source: row.source || 'Source not recorded',
      volume: validReps != null && validLoad != null && validLoad >= 0 ? sets * validReps * validLoad : null })
  }
  for (const w of (db.workouts || []).filter((w) => inWindow(w) && w.status === 'completed')) {
    for (const [i, item] of (w.main || []).entries()) {
      const row = { ...w, source: 'Completed workout', group: workingGroup(item) }
      const allow = (s, j, sets) => {
        if (!workingOnly) return true
        const isWarm = /warm[ -]?up|cool[ -]?down/i.test(item.blockType || '') || [item.purpose, s.purpose].some((p) => p === 'warmup' || p === 'warm-up') || item.isWarmup === true || s.isWarmup === true
        const reason = isWarm ? 'Warm-up / cool-down' : !row.group ? 'Lift group needs review' : s.purpose !== 'working' ? 'Set type needs review' : !sets ? 'Actual set count missing' : null
        if (!reason) return true
        excluded.push({ key: `workout:${w.id}:${i}:${j ?? 'legacy'}`, workoutId: w.id, itemId: item.id, itemIndex: i, setIndex: j, date: w.date, name: item.name || 'Unnamed exercise', sets, reason, reviewable: !isWarm && !!sets, group: row.group, purpose: s.purpose || '' })
        return false
      }
      if (Array.isArray(item.setRows) && item.setRows.length) {
        item.setRows.forEach((s, j) => { if (s.done && allow(s, j, 1)) add(row, item.name, 1, s.reps, s.load, `workout:${w.id}:${i}:${j}`, item.exId) })
      } else if (item.done) {
        if (!allow(item, null, count(item.doneSets))) continue
        // Legacy actuals only. Prescribed sets/reps/weight are not performance.
        add(row, item.name, count(item.doneSets), item.doneReps, item.doneWeight, `workout:${w.id}:${i}`, item.exId)
        if (!count(item.doneSets)) observations.push({ key: `workout:${w.id}:${i}`, date: w.date, name: item.name || 'Unnamed exercise', source: row.source, sets: 0, volume: null, targets: { direct: [], indirect: [] }, unknownSets: true })
      }
    }
  }
  for (const r of (workingOnly ? [] : db.resistance || []).filter(inWindow)) {
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
  return { muscles, observations, excluded, separateLogs: (db.resistance || []).filter(inWindow).length, unmapped: observations.filter((r) => !r.targets.direct.length && !r.targets.indirect.length),
    totalSets: observations.reduce((sum, r) => sum + r.sets, 0) }
}

// Re-check the source identity before editing nested JSON; never alter another client.
export function reviewMuscleSet(db, clientId, record, group, purpose) {
  if (!WORKING_GROUPS.includes(group) || !['working', 'warmup'].includes(purpose)) return false
  const workout = (db.workouts || []).find((w) => w.id === record.workoutId && w.clientId === clientId && w.status === 'completed')
  const item = workout?.main?.[record.itemIndex]
  if (!item || item.id !== record.itemId || item.name !== record.name || /warm[ -]?up|cool[ -]?down/i.test(item.blockType || '')) return false
  const set = record.setIndex == null ? item : item.setRows?.[record.setIndex]
  if (!set?.done) return false
  item.muscleVolumeGroup = group
  set.purpose = purpose
  return true
}
