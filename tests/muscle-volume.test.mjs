import test from 'node:test'
import assert from 'node:assert/strict'
import { muscleVolume, muscleTargets, resolveMuscleExercise, reviewMuscleSet } from '../src/lib/muscleVolume.js'
import { addMuscleVolumeDemo, isMuscleVolumeDemo } from '../src/lib/muscleVolumeDemo.js'

const exercise = { id: 'bench', name: 'Bench Press', muscleTargets: { direct: ['Chest'], indirect: ['Triceps', 'Front delts'] } }
const run = (extra = {}) => muscleVolume({ exercises: [exercise], workouts: [], resistance: [], ...extra }, 'a', '2026-09-01', '2026-09-07')
const strict = (db, clientId = 'a') => muscleVolume(db, clientId, '2026-09-01', '2026-09-07', { workingOnly: true })

test('sample client has current and previous weeks without changing existing client data', () => {
  const original = { id: 'real', name: 'Real client' }
  const db = { clients: [original], exercises: [], workouts: [], resistance: [] }
  const id = addMuscleVolumeDemo(db, '2026-09-29')
  assert.equal(db.clients.length, 2)
  assert.equal(db.clients[0], original)
  assert.equal(isMuscleVolumeDemo(db.clients[1]), true)
  assert.equal(addMuscleVolumeDemo(db, '2026-09-29'), id)
  assert.equal(db.workouts.length, 3)
  const week = muscleVolume(db, id, '2026-09-28', '2026-10-04', { workingOnly: true })
  assert.equal(week.totalSets, 23)
  assert.equal(week.excluded.length, 1, 'the main-block warm-up set is excluded')
  assert.equal(week.muscles.find((r) => r.muscle === 'Quadriceps').directSets, 7)
  assert.equal(week.muscles.find((r) => r.muscle === 'Quadriceps').volume, 1920)
  assert.equal(week.muscles.find((r) => r.muscle === 'Calves').missingVolumeSets, 3)
  assert.equal(muscleVolume(db, id, '2026-09-21', '2026-09-27', { workingOnly: true }).totalSets, 9)
  assert.equal(muscleVolume(db, original.id, '2026-09-28', '2026-10-04', { workingOnly: true }).totalSets, 0)
})

test('working-only report excludes every warm-up, cooldown, unknown group and unclassified set', () => {
  const set = { done: true, purpose: 'working', reps: 8, load: 40 }
  const item = (id, blockType, setRows = [set]) => ({ id, name: 'Bench Press', blockType, setRows })
  const db = { exercises: [exercise], resistance: [{ id: 'duplicate', clientId: 'a', date: '2026-09-01', exercise: exercise.name, sets: 10, reps: 8, weight: 40 }], workouts: [{ id: 'w', clientId: 'a', date: '2026-09-01', status: 'completed', warmup: [item('warm', 'Main Lifts')], cooldown: [item('cool', 'Main Lifts')], main: [
    item('main', 'Main Lifts', [set, { ...set, purpose: 'warmup' }, { ...set, purpose: undefined }, { ...set, done: false }]),
    item('assist', 'Assisted'), item('power', 'Power Ballistic'),
    { ...item('warm-tag', 'Warm-up'), muscleVolumeGroup: 'Power' }, item('cool-tag', 'Cool-down'), item('other', 'Core/Others'),
  ] }] }
  const result = strict(db)
  assert.equal(result.totalSets, 3)
  assert.equal(result.muscles.find((m) => m.muscle === 'Chest').volume, 960)
  assert.equal(result.excluded.length, 5)
  assert.equal(result.excluded.filter((r) => r.reviewable).length, 2)
  assert.equal(result.separateLogs, 1)
  assert.equal(strict(db, 'b').totalSets, 0)
})

test('working-only missing actuals, known zero and window boundaries stay distinct', () => {
  const w = { id: 'w', clientId: 'a', date: '2026-09-07', status: 'completed', main: [{ id: 'e', exId: exercise.id, name: exercise.name, blockType: 'Main Lifts', setRows: [
    { done: true, purpose: 'working', reps: 8, load: 0 },
    { done: true, purpose: 'working', reps: null, load: 40, pReps: 8 },
    { done: true, purpose: 'working', reps: 8, load: null, pLoadKg: 50 },
  ] }] }
  const db = { exercises: [exercise], workouts: [w, { ...w, id: 'future', date: '2026-09-08' }, { ...w, id: 'draft', status: 'draft' }] }
  const result = strict(db)
  const chest = result.muscles.find((m) => m.muscle === 'Chest')
  assert.equal(chest.directSets, 3)
  assert.equal(chest.volume, 0)
  assert.equal(chest.missingVolumeSets, 2)
  assert.equal(result.observations.filter((r) => r.volume == null).length, 2)
  assert.equal(result.muscles.find((m) => m.muscle === 'Triceps').indirectSets, 3)
})

test('coach review classifies only the selected client set and preserves raw actuals', () => {
  const db = { exercises: [exercise], workouts: [{ id: 'w', clientId: 'a', date: '2026-09-02', status: 'completed', main: [{ id: 'item', name: exercise.name, setRows: [{ done: true, reps: 5, load: 20 }, { done: true, reps: 6, load: 30 }] }] }] }
  const record = strict(db).excluded[0]
  assert.equal(reviewMuscleSet(db, 'b', record, 'Main Lift', 'working'), false)
  assert.equal(reviewMuscleSet(db, 'a', record, 'Main Lift', 'working'), true)
  assert.equal(strict(db).totalSets, 1)
  assert.equal(strict(db).excluded.length, 1)
  assert.equal(strict(db).muscles[0].volume, 100)
  assert.equal(db.workouts[0].main[0].setRows[1].purpose, undefined)
  assert.equal(reviewMuscleSet(db, 'a', { ...record, itemId: 'stale' }, 'Main Lift', 'working'), false)
  db.workouts[0].main[0].blockType = 'Warm-up'
  assert.equal(strict(db).totalSets, 0)
  assert.equal(reviewMuscleSet(db, 'a', record, 'Power', 'working'), false)
})
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
