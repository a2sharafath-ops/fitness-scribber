import test from 'node:test'
import assert from 'node:assert/strict'
import { muscleVolume, muscleTargets, resolveMuscleExercise } from '../src/lib/muscleVolume.js'

const exercise = { id: 'bench', name: 'Bench Press', muscleTargets: { direct: ['Chest'], indirect: ['Triceps', 'Front delts'] } }
const run = (extra = {}) => muscleVolume({ exercises: [exercise], workouts: [], resistance: [], ...extra }, 'a', '2026-09-01', '2026-09-07')
test('counts actual completed sets, preserves missing actuals, and isolates client/date/status', () => {
  const workout = { id: 'w', clientId: 'a', date: '2026-09-04', status: 'completed', main: [{ name: 'Bench Press', setRows: [
    { done: true, reps: 10, load: 50 }, { done: true, reps: null, load: 50, pReps: 10 }, { done: false, reps: 10, load: 50 },
  ] }], warmup: [{ name: 'Bench Press', done: true, doneSets: 5, doneReps: 10, doneWeight: 50 }] }
  const result = run({ workouts: [workout, { ...workout, id: 'other', clientId: 'b' }, { ...workout, id: 'old', date: '2026-08-31' }, { ...workout, id: 'draft', status: 'draft' }] })
  const chest = result.muscles.find((r) => r.muscle === 'Chest')
  assert.equal(result.totalSets, 2)
  assert.equal(chest.volume, 500)
  assert.equal(chest.missingVolumeSets, 1)
  const triceps = result.muscles.find((r) => r.muscle === 'Triceps')
  assert.equal(triceps.directSets, 0)
  assert.equal(triceps.indirectSets, 2)
  assert.equal(triceps.fractionalSets, 1)
  assert.equal(triceps.volume, null)
})
test('legacy prescribed fields never become actuals; bodyweight zero remains explicit', () => {
  const result = run({ workouts: [{ id: 'w', clientId: 'a', date: '2026-09-02', status: 'completed', main: [
    { name: 'Bench Press', done: true, sets: 3, reps: 10, weight: 50 },
    { name: 'Bench Press', done: true, doneSets: 2, doneReps: 10, doneWeight: 0 },
  ] }] })
  assert.equal(result.totalSets, 2)
  assert.equal(result.muscles[0].volume, 0)
  assert.equal(result.unmapped[0].unknownSets, true)
})
test('exact unique names or library ids only; broad groups and duplicate names remain unresolved', () => {
  assert.equal(resolveMuscleExercise([exercise], { name: ' bench   PRESS ' }), exercise)
  assert.equal(resolveMuscleExercise([exercise], { name: 'Close Grip Bench Press' }), null)
  assert.equal(resolveMuscleExercise([exercise, { ...exercise, id: 'duplicate' }], { name: exercise.name }), null)
  assert.equal(resolveMuscleExercise([exercise], { name: 'renamed', exId: 'bench' }), exercise)
  assert.deepEqual(muscleTargets({ muscle: 'Legs' }), { direct: [], indirect: [] })
})
test('manual logs sum actual volume, ignore cached volume and expose unassigned work', () => {
  const result = run({ resistance: [
    { id: 'r', clientId: 'a', date: '2026-09-03', exercise: 'Bench Press', sets: 3, reps: 8, weight: 40, volumeLoad: 99999 },
    { id: 'u', clientId: 'a', date: '2026-09-03', exercise: 'Unknown', sets: 2, reps: 8, weight: 40 },
    { id: 'x', clientId: 'b', date: '2026-09-03', exercise: 'Bench Press', sets: 10, reps: 8, weight: 40 },
  ] })
  assert.equal(result.totalSets, 5)
  assert.equal(result.muscles[0].volume, 960)
  assert.equal(result.unmapped.length, 1)
})
test('multiple direct muscles overlap; duplicate assignments cannot double count one muscle', () => {
  const result = run({ exercises: [{ ...exercise, muscleTargets: { direct: ['Chest', 'Chest', 'Triceps'], indirect: ['Triceps', 'invalid'] } }], resistance: [
    { id: 'r', clientId: 'a', date: '2026-09-03', exercise: 'Bench Press', sets: 3, reps: 10, weight: 20 },
  ] })
  assert.equal(result.totalSets, 3)
  assert.equal(result.muscles.length, 2)
  result.muscles.forEach((m) => { assert.equal(m.volume, 600); assert.equal(m.directSets, 3); assert.equal(m.indirectSets, 0) })
})
