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
const { clientSectionPath, loadProgressPath, assessmentCanonicalPath } = await load('lib/clientRoutes.js')
const { logWorkoutCheckin, completeClassicWorkout } = await load('lib/classicWorkflow.js')
const { saveAssessmentRecord } = await load('lib/assessmentWrite.js')
const { getWorkoutDraft, setWorkoutDraft, clearWorkoutDraft } = await load('lib/workoutDraft.js')
const { removeWorkoutStrength, absolute1RM } = await load('lib/program.js')
const { dailySum, dayMetrics, readinessFor } = await load('lib/calc.js')
const { forClient, formalAssessments } = await load('lib/assessment.js')
const { compareToObservedBand, observedReferenceBand, trailingObservedBands } = await load('lib/progress.js')
const { performedLiftHistory, performedLiftOptions } = await load('lib/performedLifts.js')
const { loadResponseRows, pairedResponsePoints, responseSeries } = await load('lib/loadResponse.js')
const { addDays, todayISO } = await load('lib/dates.js')
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
const { muscleVolume, reviewMuscleSet } = await load('lib/muscleVolume.js')
const { setRowFromPrescribed, ensureSetRows, summarize: summarizeWorkout } = await load('lib/workout.js')
const { default: RPEModal } = await load('components/organisms/workout/RPEModal.jsx')

test('simulated workout heart rate is not reported as measured or used to suggest RPE', () => {
  const oldSession = { durationSec: 1800, hrAvg: 124, hrMax: 128, main: [] }
  const result = summarizeWorkout(oldSession)
  assert.equal(result.avg, null)
  assert.equal(result.peak, null)
  assert.equal(result.energy, null)
  assert.equal(result.trimp, 0)
  assert.equal(result.strain, 0)
  assert.equal(result.hrr, null)
  const modal = renderToStaticMarkup(React.createElement(RPEModal, { workout: oldSession }))
  assert.match(modal, /Choose your rating/)
  assert.match(modal, /Select an RPE to calculate/)
  assert.doesNotMatch(modal, /suggested.*peak HR/)
  assert.match(modal, /disabled=""[^>]*>Save &amp; finish/)
})

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
  assert.equal(loadProgressPath('b', '?view=load&range=28', '#history'), '/clients/b/progress?range=28#history')
  assert.equal(loadProgressPath('b', '?tab=objective'), '/clients/b/progress#training-load')
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
    ['/clients/a/check-ins?view=wellness', 'Check-ins'],
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
  assert.equal(loaded.exercises.find((exercise) => exercise.name === 'Bench Press').id, 'catalog:coach:strength:bench%20press')
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
  const load = renderClientPage('/clients/a/progress#training-load', db, ClientProgressPage)
  const outcomes = renderClientPage('/clients/a/progress#outcomes', db, ClientProgressPage)
  assert.match(wellness, /No wellness observations yet/)
  assert.match(wellness, /No check-in or wearable reading recorded yet/)
  assert.doesNotMatch(wellness, /Training load/)
  assert.match(load, /Load response/)
  assert.match(load, /No recorded values for this selection/)
  assert.match(load, /No session RPE in the past 28 days/)
  assert.equal((load.match(/Not available/g) || []).length, 3)
  assert.equal((load.match(/<small class="progress-derived-trend">— No comparison<\/small>/g) || []).length, 3)
  assert.match(load, /Unlogged days are unknown/)
  assert.doesNotMatch(load, /Data coverage/)
  assert.doesNotMatch(load, /No body composition assessment yet/)
  assert.match(outcomes, /No body composition assessment yet/)
  assert.match(outcomes, /No formal fitness assessment yet/)
  assert.doesNotMatch(outcomes, /Load response/)
  assert.doesNotMatch(wellness + load + outcomes, /Blair/)
})

test('load cards keep comparison short while exposing sparse and stale details to assistive technology', () => {
  const date = todayISO('UTC')
  const sparse = fixture()
  sparse.srpe.push({ id: 'a-one', clientId: 'a', date, rpe: 5, duration: 30, tl: 150, source: 'Coach manual' })
  const sparsePage = renderClientPage('/clients/a/progress#training-load', sparse, ClientProgressPage)
  assert.match(sparsePage, /Not available/)
  assert.match(sparsePage, /1\/3 positive-load days needed by the existing 28-day calculation/)
  assert.match(sparsePage, /1\/7 days logged; other days unconfirmed/)
  assert.match(sparsePage, /<small class="progress-derived-trend">— Baseline unavailable<\/small>/)

  const zero = fixture()
  zero.srpe.push({ id: 'a-zero', clientId: 'a', date, rpe: 0, duration: 30, tl: 0, source: 'Coach manual' })
  const zeroPage = renderClientPage('/clients/a/progress#training-load', zero, ClientProgressPage)
  assert.equal((zeroPage.match(/Not available/g) || []).length, 3)
  assert.match(zeroPage, /No variation in the 7-day daily loads/)
  assert.match(zeroPage, /7-day monotony is unavailable/)

  const stale = fixture()
  stale.srpe.push({ id: 'a-old', clientId: 'a', date: addDays(date, -30), rpe: 5, duration: 30, tl: 150, source: 'Coach manual' })
  const stalePage = renderClientPage('/clients/a/progress#training-load', stale, ClientProgressPage)
  assert.equal((stalePage.match(/Not available/g) || []).length, 3)
  assert.match(stalePage, /No session RPE in the past 28 days/)
})

test('Progress owns dated load history and excludes another client', () => {
  const db = fixture()
  db.srpe.push(
    { id: 'a-load', clientId: 'a', date: '2026-09-24', rpe: 5, duration: 30, tl: 150, source: 'Coach manual' },
    { id: 'b-load', clientId: 'b', date: '2026-09-23', rpe: 10, duration: 90, tl: 900, source: 'Blair-only source' },
  )
  const progress = renderClientPage('/clients/a/progress', db, ClientProgressPage)
  const load = renderClientPage('/clients/a/progress#training-load', db, ClientProgressPage)
  for (const section of ['strength', 'training-load', 'outcomes', 'attendance']) {
    assert.match(progress, new RegExp(`role="tab" id="${section}"`))
    assert.match(progress, new RegExp(`id="progress-panel-${section}"`))
  }
  assert.equal((progress.match(/id="training-load"/g) || []).length, 1)
  assert.match(progress, /id="strength" aria-selected="true"/)
  assert.match(load, /id="training-load" aria-selected="true"/)
  assert.match(load, /150 AU/)
  assert.match(load, /Coach manual/)
  assert.match(load, /Load calculations/)
  assert.doesNotMatch(load, /Muscle volume|Assign muscles/)
  assert.match(load, /<details class="load-response-settings"><summary>/)
  assert.match(load, /Customize chart/)
  assert.match(load, /X-axis<select/)
  assert.equal((load.match(/class="progress-derived-card"/g) || []).length, 3)
  assert.match(load, /ACWR/)
  assert.match(load, /Monotony/)
  assert.match(load, /Strain/)
  assert.doesNotMatch(load, /Show dated table view/)
  assert.ok(load.indexOf('Load calculations') < load.indexOf('Load response'))
  assert.match(load, /Open ACWR graph and table/)
  assert.doesNotMatch(load, /Advanced load calculations/)
  assert.doesNotMatch(load, /900 AU|Blair-only source/)
  assert.doesNotMatch(progress, /150 AU|No body composition assessment yet/)
  assert.match(renderClientPage('/clients/a/progress#history', db, ClientProgressPage), /150 AU/)
  const completion = renderClientPage('/clients/a/progress#attendance', db, ClientProgressPage)
  assert.match(completion, /Booked session completion/)
  assert.doesNotMatch(completion, /150 AU|No body composition assessment yet/)
  const srpeDetail = renderRoutedSection('/clients/a/metric/srpetl', db)
  assert.match(srpeDetail, /Back to Training load/)
  assert.match(srpeDetail, /href="\/clients\/a\/progress#training-load"/)
})

test('Strength selects only this client’s completed lifts and groups recorded work', () => {
  const db = fixture()
  db.workouts.push(
    { id: 'done-a', clientId: 'a', date: '2026-09-24', status: 'completed', main: [
      { name: 'Power Clean', blockType: 'Main Lifts', setRows: [{ done: true, load: 50, reps: 3 }, { done: false, load: 60, reps: 2 }] },
      { name: 'Bench Press', blockType: 'Main Lifts', setRows: [{ done: true, load: 75, reps: 5 }] },
      { name: 'Cable Curl', blockType: 'Assisted', setRows: [{ done: true, load: 12, reps: 10 }] },
      { name: 'Deadlift', blockType: 'Main Lifts', setRows: [{ done: false, load: 100, reps: 5 }] },
    ] },
    { id: 'planned-a', clientId: 'a', date: '2026-09-25', status: 'suggested', main: [{ name: 'Snatch', done: true }] },
    { id: 'done-b', clientId: 'b', date: '2026-09-24', status: 'completed', main: [{ name: 'Blair Lift', done: true, doneWeight: 90, doneReps: 5 }] },
  )
  db.resistance.push({ id: 'r-a', clientId: 'a', date: '2026-09-23', exercise: 'Lateral Raise', sets: 3, reps: 12, weight: 8, source: 'Coach manual' })
  db.maxes.push({ id: 'manual-a', clientId: 'a', date: '2026-09-24', exercise: 'Unperformed Lift', kind: 'e1rm', valueKg: 120, source: 'manual' })
  const options = performedLiftOptions(db, 'a')
  assert.deepEqual(options, [
    { name: 'Power Clean', group: 'Power Ballistic' },
    { name: 'Bench Press', group: 'Main Lift' },
    { name: 'Cable Curl', group: 'Accessory Lifts' },
    { name: 'Lateral Raise', group: 'Accessory Lifts' },
  ])
  assert.deepEqual(performedLiftHistory(db, 'a').filter((row) => row.name === 'Power Clean').map(({ loadKg, reps, sets }) => ({ loadKg, reps, sets })), [{ loadKg: 50, reps: 3, sets: 1 }])
  const html = renderClientPage('/clients/a/progress', db, ClientProgressPage)
  assert.match(html, /Performed lift <select/)
  assert.match(html, /<optgroup label="Power Ballistic">/)
  assert.match(html, /<optgroup label="Main Lift">/)
  assert.match(html, /<optgroup label="Accessory Lifts">/)
  const selector = html.match(/<label class="progress-lift-select">[\s\S]*?<\/label>/)?.[0]
  assert.doesNotMatch(selector, /Unperformed Lift|Blair Lift/)
  assert.match(html, /Unperformed Lift.*1RM record only/)
  assert.doesNotMatch(html, /Blair Lift|Track lift|Lift to track/)
})

test('load graph band uses earlier observed values and withholds sparse baselines', () => {
  assert.equal(observedReferenceBand([1, 2, 3]), null)
  assert.deepEqual(observedReferenceBand([1, 2, 3, 4]), { lower: 1.75, upper: 3.25, count: 4 })
  assert.deepEqual(observedReferenceBand([4, null, 1, 3, 2]), { lower: 1.75, upper: 3.25, count: 4 })
  const observations = [1, 2, 3, 4, 100].map((value, index) => ({ date: `2026-09-${String(index + 1).padStart(2, '0')}`, value }))
  const bands = trailingObservedBands(observations, 'value', ['2026-09-04', '2026-09-05'])
  assert.equal(bands[0], null, 'current and future observations must not define a past baseline')
  assert.deepEqual(bands[1], { lower: 1.75, upper: 3.25, count: 4 })
  assert.deepEqual(trailingObservedBands(observations, 'value', ['2026-09-05'])[0], bands[1], 'displayed date range must not change a dated baseline')
  assert.equal(compareToObservedBand(4, bands[1]), 'above')
  assert.equal(compareToObservedBand(1, bands[1]), 'below')
  assert.equal(compareToObservedBand(2, bands[1]), 'within')
  assert.equal(compareToObservedBand(3.25, bands[1]), 'within')
  assert.equal(compareToObservedBand(4, null), 'unavailable')
  assert.equal(compareToObservedBand(null, bands[1]), 'unavailable')
})

test('Load response aligns same-day metrics and rolling means preserve missing dates', () => {
  const db = fixture()
  db.srpe.push(
    { id: 'a1', clientId: 'a', date: '2026-09-01', tl: 100, rpe: 5, duration: 20, source: 'Coach manual' },
    { id: 'a2', clientId: 'a', date: '2026-09-03', tl: 200, rpe: 10, duration: 20, source: 'Workout completion' },
    { id: 'b1', clientId: 'b', date: '2026-09-03', tl: 900, rpe: 10, duration: 90, source: 'Blair only' },
  )
  db.wearable.push(
    { id: 'h1', clientId: 'a', date: '2026-09-03', hrv: 50, source: 'Manual wearable' },
    { id: 'h2', clientId: 'a', date: '2026-09-05', hrv: 60, source: 'Manual wearable' },
  )
  const rows = loadResponseRows(db, 'a', '2026-09-05', 5)
  const load = responseSeries(rows, 'load')
  const rolling = responseSeries(rows, 'load', 7)
  const hrv = responseSeries(rows, 'hrv')
  assert.deepEqual(load.map((point) => point.value), [100, null, 200, null, null])
  assert.deepEqual(rolling.map((point) => point.value), [100, null, 150, null, null])
  assert.equal(rolling[2].count, 2)
  assert.deepEqual(pairedResponsePoints(rows, load, hrv).map((point) => ({ date: point.date, x: point.x, y: point.y })), [
    { date: '2026-09-03', x: 200, y: 50 },
  ])
  assert.doesNotMatch(JSON.stringify(rows), /900|Blair only/)
  assert.equal(rows[2].sources.load, 'Workout completion')
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

test('Training load renders the live muscle map with client-owned working sets and missing-data coverage', () => {
  const db = fixture(), date = todayISO('UTC')
  db.exercises = [{ id: 'squat', name: 'Verified squat', muscleTargets: { direct: ['Quadriceps', 'Glutes'], indirect: ['Abdominals'] } }]
  const w = { id: 'w', clientId: 'a', date, status: 'completed', main: [{ id: 'e', name: 'Verified squat', exId: 'squat', blockType: 'Main Lifts', setRows: [
    { purpose: 'working', done: true, reps: 5, load: 80 }, { purpose: 'working', done: true, reps: null, load: 80 }, { purpose: 'warmup', done: true, reps: 10, load: 20 },
  ] }] }
  db.workouts = [w, { ...w, id: 'other', clientId: 'b', main: [{ name: 'Private other lift', done: true, doneSets: 6 }] }]
  const html = renderClientPage('/clients/a/progress#training-load', db, ClientProgressPage)
  assert.match(html, /Weekly muscle volume/)
  assert.match(html, /Quadriceps: 2 direct sets/)
  assert.match(html, /1\/2 with known volume load/)
  assert.doesNotMatch(html, /Verified squat/)
  assert.doesNotMatch(html, /Private other lift/)
  assert.match(html, /muscle-body-outline/)
  assert.match(html, /Muscle-volume week containing/)
  const empty = renderClientPage('/clients/b/progress#training-load', { ...db, workouts: [] }, ClientProgressPage)
  assert.match(empty, /No classified working sets for this week/)
})

test('muscle classification persists and reloads through workout JSON without changing recorded actuals', async () => {
  const prev = fixture()
  prev.exercises = [{ id: 'bench', name: 'Bench Press', muscleTargets: { direct: ['Chest'], indirect: [] } }]
  prev.workouts = [{ id: 'w', clientId: 'a', date: '2026-09-22', status: 'completed', main: [{ id: 'e', name: 'Bench Press', setRows: [{ done: true, reps: 8, load: 30 }] }] }]
  const next = structuredClone(prev)
  const report = muscleVolume(next, 'a', '2026-09-21', '2026-09-27', { workingOnly: true })
  assert.equal(reviewMuscleSet(next, 'a', report.excluded[0], 'Accessory Lift', 'working'), true)
  const backend = fakeBackend()
  assert.deepEqual(await persistDiff(prev, next, backend.client), [])
  assert.deepEqual(backend.calls.map((c) => c.table), ['workouts'])
  const persisted = backend.calls[0].data[0]
  assert.deepEqual(persisted.main[0].setRows[0], { done: true, reps: 8, load: 30, purpose: 'working' })
  const reloaded = { ...next, workouts: JSON.parse(JSON.stringify([persisted])) }
  assert.equal(muscleVolume(reloaded, 'a', '2026-09-21', '2026-09-27', { workingOnly: true }).muscles[0].volume, 240)
  const denied = fakeBackend({}, { 'upsert:workouts': { message: 'write denied' } })
  assert.equal((await persistDiff(prev, next, denied.client))[0].table, 'workouts')
})

test('new logging rows support warm-up purpose without silently relabeling existing set rows', () => {
  assert.equal(setRowFromPrescribed({ purpose: 'warmup' }).purpose, 'warmup')
  assert.equal(setRowFromPrescribed({}).purpose, 'working')
  assert.equal(ensureSetRows({ sets: 2 })[0].purpose, 'working')
  assert.equal(ensureSetRows({ setRows: [{ done: true, reps: 5, load: 20 }] })[0].purpose, undefined)
})
