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
  w = change(w, 'row', 'row:set:1', { patch: { reps: 12 } })
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
  w = change(w, 'row', 'row:set:1', { patch: { reps: 12 } })
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
