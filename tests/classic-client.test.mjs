import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const load = (path) => vite.ssrLoadModule(`/src/${path}`)
const { TABLES } = await load('lib/supabase.js')
const { fetchAll, persistDiff } = await load('api/sync.js')
const { clientSectionPath, assessmentCanonicalPath } = await load('lib/clientRoutes.js')
const { logWorkoutCheckin, completeClassicWorkout } = await load('lib/classicWorkflow.js')
const { saveAssessmentRecord } = await load('lib/assessmentWrite.js')
const { getWorkoutDraft, setWorkoutDraft, clearWorkoutDraft } = await load('lib/workoutDraft.js')
const { removeWorkoutStrength, absolute1RM } = await load('lib/program.js')
const { dailySum, dayMetrics, readinessFor } = await load('lib/calc.js')
const { forClient, formalAssessments } = await load('lib/assessment.js')
const { DataProvider } = await load('store/DataContext.jsx')
const { default: ClientLayout } = await load('components/templates/ClientLayout.jsx')
const { default: SchemaWarning } = await load('components/organisms/SchemaWarning.jsx')
const { ModalProvider } = await load('store/ModalContext.jsx')
const { ClipboardProvider } = await load('store/ClipboardContext.jsx')
const { default: ClientDetailPage } = await load('pages/ClientDetailPage.jsx')
const { default: ClientTrainingPage } = await load('pages/ClientTrainingPage.jsx')
const { default: MonitorPage } = await load('pages/MonitorPage.jsx')
const { default: ClientProgressPage } = await load('pages/ClientProgressPage.jsx')
const { default: AssessmentsPage } = await load('pages/AssessmentsPage.jsx')
const { default: AssessmentDetailPage } = await load('pages/AssessmentDetailPage.jsx')
const { default: ClientProfilePage } = await load('pages/ClientProfilePage.jsx')
const { default: MetricDetailPage } = await load('pages/MetricDetailPage.jsx')

const fixture = () => ({
  ...Object.fromEntries(TABLES.map((table) => [table, []])),
  clients: [
    { id: 'a', name: 'Avery', goal: 'Get stronger', anthro: {}, trackedLifts: ['Squat'] },
    { id: 'b', name: 'Blair', goal: 'Run farther', anthro: {}, trackedLifts: [] },
  ],
  settings: { trainerName: 'Coach', units: 'kg', tz: 'UTC' },
})

function fakeBackend(rows = {}, errors = {}) {
  const calls = []
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'coach' } } }) },
    from(table) {
      return {
        select() {
          const response = { data: rows[table] || [], error: errors[`read:${table}`] || null }
          return { then: (ok, fail) => Promise.resolve(response).then(ok, fail), maybeSingle: async () => ({ data: rows.settings || null }) }
        },
        async upsert(data) { calls.push({ table, kind: 'upsert', data }); return { error: errors[`upsert:${table}`] || null } },
        delete() { return { in: async (_column, ids) => { calls.push({ table, kind: 'delete', ids }); return { error: errors[`delete:${table}`] || null } } } },
      }
    },
  }
  return { client, calls }
}

function renderWorkspace(path, db) {
  return renderToStaticMarkup(React.createElement(DataProvider, { initialDb: db },
    React.createElement(MemoryRouter, { initialEntries: [path] },
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/clients/:id', element: React.createElement(ClientLayout) },
          React.createElement(Route, { index: true, element: React.createElement('h1', null, 'Overview content') }),
          React.createElement(Route, { path: 'training', element: React.createElement('h1', null, 'Training content') }),
          React.createElement(Route, { path: 'check-ins', element: React.createElement('h1', null, 'Check-in content') }),
        ),
      ),
    ),
  ))
}

function renderClientPage(path, db, Page) {
  return renderToStaticMarkup(React.createElement(DataProvider, { initialDb: db },
    React.createElement(ModalProvider, null,
      React.createElement(MemoryRouter, { initialEntries: [path] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/clients/:id/*', element: React.createElement(Page) }),
        ),
      ),
    ),
  ))
}

function renderRoutedSection(path, db) {
  return renderToStaticMarkup(React.createElement(DataProvider, { initialDb: db },
    React.createElement(ModalProvider, null,
      React.createElement(ClipboardProvider, null,
        React.createElement(MemoryRouter, { initialEntries: [path] },
          React.createElement(Routes, null,
            React.createElement(Route, { path: '/clients/:id', element: React.createElement(ClientLayout) },
              React.createElement(Route, { index: true, element: React.createElement(ClientDetailPage) }),
              React.createElement(Route, { path: 'training', element: React.createElement(ClientTrainingPage) }),
              React.createElement(Route, { path: 'progress', element: React.createElement(ClientProgressPage) }),
              React.createElement(Route, { path: 'check-ins', element: React.createElement(MonitorPage) }),
              React.createElement(Route, { path: 'assessments', element: React.createElement(AssessmentsPage) }),
              React.createElement(Route, { path: 'assessments/:type', element: React.createElement(AssessmentDetailPage) }),
              React.createElement(Route, { path: 'profile', element: React.createElement(ClientProfilePage) }),
              React.createElement(Route, { path: 'profile/:type', element: React.createElement(AssessmentDetailPage) }),
              React.createElement(Route, { path: 'metric/:metric', element: React.createElement(MetricDetailPage) }),
            ),
          ),
        ),
      ),
    ),
  ))
}

test('legacy and assessment routes preserve client, query, and anchor', () => {
  assert.equal(clientSectionPath('a', 'training', '?date=2026-09-24', '#session'), '/clients/a/training?date=2026-09-24#session')
  assert.equal(clientSectionPath('b', 'check-ins', '?view=load', '#history'), '/clients/b/check-ins?view=load#history')
  assert.equal(assessmentCanonicalPath('a', 'goals', '/clients/a/assessments/goals', '?x=1', '#record'), '/clients/a/profile/goals?x=1#record')
  assert.equal(assessmentCanonicalPath('a', 'fitness', '/clients/a/profile/fitness', '', '#history'), '/clients/a/assessments/fitness#history')
  assert.equal(assessmentCanonicalPath('a', 'fitness', '/clients/a/assessments/fitness'), null)
})

test('workspace navigation uses normal links, marks the current page, and isolates clients', () => {
  const db = fixture()
  const html = renderWorkspace('/clients/a/training', db)
  assert.match(html, /Avery/)
  assert.doesNotMatch(html, /Blair/)
  assert.match(html, /aria-current="page"[^>]*href="\/clients\/a\/training"/)
  assert.doesNotMatch(html, /aria-current="page"[^>]*href="\/clients"/)
  assert.match(html, /href="\/clients\/a\/check-ins"/)
  assert.match(html, /Training content/)
  assert.doesNotMatch(html, /role="tab"/)
  assert.match(renderWorkspace('/clients/b', db), /Blair/)
  assert.match(renderWorkspace('/clients/missing', db), /Client unavailable/)
})

test('all six routed Classic sections render for the selected client', () => {
  const db = fixture()
  for (const [path, heading] of [
    ['/clients/a', 'Overview'],
    ['/clients/a/training?date=2026-09-24', 'Training'],
    ['/clients/a/progress', 'Progress'],
    ['/clients/a/check-ins?view=wellness', 'Check-ins &amp; load'],
    ['/clients/a/assessments', 'Assessments'],
    ['/clients/a/profile', 'Profile'],
  ]) {
    const html = renderRoutedSection(path, db)
    assert.match(html, new RegExp(`<h1[^>]*>${heading}<\\/h1>`), path)
    assert.match(html, /Avery/, path)
    assert.doesNotMatch(html, /Blair/, path)
  }
})

test('formal and profile assessment history routes retain their owning section', () => {
  const db = fixture()
  const fitness = renderRoutedSection('/clients/a/assessments/fitness', db)
  const goals = renderRoutedSection('/clients/a/profile/goals', db)
  assert.match(fitness, /All assessments/)
  assert.match(fitness, /class="back"[^>]*href="\/clients\/a\/assessments"/)
  assert.match(fitness, /No fitness recorded yet/)
  assert.match(goals, /← Profile/)
  assert.match(goals, /class="back"[^>]*href="\/clients\/a\/profile"/)
  assert.match(goals, /recorded yet/)
  assert.doesNotMatch(fitness + goals, /Blair/)
})

test('trainer shortcuts to routed destinations are links', () => {
  const db = fixture()
  const overview = renderRoutedSection('/clients/a', db)
  const training = renderRoutedSection('/clients/a/training', db)
  assert.match(overview, /href="\/clients\/a\/training"[^>]*>Plan a session/)
  assert.match(overview, /href="\/clients\/a\/check-ins"[^>]*>View check-ins/)
  assert.match(training, /href="\/workouts"[^>]*>Programme library/)
})

test('legacy readiness detail keeps neutral wording and one shared client identity', () => {
  const html = renderRoutedSection('/clients/a/metric/readiness', fixture())
  assert.match(html, /Dated app summary of available wellness and HRV inputs; not clearance/)
  assert.equal((html.match(/role="img" aria-label="Avery"/g) || []).length, 1)
  assert.doesNotMatch(html, /🟢/)
})

test('backend loading and error states are explicit', () => {
  const loading = renderToStaticMarkup(React.createElement(DataProvider, { backend: true, initialDb: null }, 'Loaded'))
  const error = renderToStaticMarkup(React.createElement(DataProvider, { backend: true, initialDb: null, initialError: new Error('offline') }, 'Loaded'))
  assert.match(loading, /Loading your athletes/)
  assert.match(error, /Couldn’t load your data/)
  assert.match(error, /offline/)
  assert.match(error, />Retry</)
})

test('table failures remain visible and Overview labels observation provenance', () => {
  const db = fixture()
  db._loadIssues = [{ table: 'wearable', message: 'Unavailable' }]
  db.wellness.push({ id: 'wa', clientId: 'a', date: '2026-09-24', sleep: 5, stress: 3, fatigue: 3, soreness: 3, score: 22, source: 'Coach manual' })
  db.wearable.push({ id: 'ra', clientId: 'a', date: '2026-09-23', hrv: 55, source: 'Demo band' })
  db.sessions.push({ id: 'other-booking', clientId: 'b', date: '2026-09-24', time: '09:00', status: 'Completed', type: 'Blair-only booking' })
  const warning = renderToStaticMarkup(React.createElement(DataProvider, { initialDb: db }, React.createElement(SchemaWarning)))
  const overview = renderRoutedSection('/clients/a', db)
  assert.match(warning, /role="alert"/)
  assert.match(warning, /Some records may be missing/)
  assert.match(overview, /Coach manual/)
  assert.match(overview, /Demo band/)
  assert.doesNotMatch(overview, /Blair-only booking/)
  assert.doesNotMatch(overview, /Blair/)
})

test('backend load surfaces missing tables; diff writes only changed rows and reports failure', async () => {
  const { client } = fakeBackend({ clients: [{ id: 'a', name: 'Avery', coachId: 'private' }] }, { 'read:wearable': { message: 'missing table' } })
  const loaded = await fetchAll(client)
  assert.equal(loaded.clients[0].coachId, undefined)
  assert.deepEqual(loaded._loadIssues, [{ table: 'wearable', message: 'missing table' }])
  const prev = fixture()
  const next = structuredClone(prev)
  next.wellness.push({ id: 'w1', clientId: 'a', date: '2026-09-24', score: 20 })
  const backend = fakeBackend({}, { 'upsert:wellness': { message: 'write denied' } })
  const issues = await persistDiff(prev, next, backend.client)
  assert.deepEqual(backend.calls, [{ table: 'wellness', kind: 'upsert', data: next.wellness }])
  assert.deepEqual(issues, [{ table: 'wellness', message: 'write denied', kind: 'write' }])
})

test('empty Check-ins and Progress views disclose missing observations for the selected client', () => {
  const db = fixture()
  const wellness = renderClientPage('/clients/a/check-ins', db, MonitorPage)
  const load = renderClientPage('/clients/a/check-ins?view=load', db, MonitorPage)
  const progress = renderClientPage('/clients/a/progress', db, ClientProgressPage)
  assert.match(wellness, /No wellness observations yet/)
  assert.match(wellness, /No check-in or wearable reading recorded yet/)
  assert.match(load, /No session effort recorded yet/)
  assert.match(load, /Blank days are unlogged/)
  assert.match(progress, /No body composition assessment yet/)
  assert.match(progress, /No formal fitness assessment yet/)
  assert.doesNotMatch(wellness + load + progress, /Blair/)
})

test('check-in and workout completion write dated source, load, and client-specific strength history', () => {
  const db = fixture()
  db.maxes.push({ id: 'other', clientId: 'b', exercise: 'Squat', date: '2026-09-20', kind: 'e1rm', valueKg: 200 })
  const workout = { id: 'session-a', clientId: 'a', date: '2026-09-24', status: 'in_progress', main: [
    { name: 'Squat', setRows: [{ done: true, load: 100, reps: 5 }] },
  ] }
  logWorkoutCheckin(db, 'a', { date: workout.date, sleep: 5, stress: 3, fatigue: 3, soreness: 3, score: 22 }, workout)
  assert.equal(db.wellness[0].source, 'Coach workout check-in')
  assert.equal(readinessFor(db, 'a').date, workout.date)
  assert.equal(readinessFor(db, 'b').score, null)
  const peaks = completeClassicWorkout(db, 'a', workout, 7, 45)
  assert.equal(db.workouts[0].status, 'completed')
  assert.equal(db.workouts[0].durationSec, 2700)
  assert.deepEqual(db.srpe.map(({ clientId, date, tl, source }) => ({ clientId, date, tl, source })), [
    { clientId: 'a', date: workout.date, tl: 315, source: 'Workout completion' },
  ])
  assert.equal(dailySum(db.srpe, 'a', 'tl')[workout.date], 315)
  assert.deepEqual(dailySum(db.srpe, 'b', 'tl'), {})
  assert.equal(dayMetrics(db, 'a', workout.date).acwr, null, 'sparse load must not imply a ratio')
  assert.equal(peaks[0].tracked, true)
  assert.equal(absolute1RM(db.maxes, 'a', 'Squat', workout.date), 116.7)
  assert.equal(db.maxes.find((row) => row.id === 'other').valueKg, 200)
  assert.equal(forClient(db.assessments, 'a').length, 1)
  assert.equal(forClient(db.assessments, 'b').length, 0)
  removeWorkoutStrength(db, workout.id)
  assert.equal(absolute1RM(db.maxes, 'a', 'Squat', workout.date), null)
  assert.equal(db.maxes.find((row) => row.id === 'other').valueKg, 200)
})

test('skipping RPE does not invent training load; cross-client completion is rejected', () => {
  const db = fixture()
  const workout = { id: 'session-a', clientId: 'a', date: '2026-09-24', main: [] }
  assert.throws(() => logWorkoutCheckin(db, 'b', { date: workout.date }, workout), /another client/)
  assert.equal(db.wellness.length, 0)
  assert.throws(() => completeClassicWorkout(db, 'b', workout, 5, 30), /another client/)
  assert.equal(db.workouts.length, 0)
  completeClassicWorkout(db, 'a', workout, null, 30)
  assert.equal(db.srpe.length, 0)
  assert.equal(db.workouts[0].status, 'completed')
})

test('unsaved set drafts stay with one client and workout until saved or discarded', () => {
  const a = { id: 'shared-id', clientId: 'a' }
  const b = { id: 'shared-id', clientId: 'b' }
  const draft = { setRows: [{ load: 80, reps: 5 }] }
  setWorkoutDraft(a, 'run', draft)
  assert.deepEqual(getWorkoutDraft(a, 'run'), draft)
  assert.equal(getWorkoutDraft(a, 'edit'), null)
  assert.equal(getWorkoutDraft(b, 'run'), null)
  clearWorkoutDraft(a, 'run')
  assert.equal(getWorkoutDraft(a, 'run'), null)
})

test('assessment create and edit preserve provenance and never alter another client', () => {
  const db = fixture()
  const form = { date: '2026-09-24', phase: 'baseline', notes: '  First test  ' }
  const saved = saveAssessmentRecord(db, { clientId: 'a', type: 'fitness', form, data: { strength: [{ lift: 'Squat', valueKg: 110 }] } })
  db.assessments.push({ id: 'b-test', clientId: 'b', type: 'fitness', date: '2026-09-22', phase: 'baseline', data: { source: 'Coach entry' } })
  assert.equal(saved.data.source, 'Coach entry')
  assert.equal(saved.notes, 'First test')
  assert.equal(formalAssessments(forClient(db.assessments, 'a')).length, 1)
  assert.equal(saveAssessmentRecord(db, { clientId: 'a', type: 'fitness', record: db.assessments[1], form, data: {} }), null)
  saveAssessmentRecord(db, { clientId: 'a', type: 'fitness', record: saved, form: { ...form, phase: 'reassessment' }, data: { strength: [{ lift: 'Squat', valueKg: 115 }] } })
  assert.equal(db.assessments.length, 2)
  assert.equal(saved.phase, 'reassessment')
  assert.equal(saved.data.source, 'Coach entry')
  assert.equal(db.assessments[1].clientId, 'b')
})

test('Classic flow persists only its changed workout, check-in, load, strength, and assessment rows', async () => {
  const prev = fixture()
  const next = structuredClone(prev)
  const workout = { id: 'w-a', clientId: 'a', date: '2026-09-24', main: [{ name: 'Squat', done: true, doneWeight: 90, doneReps: 5 }] }
  logWorkoutCheckin(next, 'a', { date: workout.date, sleep: 5, stress: 3, fatigue: 3, soreness: 3, score: 22 }, workout)
  completeClassicWorkout(next, 'a', workout, 6, 40)
  const backend = fakeBackend()
  assert.deepEqual(await persistDiff(prev, next, backend.client), [])
  assert.deepEqual(backend.calls.map((call) => call.table).sort(), ['assessments', 'maxes', 'srpe', 'wellness', 'workouts'])
  assert.ok(backend.calls.every((call) => call.data.every((row) => row.clientId === 'a')))
})
