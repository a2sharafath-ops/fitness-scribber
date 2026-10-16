import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const load = path => vite.ssrLoadModule(`/src/${path}`)
const p = await load('lib/program.js')
const w = await load('lib/workout.js')
const { editRunSet } = await load('lib/setAutofill.js')
const planner = await load('lib/planner.js')
const { validatePrescription, changeIntensity, editPrescribedSet, followFirstSet } = await load('lib/prescription.js')
const example = (intensityType = '%1RM', set = {}) => [{ ...p.newBlock(), exercises: [p.newProgExercise('Squat', { intensityType, sets: [p.newSet(1, { reps: 5, intensity: intensityType === '%1RM' ? 80 : 2, rir: 2, ...set })] })] }]
const rules = (blocks, type, value) => ({ [blocks[0].blockId]: { enabled: true, type, value } })

const loggingRows = () => Array.from({ length: 4 }, (_, i) => w.setRowFromPrescribed({ prescribedReps: 5, prescribedLoadKg: 80, purpose: 'working' }, i, 'Load'))

test('runner autofills matching later sets without counting unmarked sets', () => {
  const original = loggingRows()
  let rows = editRunSet(original, 0, { load: 85 })
  rows = editRunSet(rows, 0, { reps: 6 })
  assert.deepEqual(rows.map(r => [r.load, r.reps, r.done]), Array(4).fill([85, 6, false]))
  assert.equal(original[0].load, 80)
  const workout = () => ({ main: [{ name: 'Squat', setRows: rows }] })
  let summary = w.summarize(workout())
  for (const key of ['volume', 'sets', 'reps', 'doneMain', 'topWeight']) assert.equal(summary[key], 0)
  assert.deepEqual(summary.muscleStrain, [])
  rows = editRunSet(rows, 0, { done: true, load: 85, reps: 6, effort: null })
  summary = w.summarize(workout())
  assert.equal(summary.volume, 510)
  assert.equal(summary.sets, 1)
  assert.equal(summary.doneMain, 1)
  rows = editRunSet(rows, 1, { done: true })
  assert.equal(w.summarize(workout()).volume, 1020)
  rows = editRunSet(rows, 0, { done: false })
  assert.equal(w.summarize(workout()).volume, 510)
})

test('runner respects manual edits, completed rows, and later sources after resume', () => {
  let rows = editRunSet(loggingRows(), 0, { load: 85, reps: 6 })
  rows = editRunSet(rows, 1, { load: 90 })
  rows = JSON.parse(JSON.stringify(rows))
  rows = editRunSet(rows, 0, { load: 87.5, reps: 7 })
  assert.deepEqual(rows.map(r => r.load), [87.5, 90, 90, 90])
  assert.deepEqual(rows.map(r => r.reps), [7, 7, 7, 7])
  rows = editRunSet(rows, 2, { done: true })
  rows = editRunSet(rows, 1, { load: 92.5 })
  assert.deepEqual(rows.map(r => r.load), [87.5, 92.5, 90, 92.5])
  rows = editRunSet(rows, 3, { reps: null })
  rows = editRunSet(rows, 0, { reps: 8 })
  assert.deepEqual(rows.map(r => r.reps), [8, 8, 7, null])
})

test('runner keeps different prescriptions, warm-ups, effort and existing actuals independent', () => {
  const rows = loggingRows()
  rows[1].pLoadKg = 60
  rows[1].load = 60
  rows[2].purpose = 'warmup'
  rows[3].reps = 4
  rows[3].load = 95
  const changed = editRunSet(rows, 0, { load: 85, reps: 6, effort: 2 })
  assert.deepEqual(changed.slice(1), rows.slice(1))
  assert.equal(changed[1].effort, null)
  const variedReps = loggingRows()
  variedReps[1].pReps = 8
  assert.deepEqual(editRunSet(variedReps, 0, { reps: 6 })[1], variedReps[1])
  assert.deepEqual(editRunSet(rows, 0, { done: true, load: 85, reps: 6 }).slice(1), rows.slice(1))
})

test('runner handles zero load, corrections and clearing without spreading invalid values', () => {
  let rows = editRunSet(loggingRows(), 0, { load: 0, reps: 5 })
  assert.deepEqual(rows.map(r => r.load), [0, 0, 0, 0])
  rows = editRunSet(rows, 0, { load: 12.5 })
  assert.deepEqual(rows.map(r => r.load), [12.5, 12.5, 12.5, 12.5])
  rows = editRunSet(rows, 0, { load: null })
  assert.deepEqual(rows.map(r => r.load), [null, null, null, null])
  for (const reps of [-1, 1.5, NaN, Infinity]) {
    assert.deepEqual(editRunSet(loggingRows(), 0, { reps }).slice(1), loggingRows().slice(1))
  }
})

test('prescribed runner preserves absent and intentionally empty warm-up/cool-down sections', () => {
  const main = example('Load', { load: 20 })
  for (const blocks of [main, [{ blockType: 'Warm-up', exercises: [] }, ...main, { blockType: 'Cool-down', exercises: [] }]]) {
    const plan = { name: 'Coach plan', blocks }
    const before = structuredClone(plan)
    const run = w.buildFromPrescription(plan, { clientId: 'test', date: '2026-10-11' })
    assert.deepEqual(run.warmup, [])
    assert.deepEqual(run.cooldown, [])
    assert.deepEqual(run.main.map(e => e.name), ['Squat'])
    assert.equal(run.main[0].setRows.length, 1)
    assert.equal(run.main[0].setRows[0].pReps, 5)
    assert.deepEqual(plan, before)
  }
})

test('prescribed runner retains explicit warm-up/cool-down exercises and their set targets', () => {
  const exercise = (name) => p.newProgExercise(name, { intensityType: 'Load', sets: [p.newSet(1, { reps: 8, rir: 3 })] })
  const run = w.buildFromPrescription({ blocks: [
    { blockType: 'Warm-up', exercises: [exercise('Warm-up squat')] },
    ...example(),
    { blockType: 'Cool-down', exercises: [exercise('Coach cool-down')] },
  ] }, { clientId: 'test', date: '2026-10-11' })
  assert.deepEqual(run.warmup.map(e => e.name), ['Warm-up squat'])
  assert.deepEqual(run.cooldown.map(e => e.name), ['Coach cool-down'])
  for (const item of [run.warmup[0], run.cooldown[0]]) {
    assert.equal(item.setRows.length, 1)
    assert.equal(item.setRows[0].pReps, 8)
    assert.equal(item.setRows[0].pRir, 3)
  }
  assert.deepEqual(run.main.map(e => e.name), ['Squat'])
})
test('local QA fixture provides valid plans, distinct Training Maxes and protected copy targets without wearable data', async () => {
  const { seedBuilderQA, BUILDER_QA_CLIENT, BUILDER_QA_OTHER } = await load('lib/builderQA.js')
  const db = seedBuilderQA('2026-10-10')
  assert.equal(db.clients.length, 2)
  assert.equal(db.wearable.length, 0)
  assert.equal(p.resolveTrainingMax(db, BUILDER_QA_CLIENT, 'Bench Press', '2026-10-10').kg, 100)
  assert.equal(p.resolveTrainingMax(db, BUILDER_QA_OTHER, 'Bench Press', '2026-10-10').kg, 200)
  assert.equal(planner.isPlanTargetBlocked(db, BUILDER_QA_CLIENT, '2026-10-12', '2026-10-10'), true)
  assert.equal(planner.isPlanTargetBlocked(db, BUILDER_QA_OTHER, '2026-10-12', '2026-10-10'), true)
  for (const plan of db.prescriptions) validatePrescription(plan.name, plan.blocks)
  const today = db.prescriptions.find(plan => plan.clientId === BUILDER_QA_CLIENT && plan.date === '2026-10-10')
  assert.equal(w.buildFromPrescription(today, { clientId: BUILDER_QA_CLIENT, date: today.date, resolveTm: name => p.resolveTrainingMax(db, BUILDER_QA_CLIENT, name, today.date).kg }).main[0].setRows[0].pLoadKg, 80)
})
test('local store commit reports actual storage success and keeps a failed save retryable', async () => {
  const { DataProvider, useData } = await load('store/DataContext.jsx')
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let captured, stored, fail = true
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem: (_key, value) => { if (fail) throw new Error('Storage full'); stored = JSON.parse(value) } } })
  try {
    function Capture() { captured = useData(); return null }
    renderToStaticMarkup(React.createElement(DataProvider, { backend: false, initialDb: { prescriptions: [], settings: {} } }, React.createElement(Capture)))
    const mutation = db => planner.writePrescription(db, 'a', '2026-10-11', example(), '', 'Coach session')
    await assert.rejects((await load('lib/confirmedPersistence.js')).confirmedPlanWrite(captured.commit, mutation), /could not be saved/)
    fail = false
    assert.equal((await captured.commit(mutation)).saved, true)
    assert.equal(stored.prescriptions.length, 1)
    assert.equal(stored.prescriptions[0].name, 'Coach session')
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else delete globalThis.localStorage
  }
})
test('coach workflow: dictation, individualized targets, progression, save, copy and runner agree', async () => {
  const { parseTranscript } = await load('lib/voiceParse.js')
  const blocks = parseTranscript('Squat three sets of five at 80 percent with 2 RIR')
  let sets = editPrescribedSet(blocks[0].exercises[0].sets, 1, 'prescribedRestSeconds', 120)
  sets = editPrescribedSet(sets, 0, 'prescribedRir', 3)
  blocks[0].exercises[0].sets = sets
  const progressed = p.applyProgression(blocks, rules(blocks, 'percentage', 5))
  const db = { prescriptions: [], workouts: [], sessions: [] }
  planner.writePrescription(db, 'a', '2026-10-11', progressed, 'Coach notes', 'Squat strength')
  const persisted = JSON.parse(JSON.stringify(db))
  planner.pasteClip(persisted, planner.buildClip(persisted, { id:'a', name:'Client A' }, ['2026-10-11']), 'b', '2026-10-12')
  for (const [clientId, tm, expectedKg] of [['a',100,85], ['b',200,170]]) {
    const plan = persisted.prescriptions.find(plan => plan.clientId === clientId)
    const run = w.buildFromPrescription(plan, { clientId, date:plan.date, resolveTm:() => tm })
    assert.equal(run.main[0].setRows.length, 3)
    assert.deepEqual(run.main[0].setRows.map(row => row.pLoadKg), [expectedKg,expectedKg,expectedKg])
    assert.deepEqual(run.main[0].setRows.map(row => row.pRir), [3,3,3])
    assert.deepEqual(run.main[0].setRows.map(row => row.pRest), [90,120,90])
    assert.ok(run.main[0].setRows.every(row => row.reps === null && row.effort === null && !row.done))
  }
})
test('fix 11: success waits for persistence, errors stay failed, and unchanged retries resend against the last saved baseline', async () => {
  const { createSnapshotQueue, confirmedPlanWrite } = await load('lib/confirmedPersistence.js')
  const initial = { prescriptions: [] }, edited = { prescriptions: [{ id: 'p', name: 'Squat' }] }
  let release, calls = [], fail = true
  const queue = createSnapshotQueue(initial, async (prev, next) => {
    calls.push({ prev, next })
    if (calls.length === 1) await new Promise(resolve => { release = resolve })
    return fail ? [{ table: 'prescriptions', message: 'write denied' }] : []
  })
  let settled = false
  const request = confirmedPlanWrite(() => queue.enqueue(edited), () => {}).then(() => { settled = true }, error => { settled = true; return error })
  await Promise.resolve(); await Promise.resolve()
  assert.equal(settled, false)
  release()
  assert.match((await request).message, /could not be saved/)
  fail = false
  assert.equal((await confirmedPlanWrite(() => queue.enqueue(edited), () => {})).saved, true)
  assert.equal(calls[1].prev, initial)
  const newer = { prescriptions: [{ id: 'p', name: 'New session' }] }
  await queue.enqueue(newer)
  assert.equal(calls[2].prev, edited)
  const thrown = createSnapshotQueue(initial, () => { throw new Error('Disconnected') })
  assert.equal((await thrown.enqueue(edited)).saved, false)
  await assert.rejects(confirmedPlanWrite(() => Promise.resolve({ saved: false, local: true }), () => {}), /could not be saved/)
  assert.equal((await confirmedPlanWrite(() => Promise.resolve({ saved: true, local: true }), () => {})).local, true)
})
test('fix 10: lower-set overrides are field-specific and reset preserves IDs and completion evidence', () => {
  const initial = [1,2,3].map(n => p.newSet(n, { reps: 5, intensity: 80, rir: 2, rest: 90 }))
  let changed = editPrescribedSet(initial, 1, 'prescribedRestSeconds', 120)
  changed = editPrescribedSet(changed, 0, 'prescribedRir', 3)
  assert.deepEqual(changed.map(set => set.prescribedRir), [3,3,3])
  assert.deepEqual(changed.map(set => set.prescribedRestSeconds), [90,120,90])
  changed = editPrescribedSet(changed, 1, 'prescribedRir', 1)
  changed = editPrescribedSet(changed, 0, 'prescribedRir', 4)
  assert.deepEqual(changed.map(set => set.prescribedRir), [4,1,4])
  const reset = followFirstSet(changed)
  assert.deepEqual(reset.map(set => set.prescribedRir), [4,4,4])
  assert.deepEqual(reset.map(set => set.setId), initial.map(set => set.setId))
  assert.deepEqual(initial.map(set => set.prescribedRir), [2,2,2])
  const legacy = initial.map((set, i) => i === 1 ? {...set, touched: true} : set)
  assert.equal(editPrescribedSet(legacy, 0, 'prescribedRir', 4)[1].prescribedRir, 2)
  const legacyEdited = editPrescribedSet(legacy, 1, 'prescribedRestSeconds', 120)
  assert.equal(editPrescribedSet(legacyEdited, 0, 'prescribedRir', 4)[1].prescribedRir, 2)
  changed[1].status = 'Completed'; changed[1].completedReps = 3
  assert.deepEqual(followFirstSet(changed)[1], changed[1])
})
test('fix 9: planned volume resolves relative targets and keeps unavailable, partial, timed and bodyweight values distinct', async () => {
  const { prescriptionVolume } = await load('lib/prescriptionMetrics.js')
  const blocks = example(); blocks[0].exercises[0].sets = [1,2,3].map(n => p.newSet(n, { reps: 5, intensity: 80, rir: 2 }))
  assert.deepEqual(prescriptionVolume(blocks, () => 100), { total: 1200, known: 3, missing: 0, estimated: true, hasRange: false })
  assert.deepEqual(prescriptionVolume(blocks), { total: null, known: 0, missing: 3, estimated: false, hasRange: false })
  blocks[0].exercises.push(example('Load', { reps: 5, loadKg: 10 })[0].exercises[0])
  assert.deepEqual(prescriptionVolume(blocks), { total: 50, known: 1, missing: 3, estimated: false, hasRange: false })
  assert.equal(prescriptionVolume(example('Load', { loadKg: 0 })).total, 0)
  assert.equal(prescriptionVolume(example('Seconds', { intensity: 30 }), () => 100).total, null)
  assert.equal(prescriptionVolume(example('RIR', { intensity: 2 }), () => 100).estimated, true)
})
test('fix 8: dictation and AI normalization preserve combined percentage/load + RIR, corrections and zero RIR', async () => {
  const { parseTranscript, normalizeParsed } = await load('lib/voiceParse.js')
  for (const words of ['2 RIR', 'RIR 2', 'two reps in reserve']) {
    const blocks = parseTranscript(`Squat three sets of five at 80 percent with ${words}`)
    const ex = blocks[0].exercises[0]
    assert.equal(ex.intensityType, '%1RM')
    assert.equal(ex.sets.length, 3)
    assert.equal(ex.sets[0].prescribedReps, 5)
    assert.equal(ex.sets[0].prescribedRir, 2)
    validatePrescription('Dictation', blocks)
  }
  const fixed = parseTranscript('Squat three sets of five at 60 kg with 0 RIR')[0].exercises[0]
  assert.equal(fixed.intensityType, 'Load'); assert.equal(fixed.sets[0].prescribedRir, 0)
  const corrected = parseTranscript('Squat three sets of five at 80 percent with 2 RIR. No wait, make it RIR 3')[0].exercises[0]
  assert.equal(corrected.sets[0].prescribedRir, 3)
  for (const shape of [{setCount: 3, prescribedReps: 5, prescribedIntensityValue: 80, prescribedRir: 2}, {sets: [{prescribedReps: 5, prescribedIntensityValue: 80, prescribedRir: 0}]}]) {
    const blocks = normalizeParsed({ blocks: [{ exercises: [{exerciseName: 'Squat', intensityType: '%1RM', ...shape}] }] })
    assert.equal(blocks[0].exercises[0].sets[0].prescribedRir, shape.prescribedRir ?? 0)
    validatePrescription('AI', blocks)
  }
})
test('fix 7: progression defaults match targets and unsupported load progression reports an error', () => {
  const blocks = example(), exercise = blocks[0].exercises[0]
  const rule = p.defaultRuleForExercise('Main Lifts', exercise)
  assert.equal(rule.type, 'percentage')
  const changed = p.applyProgression(blocks, rules(blocks, rule.type, rule.value))
  assert.equal(changed[0].exercises[0].sets[0].prescribedIntensityValue, 82.5)
  assert.throws(() => p.applyProgression(blocks, rules(blocks, 'load', 2.5)), /unavailable/)
  const fixed = example('Load', { loadKg: 60 })
  assert.equal(p.defaultRuleForExercise('Main Lifts', fixed[0].exercises[0]).type, 'load')
  assert.equal(p.applyProgression(fixed, rules(fixed, 'load', 2.5))[0].exercises[0].sets[0].prescribedLoadKg, 62.5)
  assert.equal(p.defaultRuleForExercise('Main Lifts', example('RIR')[0].exercises[0]).type, 'reps')
  assert.throws(() => p.applyProgression(blocks, rules(blocks, 'sets', 0.5)), /whole numbers/)
})
test('fix 6: all prescription writes protect ready, running and completed workouts; span copies fail before any mutation', () => {
  for (const status of ['ready', 'in_progress', 'completed']) {
    const db = { prescriptions: [], sessions: [], workouts: [{ clientId: 'b', date: '2026-10-12', status }] }
    const before = structuredClone(db)
    const clip = { days: [{ offset: 0, name: 'Session', blocks: example() }, { offset: 1, name: 'Session', blocks: example() }] }
    assert.equal(planner.isPlanTargetBlocked(db, 'b', '2026-10-12', '2026-10-10'), true)
    assert.throws(() => planner.pasteClip(db, clip, 'b', '2026-10-11'), /protected/)
    assert.deepEqual(db, before)
    assert.throws(() => planner.writePrescription(db, 'b', '2026-10-12', example(), '', 'Session'), /protected/)
    planner.writePrescription(db, 'a', '2026-10-12', example(), '', 'Other client')
    assert.equal(db.prescriptions.length, 1)
  }
  const invalid = { days: [{ offset: 0, name: 'Valid', blocks: example() }, { offset: 1, name: 'Invalid', blocks: [] }] }
  const db = { prescriptions: [], sessions: [], workouts: [] }
  assert.throws(() => planner.pasteClip(db, invalid, 'a', '2026-10-11'), /Add an exercise/)
  assert.equal(db.prescriptions.length, 0)
})
test('fix 5: bulk replacement requires approval and cancellation leaves every existing plan intact', async () => {
  const db = { clients: [{ id: 'a', name: 'Coach client' }], prescriptions: [{ clientId: 'a', date: '2026-10-11', name: 'Original' }, { clientId: 'b', date: '2026-10-12' }] }
  const before = structuredClone(db)
  let confirmation
  const targets = [{ clientId: 'a', date: '2026-10-11' }, { clientId: 'a', date: '2026-10-12' }]
  assert.equal(await planner.approvePlanReplacement(db, targets, value => { confirmation = value; return false }), false)
  assert.match(confirmation.message, /1 existing plan/)
  assert.match(confirmation.message, /Coach client · 2026-10-11/)
  assert.deepEqual(db, before)
  assert.equal(await planner.approvePlanReplacement(db, targets, () => true), true)
  assert.equal(await planner.approvePlanReplacement(db, [targets[1]], () => { throw new Error('Unexpected prompt') }), true)
})
test('fix 4: changing intensity clears incompatible values while retaining reps, manual load and an equivalent RIR target', () => {
  const original = example('%1RM', { loadKg: 60 })[0].exercises[0]
  const rir = changeIntensity(original, 'RIR')
  assert.equal(rir.sets[0].prescribedIntensityValue, 2)
  assert.equal(rir.sets[0].prescribedLoadKg, 60)
  assert.equal(rir.sets[0].prescribedReps, 5)
  assert.equal(changeIntensity(original, 'RPE').sets[0].prescribedIntensityValue, null)
  assert.equal(changeIntensity(original, 'Seconds').sets[0].prescribedIntensityValue, null)
  const back = changeIntensity(rir, '%1RM')
  assert.equal(back.sets[0].prescribedIntensityValue, null)
  assert.equal(back.sets[0].prescribedRir, 2)
  assert.equal(original.sets[0].prescribedIntensityValue, 80)
  const customized = {...original, sets: editPrescribedSet([original.sets[0], p.newSet(2)], 1, 'prescribedIntensityValue', 60)}
  const cleared = changeIntensity(customized, 'RPE')
  assert.equal(editPrescribedSet(cleared.sets, 0, 'prescribedIntensityValue', 8)[1].prescribedIntensityValue, 8)
})
test('fix 3: shared validation rejects malformed prescriptions and permits bodyweight, timed and zero RIR targets', () => {
  for (const patch of [{ prescribedReps: -1 }, { prescribedReps: 1.5 }, { prescribedLoadKg: -5 }, { prescribedRestSeconds: -1 }, { prescribedIntensityValue: 101 }, { prescribedRir: 11 }, { prescribedReps: NaN }]) {
    const blocks = example(); Object.assign(blocks[0].exercises[0].sets[0], patch)
    assert.throws(() => validatePrescription('Squat session', blocks), /Squat, set 1/)
  }
  assert.throws(() => validatePrescription('', example()), /session name/)
  assert.throws(() => validatePrescription('Session', []), /Add an exercise/)
  const unnamed = example(); unnamed[0].exercises[0].exerciseName = ''; assert.throws(() => validatePrescription('Session', unnamed), /name/)
  const empty = example(); empty[0].exercises[0].sets = []; assert.throws(() => validatePrescription('Session', empty), /at least one set/)
  assert.equal(validatePrescription('Bodyweight', example('Load', { loadKg: 0, rir: 0 })), true)
  const timed = example('Seconds', { intensity: 30 }); timed[0].exercises[0].sets[0].prescribedReps = null
  assert.equal(validatePrescription('Timed', timed), true)
  assert.equal(validatePrescription('Failure target', example('RIR', { intensity: 0 })), true)
})
test('fix 2: percentage progression remains relative after JSON persistence and copying to another client', () => {
  const blocks = example('%1RM', { loadKg: 60 })
  const changed = p.applyProgression(blocks, rules(blocks, 'percentage', 5), () => 100)
  const copied = p.cloneBlocksFresh(JSON.parse(JSON.stringify(changed)))
  const row = copied[0].exercises[0].sets[0]
  assert.equal(row.prescribedLoadKg, null)
  assert.equal(w.targetLoadKg('%1RM', row, 100), 85)
  assert.equal(w.targetLoadKg('%1RM', row, 200), 170)
  assert.equal(w.targetLoadKg('%1RM', row, null), null)
  assert.equal(blocks[0].exercises[0].sets[0].prescribedLoadKg, 60)
  assert.equal(p.cloneBlocksFresh(blocks)[0].exercises[0].sets[0].prescribedLoadKg, 60)
})
test('fix 1: percentage progression rejects subjective and timed targets without changing them', () => {
  for (const type of ['RIR', 'RPE', 'Seconds', 'Load']) {
    const blocks = example(type), before = structuredClone(blocks)
    assert.throws(() => p.applyProgression(blocks, rules(blocks, 'percentage', 5)), /percentage progression requires/)
    assert.deepEqual(blocks, before)
  }
  const blocks = example()
  const changed = p.applyProgression(blocks, rules(blocks, 'percentage', 5))
  assert.equal(changed[0].exercises[0].sets[0].prescribedIntensityValue, 85)
  assert.equal(changed[0].exercises[0].sets[0].prescribedRir, 2)
})
