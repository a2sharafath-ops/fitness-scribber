import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const live = await vite.ssrLoadModule('/src/lib/liveSession.js')
const { summarize } = await vite.ssrLoadModule('/src/lib/workout.js')
const { workoutPeaks } = await vite.ssrLoadModule('/src/lib/program.js')
const fixture = () => ({ id: 'session', clientId: 'test-client', date: '2026-11-19', title: 'Test session', status: 'in_progress', startedAt: '2026-11-19T09:00:00.000Z',
  warmup: [], cooldown: [], main: [
    { id: 'bench', name: 'Bench press', blockType: 'Main Lifts', rest: 60, setRows: [
      { n: 1, pReps: 10, pLoadKg: 40, done: true, reps: 8, load: 45, customField: 'retained' },
      { n: 2, pReps: 10, pLoadKg: 40, done: false, reps: null, load: null } ] },
    { id: 'row', name: 'Cable row', blockType: 'Main Lifts', rest: 60, sets: 2, reps: '12', weight: 30 },
  ] })
const now = Date.parse('2026-11-19T09:01:00Z')
const prepare = () => live.prepareLiveSession(fixture(), () => 100, now)
const change = (workout, type, id, rest = {}, at = now) => live.applyLiveAction(workout, { type, id, ...rest }, at)

test('session adoption preserves original structures and logged values with stable row identities', () => {
  const old = fixture(), next = live.prepareLiveSession(old, () => 100, now)
  assert.deepEqual(next.liveState.original.main, old.main)
  const { id, ...row } = next.main[0].setRows[0]
  assert.deepEqual(row, old.main[0].setRows[0])
  assert.equal(id, 'bench:set:1')
  assert.deepEqual(live.prepareLiveSession(next, () => 500, now + 1000), next)
  assert.equal(old.liveState, undefined)
})
test('live actual weight stays blank until confirmed, including old prefills and added sets', () => {
  const old = fixture()
  old.main[0].setRows[1].load = 40
  old.main[1].setRows = [{ pReps: 12, pLoadKg: 30, done: false, load: null, autofill: { load: 'manual' } }]
  let w = live.prepareLiveSession(old, () => 100, now)
  const id = 'bench:set:2'
  const row = () => live.locateLive(w, id).row
  assert.equal(row().load, null)
  assert.equal(row().pLoadKg, 40)
  assert.equal(w.main[1].setRows[0].load, null)
  assert.equal(w.liveState.original.main[0].setRows[1].load, 40)

  // Resume a stored version from before the actual-weight field was separated.
  row().load = 40
  const saved = structuredClone(w)
  w = live.prepareLiveSession(w, null, now)
  assert.deepEqual(w, saved)
  assert.equal(live.liveSetLoad(row()), null)
  w = change(w, 'row', id, { patch: { pLoadKg: 42 } })
  assert.equal(live.liveSetLoad(row()), null)
  assert.throws(() => change(w, 'done', id, { actual: { metric: 9, load: null } }), /Confirm the weight/)

  w = change(w, 'add-set', 'bench')
  w = change(w, 'row', id, { patch: { load: 42 } })
  assert.equal(live.liveSetLoad(row()), 42)
  assert.equal(w.main[0].setRows[2].load, null)
  assert.equal(w.main[0].setRows[2].pLoadKg, 42)
  w = change(w, 'done', id, { actual: { metric: 9, load: 0 } })
  w = change(w, 'done', id)
  assert.equal(live.liveSetLoad(row()), 0)
  assert.equal(row().completionHistory[0].recorded.load, 0)
  assert.equal(w.main[0].setRows[0].load, 45)
})
test('completed rows reject edits, undo retains an audit copy, and new logging leaves original targets untouched', () => {
  let w = prepare()
  assert.throws(() => change(w, 'row', 'bench:set:1', { patch: { reps: 1 } }), /Undo/)
  w = change(w, 'done', 'bench:set:1')
  assert.equal(w.main[0].setRows[0].load, 45)
  assert.equal(w.main[0].setRows[0].completionHistory[0].recorded.reps, 8)
  w = change(w, 'row', 'bench:set:1', { patch: { reps: 9, pReps: 11 } })
  w = change(w, 'done', 'bench:set:1')
  assert.equal(w.main[0].setRows[0].done, true)
  assert.equal(w.liveState.original.main[0].setRows[0].pReps, 10)
  assert.equal(w.liveState.original.main[0].setRows[0].reps, 8)
})
test('rest only starts on Done, is attached to a set, and pauses without counting inactive time', () => {
  let w = change(prepare(), 'rest-toggle', 'row')
  assert.equal(w.liveState.rest, null)
  w = change(w, 'row', 'row:set:1', { patch: { reps: 12, load: 30 } })
  w = change(w, 'done', 'row:set:1')
  assert.equal(w.liveState.rest.rowId, 'row:set:1')
  assert.equal(live.restRemainingMs(w.liveState.rest, now + 10000), 50000)
  w = change(w, 'pause', null, {}, now + 10000)
  assert.equal(live.restRemainingMs(w.liveState.rest, now + 20000), 50000)
  w = change(w, 'pause', null, {}, now + 20000)
  assert.equal(live.restRemainingMs(w.liveState.rest, now + 30000), 40000)
  w = change(w, 'done', 'row:set:1')
  assert.equal(w.liveState.rest, null)
})
test('actual set effort survives Done, reload and Undo without changing targets or other sets', () => {
  let w = prepare()
  const original = structuredClone(w.liveState.original)
  w = change(w, 'row', 'bench:set:2', { patch: { reps: 10, load: 40, effortType: 'RIR', effort: 1.5 } })
  w = change(w, 'done', 'bench:set:2')
  w = live.prepareLiveSession(JSON.parse(JSON.stringify(w)), null, now)
  assert.equal(live.locateLive(w, 'bench:set:2').row.effort, 1.5)
  assert.equal(live.locateLive(w, 'bench:set:2').row.effortType, 'RIR')
  assert.throws(() => change(w, 'row', 'bench:set:2', { patch: { effortType: 'RPE', effort: 8 } }), /Undo/)
  w = change(w, 'done', 'bench:set:2')
  assert.equal(live.locateLive(w, 'bench:set:2').row.effort, 1.5)
  assert.equal(live.locateLive(w, 'bench:set:2').row.completionHistory.at(-1).recorded.effort, 1.5)
  w = change(w, 'row', 'bench:set:2', { patch: { effortType: 'RPE', effort: 8 } })
  w = change(w, 'done', 'bench:set:2')
  assert.equal(live.locateLive(w, 'bench:set:2').row.effort, 8)
  assert.equal(live.locateLive(w, 'bench:set:2').row.effortType, 'RPE')
  assert.equal(live.locateLive(w, 'bench:set:1').row.reps, 8)
  assert.deepEqual(w.liveState.original, original)
})
test('duration actuals never count as reps or feed the strength ledger', () => {
  let w = change(prepare(), 'row', 'bench:set:2', { patch: { mode: 'duration', reps: 99, load: 100 } })
  w = change(w, 'set-timer', 'bench:set:2')
  w = change(w, 'set-timer', 'bench:set:2', {}, now + 4500)
  w = change(w, 'done', 'bench:set:2')
  assert.equal(w.main[0].setRows[1].durationSeconds, 4)
  assert.equal(summarize(w).reps, 8)
  assert.equal(summarize(w).volume, 360)
  assert.equal(workoutPeaks([], w)[0].valueKg, 57)
})
test('replace, skip, superset and cross-block reorder preserve completed sets and original snapshots', () => {
  let w = prepare()
  const before = structuredClone(w.liveState.original)
  w = change(w, 'superset', 'bench', { partnerId: 'row' })
  w = change(w, 'add-block', null, { name: 'Accessory' })
  const blockId = w.liveState.blocks.at(-1).id
  w = change(w, 'move-exercise', 'bench', { blockId })
  assert.deepEqual(live.liveBlocks(w).at(-1).items.map(item => item.id), ['bench', 'row'])
  w = change(w, 'replace', 'bench', { name: 'Dumbbell bench', blockId })
  assert.equal(live.locateLive(w, 'bench:set:1').row.done, true)
  assert.equal(live.locateLive(w, 'bench:set:2').row.skipped, true)
  assert.deepEqual(w.liveState.original, before)
  w = change(w, 'discard')
  assert.equal(w.status, 'discarded')
  assert.equal(live.locateLive(w, 'bench:set:1').row.reps, 8)
  assert.deepEqual(w.liveState.original, before)
  assert.throws(() => change(w, 'add-set', 'row'), /ended/)
})
test('only the same client’s previous completed performance is shown', () => {
  const current = prepare()
  const other = { ...fixture(), clientId: 'other-client', id: 'other', date: '2026-11-18', status: 'completed' }
  const previous = { ...fixture(), id: 'previous', date: '2026-11-17', status: 'completed' }
  assert.equal(live.previousLivePerformance([other, previous, current], current, current.main[0]).date, '2026-11-17')
})

test('legacy per-exercise actuals survive adoption and supersets advance by rounds', () => {
  const old = fixture()
  old.main = [{ id: 'legacy', name: 'Legacy exercise', sets: 3, reps: '10', weight: 40, done: true, doneSets: 2, doneReps: 8, doneWeight: 45 }]
  const normalized = live.prepareLiveSession(old, null, now)
  assert.deepEqual(normalized.main[0].setRows.map(row => row.done), [true, true, false])
  assert.equal(summarize(normalized).volume, 720)
  let w = change(prepare(), 'superset', 'bench', { partnerId: 'row' })
  assert.equal(live.nextLiveSet(w).row.id, 'row:set:1')
  w = change(w, 'row', 'row:set:1', { patch: { reps: 12, load: 30 } })
  w = change(w, 'done', 'row:set:1')
  assert.equal(live.nextLiveSet(w).row.id, 'bench:set:2')
})

test('a conflicting workout save stops before effort or strength observations are written', async () => {
  const { persistDiff } = await vite.ssrLoadModule('/src/api/sync.js')
  const written = []
  const previous = { workouts: [prepare()], srpe: [], maxes: [] }
  const next = structuredClone(previous)
  next.workouts[0].note = 'Conflicting edit'
  next.srpe = [{ id: 'effort', clientId: 'test-client', rpe: 8 }]
  next.maxes = [{ id: 'peak', clientId: 'test-client', valueKg: 99 }]
  const client = { rpc: async () => ({ error: { message: 'Changed in another window' } }), from: table => { written.push(table); throw Error('Unexpected write') } }
  const result = await persistDiff(previous, next, client)
  assert.equal(result[0].table, 'workouts')
  assert.deepEqual(written, [])
})

test('a stopped timer keeps the same set ready to mark done after reload', () => {
  let w = prepare()
  const original = structuredClone(w.liveState.original)
  const id = 'row:set:2'
  w = change(w, 'row', id, { patch: { mode: 'duration' } })
  w = change(w, 'set-timer', id)
  assert.equal(live.liveDockSet(w).action, 'stop')
  w = change(w, 'set-timer', id, {}, now + 6500)
  w = live.prepareLiveSession(JSON.parse(JSON.stringify(w)))
  assert.notEqual(live.nextLiveSet(w).row.id, id)
  assert.equal(live.liveDockSet(w).action, 'done')
  assert.equal(live.liveDockSet(w).row.id, id)
  assert.equal(live.liveDockSet(w).row.durationSeconds, 6)
  assert.throws(() => change(w, 'done', id, { actual: { load: -1, metric: 6 } }), /weight/)
  assert.equal(live.liveDockSet(w).row.done, false)
  w = change(w, 'done', id, { actual: { load: 20, metric: 6 } })
  assert.equal(live.locateLive(w, id).row.load, 20)
  assert.equal(live.locateLive(w, id).row.done, true)
  assert.equal(live.locateLive(w, 'bench:set:1').row.load, 45)
  assert.deepEqual(w.liveState.original, original)
  assert.equal(w.liveState.stoppedSetId, undefined)
})

test('restoring an exercise retains its individually skipped sets', () => {
  let w = prepare()
  w = change(w, 'skip-row', 'row:set:1')
  w = change(w, 'skip-exercise', 'row')
  w = change(w, 'skip-exercise', 'row')
  assert.deepEqual(live.locateLive(w, 'row').item.setRows.map(set => Boolean(set.skipped)), [true, false])
})

test('prescriptions measured in seconds or minutes open timed without rewriting history or explicit modes', async () => {
  const { buildFromPrescription } = await vite.ssrLoadModule('/src/lib/workout.js')
  const set = value => ({ prescribedReps: 10, prescribedIntensityValue: value })
  const plan = { name: 'Timed plan', blocks: [{ blockType: 'Main Lifts', exercises: [
    { exerciseName: 'Plank', intensityType: 'Seconds', sets: [set(30), set(45), set(20), set(15)] },
    { exerciseName: 'Bike', intensityType: 'Minutes', sets: [set(1.5)] },
    { exerciseName: 'Press', intensityType: 'RPE', sets: [set(8)] },
  ] }] }
  const planBefore = structuredClone(plan)
  const workout = buildFromPrescription(plan, { clientId: 'test-client', date: '2026-11-19' })
  Object.assign(workout.main[0].setRows[2], { mode: 'reps', reps: 7 })
  Object.assign(workout.main[0].setRows[3], { done: true, reps: 4, load: 6 })
  let session = live.prepareLiveSession(workout, null, now)
  assert.deepEqual(plan, planBefore)
  assert.deepEqual(session.liveState.original.main, workout.main)
  assert.deepEqual(session.main.map(item => item.setRows.map(live.rowMode)), [['duration', 'duration', 'reps', 'reps'], ['duration'], ['reps']])
  assert.deepEqual(session.main[0].setRows.slice(0, 2).map(live.adjustedSetDuration), [30, 45])
  assert.equal(live.adjustedSetDuration(session.main[1].setRows[0]), 90)
  assert.equal(live.prescribedSetDuration(session.liveState.original.main[0], session.liveState.original.main[0].setRows[0]), 30)
  assert.equal(live.liveDockSet(session).action, 'start')

  const legacy = session.main[0].setRows[0]
  delete legacy.mode
  delete legacy.pDurationSeconds
  assert.equal(live.liveDockSet(session).action, 'start')
  assert.equal(legacy.mode, undefined)
  session = change(session, 'set-timer', legacy.id)
  session = change(session, 'set-timer', legacy.id, {}, now + 4200)
  assert.equal(live.liveDockSet(session).action, 'done')
  session = change(session, 'done', legacy.id)
  assert.equal(live.locateLive(session, legacy.id).row.durationSeconds, 4)
  assert.deepEqual(session.liveState.original.main, workout.main)
  assert.equal(session.main[0].setRows[3].load, 6)
  assert.equal(session.main[0].setRows[3].reps, 4)
})
