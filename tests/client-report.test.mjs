import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const { clientReport, reportPreferences } = await vite.ssrLoadModule('/src/lib/clientReport.js')

const empty = () => ({ clients: [], workouts: [], exercises: [], sessions: [], srpe: [], wellness: [], wearable: [], concerns: [], assessments: [], resistance: [] })
const workout = (id, clientId, date, rows) => ({ id, clientId, date, status: 'completed', main: [{ id: `item-${id}`, exId: 'squat', name: 'Back Squat', blockType: 'Main Lifts', setRows: rows }] })
const set = (reps, load, purpose = 'working') => ({ done: true, purpose, reps, load })

test('report separates completed workouts, booked-session completion and classified muscle exposure by client', () => {
  const db = empty()
  db.exercises.push({ id: 'squat', name: 'Back Squat', muscleTargets: { direct: ['Quadriceps', 'Glutes'], indirect: ['Abdominals'] } })
  db.workouts.push(workout('one', 'a', '2026-09-22', [set(8, 60), set(10, 20, 'warmup')]), workout('two', 'a', '2026-09-29', [set(8, 65)]), workout('private', 'b', '2026-09-22', [set(8, 200)]))
  db.sessions.push({ id: 'booked', clientId: 'a', date: '2026-09-22', status: 'Completed' }, { id: 'unresolved', clientId: 'a', date: '2026-09-27', status: 'Confirmed' }, { id: 'cancelled', clientId: 'a', date: '2026-09-28', status: 'Cancelled' }, { id: 'today', clientId: 'a', date: '2026-09-30', status: 'Completed' }, { id: 'other', clientId: 'b', date: '2026-09-22', status: 'Completed' })
  const report = clientReport(db, 'a', '2026-09-30', 28, '2026-09-30')
  assert.equal(report.workouts.length, 2)
  assert.equal(report.activeWeeks, 2)
  assert.deepEqual(report.bookings, { completed: 1, total: 2, unresolved: 1, cancelled: 1, percent: 50 })
  assert.equal(report.working.totalSets, 2)
  assert.equal(report.totalKnownVolume, 1000)
  assert.equal(report.muscle.totalSets, 1)
  assert.equal(report.muscle.start, '2026-09-21')
  assert.deepEqual(report.lifts[0].points.map((row) => row.estimate), [76, 82.3])
  assert.ok(report.lifts[0].points.every((row) => row.load < 200))
})

test('report keeps missing load unknown and does not invent check-in or assessment changes', () => {
  const db = empty()
  db.exercises.push({ id: 'squat', name: 'Back Squat', muscleTargets: { direct: ['Quadriceps'], indirect: [] } })
  db.workouts.push(workout('one', 'a', '2026-09-29', [set(10, null)]))
  db.assessments.push(
    { id: 'body-one', clientId: 'a', type: 'body_comp', phase: 'baseline', date: '2026-09-03', data: { method: 'BIA', massKg: 80 } },
    { id: 'body-two', clientId: 'a', type: 'body_comp', phase: 'reassessment', date: '2026-09-30', data: { method: 'DEXA', massKg: 79 } },
    { id: 'auto-max', clientId: 'a', type: 'fitness', date: '2026-09-29', notes: 'Auto-update: new estimated 1RM peak', data: { strength: [{ lift: 'Squat', valueKg: 100 }] } },
  )
  const report = clientReport(db, 'a', '2026-09-30', 28, '2026-09-30')
  assert.equal(report.totalKnownVolume, 0)
  assert.equal(report.missingVolumeSets, 1)
  assert.equal(report.lifts.length, 0)
  assert.equal(report.wellness.sleepMean, null)
  assert.equal(report.effort.mean, null)
  assert.equal(report.load.acwr, null)
  assert.equal(report.assessments.body.comparable, false)
  assert.equal(report.assessments.fitness.last, null)
})

test('dated resistance logs create a separate strength series without inflating muscle exposure', () => {
  const db = empty()
  db.exercises.push({ id: 'squat', name: 'Back Squat', muscleTargets: { direct: ['Quadriceps'], indirect: [] } })
  db.workouts.push(workout('one', 'a', '2026-09-22', [set(8, 60)]))
  db.resistance.push(
    { id: 'manual-one', clientId: 'a', date: '2026-09-23', exercise: 'Back Squat', sets: 3, reps: 5, weight: 70, source: 'Coach manual' },
    { id: 'manual-two', clientId: 'a', date: '2026-09-29', exercise: 'Back Squat', sets: 3, reps: 5, weight: 75, source: 'Coach manual' },
    { id: 'private', clientId: 'b', date: '2026-09-29', exercise: 'Back Squat', sets: 3, reps: 5, weight: 200 },
  )
  const report = clientReport(db, 'a', '2026-09-30', 28, '2026-09-30')
  assert.deepEqual(report.lifts.map((lift) => [lift.id, lift.points.length]), [['resistance:back squat', 2], ['workout:back squat', 1]])
  assert.equal(report.lifts[0].points[1].estimate, 87.5)
  assert.equal(report.lifts[0].points[1].source, 'Coach manual')
  assert.equal(report.working.totalSets, 1)
  assert.equal(report.totalKnownVolume, 480)
})

test('report choices remain client-owned in the existing intake shape', () => {
  const first = reportPreferences({ intake: { reportPreferences: { note: 'Keep going', sections: { body: true, exposure: false } } } })
  const second = reportPreferences({})
  assert.equal(first.note, 'Keep going')
  assert.equal(first.sections.body, true)
  assert.equal(first.sections.exposure, false)
  assert.equal(first.sections.outcomes, true)
  assert.equal(second.note, '')
  assert.equal(second.sections.body, false)
})
