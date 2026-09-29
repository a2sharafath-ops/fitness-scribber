import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { EXERCISE_LIBRARY } from '../src/lib/exerciseLibrary.js'
import { CORRECTIVE_LIBRARY } from '../src/lib/correctiveLibrary.js'
import { recommendedMuscleTargets } from '../src/lib/exerciseMuscleMap.js'
import { MUSCLES, muscleTargets } from '../src/lib/muscleVolume.js'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const { mergeExerciseLibrary } = await vite.ssrLoadModule('/src/lib/program.js')

test('catalog mapping covers all unambiguous strength names and all corrective activations', () => {
  const pending = EXERCISE_LIBRARY.filter((e) => !e.muscleTargets?.direct?.length).map((e) => e.name)
  assert.deepEqual(pending, [
    'Bridge Drop Downs (Ball)', 'Bridge Drop Downs (Slide Board)',
    'Bridge Drop Downs 1-Leg (Ball)', 'Bridge Drop Downs 1-Leg (Slide Board)',
    'DB Press 1-Arm', 'DB Press 2-Arm', 'DB Press 2-Arm (Alternating)',
  ])
  for (const e of CORRECTIVE_LIBRARY) {
    const m = recommendedMuscleTargets(e.name, e.mode)
    assert.equal(Boolean(m?.direct?.length), e.mode === 'Activation', e.name)
  }
  for (const e of EXERCISE_LIBRARY) {
    for (const raw of [...(e.muscleTargets?.direct || []), ...(e.muscleTargets?.indirect || [])]) assert.ok(MUSCLES.includes(raw), `${e.name}: ${raw}`)
    const m = muscleTargets(e)
    assert.ok(m.direct.every((muscle) => MUSCLES.includes(muscle)))
    assert.ok(m.indirect.every((muscle) => MUSCLES.includes(muscle) && !m.direct.includes(muscle)))
  }
  for (const e of CORRECTIVE_LIBRARY.filter((item) => item.mode === 'Activation')) {
    const raw = recommendedMuscleTargets(e.name, e.mode)
    for (const muscle of [...raw.direct, ...raw.indirect]) assert.ok(MUSCLES.includes(muscle), `${e.name}: ${muscle}`)
  }
})

test('common variants receive different, defensible roles', () => {
  assert.deepEqual(muscleTargets({ name: 'Hip Thrust (Bench)' }).direct, ['Glutes'])
  assert.deepEqual(muscleTargets({ name: 'Romanian Deadlift' }).direct, ['Hamstrings', 'Glutes'])
  assert.deepEqual(muscleTargets({ name: 'Deadlift' }).direct, ['Quadriceps', 'Glutes', 'Spinal erectors'])
  assert.deepEqual(muscleTargets({ name: 'Military Press' }).direct, ['Front delts', 'Side delts', 'Triceps'])
  assert.deepEqual(muscleTargets({ name: 'Bench Press' }).direct, ['Chest'])
  assert.deepEqual(muscleTargets({ name: 'Barbell Curls' }).direct, ['Biceps'])
  assert.deepEqual(muscleTargets({ name: 'Push Ups (Narrow)' }).direct, ['Chest', 'Triceps'])
  assert.deepEqual(muscleTargets({ name: 'Leg Press' }).indirect, ['Adductors'])
  assert.deepEqual(muscleTargets({ name: 'Clean & Jerk' }).direct, ['Trapezius', 'Front delts', 'Triceps', 'Quadriceps', 'Glutes'])
  assert.deepEqual(muscleTargets({ name: 'DB Press 1-Arm' }).direct, [])
})

test('library merge keeps IDs and coach overrides on repeated loads', () => {
  const edited = { id: 'existing-bench', name: 'Bench Press', muscle: 'Chest', muscleTargets: { direct: ['Triceps'], indirect: [], source: 'coach' }, video: 'custom-video' }
  const db = { exercises: [edited, { id: 'custom', name: 'My exercise', muscle: 'Arms' }] }
  mergeExerciseLibrary(db)
  const count = db.exercises.length
  const bench = db.exercises.find((e) => e.name === 'Bench Press')
  assert.equal(bench.id, 'existing-bench')
  assert.equal(bench.video, 'custom-video')
  assert.deepEqual(muscleTargets(bench).direct, ['Triceps'])
  assert.equal(db.exercises.find((e) => e.id === 'custom').name, 'My exercise')
  mergeExerciseLibrary(db)
  assert.equal(db.exercises.length, count)
  assert.equal(db.exercises.find((e) => e.name === 'Bench Press').id, 'existing-bench')
})

test('new catalog ids are stable across independent backend loads', () => {
  const first = { exercises: [] }, second = { exercises: [] }
  mergeExerciseLibrary(first, 'coach-a')
  mergeExerciseLibrary(second, 'coach-a')
  assert.equal(first.exercises.find((e) => e.name === 'Bench Press').id, second.exercises.find((e) => e.name === 'Bench Press').id)
  assert.equal(new Set(first.exercises.map((e) => e.id)).size, first.exercises.length)
  const anotherCoach = { exercises: [] }
  mergeExerciseLibrary(anotherCoach, 'coach-b')
  assert.notEqual(first.exercises.find((e) => e.name === 'Bench Press').id, anotherCoach.exercises.find((e) => e.name === 'Bench Press').id)
})

test('old seeded plans regain only their known orphaned library slots', () => {
  const plan = { name: 'Strength — Powerlifting Block', items: [
    { exId: 'kept', sets: 5, reps: '5' },
    { exId: 'lost-bench', sets: 5, reps: '5' },
    { exId: 'lost-deadlift', sets: 3, reps: '3' },
  ] }
  const custom = { name: 'Custom plan', items: [{ exId: 'lost', sets: 5, reps: '5' }] }
  const db = { exercises: [{ id: 'kept', name: 'Back Squat' }], plans: [plan, custom] }
  mergeExerciseLibrary(db)
  assert.equal(plan.items[0].exId, 'kept')
  assert.equal(plan.items[1].exId, db.exercises.find((e) => e.name === 'Bench Press').id)
  assert.equal(plan.items[2].exId, db.exercises.find((e) => e.name === 'Deadlift').id)
  assert.equal(custom.items[0].exId, 'lost')
})

test('catalog corrections replace catalog mappings but preserve coach mappings', () => {
  const db = { exercises: [
    { id: 'wrong', name: 'Push Ups (Narrow)', muscleTargets: { direct: ['Lats', 'Upper back'], indirect: ['Biceps'] } },
    { id: 'coach', name: 'Bench Press', muscleTargets: { direct: ['Triceps'], indirect: [], source: 'coach' } },
  ] }
  mergeExerciseLibrary(db)
  assert.deepEqual(muscleTargets(db.exercises.find((e) => e.id === 'wrong')).direct, ['Chest', 'Triceps'])
  assert.deepEqual(muscleTargets(db.exercises.find((e) => e.id === 'coach')).direct, ['Triceps'])
})
