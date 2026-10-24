import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createServer } from 'vite'
import { createHandler, memoryDb } from './helpers/wearable-harness.mjs'
import { assessmentReview, reassessmentDateError, isFormalReviewAssessment } from '../supabase/functions/_shared/assessment-review.js'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const load = path => vite.ssrLoadModule(`/src/${path}`)
const { dueStatus, describe, summarize, compare, movementScore, movementPainFindings, movementPainReports } = await load('lib/assessment.js')
const { gripStrengthTests } = await load('lib/fitnessTests.js')
const { resolveTrainingMax } = await load('lib/program.js')
const { saveAssessmentRecord } = await load('lib/assessmentWrite.js')
const { computeNudges } = await load('lib/nudges.js')
const { clientReviewItems } = await load('lib/dashboard.js')
const { persistDiff } = await load('api/sync.js')
const { DataProvider } = await load('store/DataContext.jsx')
const { ModalProvider } = await load('store/ModalContext.jsx')
const { assessmentForm } = await load('components/organisms/forms/AssessmentForms.jsx')
const { default: AssessmentsPage } = await load('pages/AssessmentsPage.jsx')
const { default: AssessmentDetailPage } = await load('pages/AssessmentDetailPage.jsx')
const { seedBuilderQA } = await load('lib/builderQA.js')

const record = (data = {}, type = 'fitness', extra = {}) => ({ id: 'record-a', clientId: 'local-builder-100', type, date: '2026-10-01', phase: 'baseline', data, ...extra })
function fixture() {
  const db = seedBuilderQA('2026-10-01')
  db.assessments = []
  db.settings = { ...db.settings, reassessIntervalDays: 84 }
  return db
}
function render(node, db = fixture(), route) {
  return renderToStaticMarkup(React.createElement(DataProvider, { initialDb: db, backend: false },
    React.createElement(ModalProvider, null, React.createElement(MemoryRouter, { initialEntries: [route || '/'] },
      route ? React.createElement(Routes, null, React.createElement(Route, { path: '/clients/:id/assessments', element: React.createElement(AssessmentsPage) }), React.createElement(Route, { path: '/clients/:id/assessments/:type', element: React.createElement(AssessmentDetailPage) })) : node))))
}

test('review dates prefer a saved date, distinguish no schedule, and retain labelled legacy defaults', () => {
  assert.deepEqual(assessmentReview(record()), { dueDate: '2026-12-24', kind: 'suggested', intervalDays: 84 })
  assert.equal(assessmentReview(record(), 28).dueDate, '2026-10-29')
  for (const date of ['2026-10-08', '2027-01-14']) {
    assert.deepEqual(assessmentReview(record({ nextReassessmentDate: date }), 7), { dueDate: date, kind: 'scheduled' })
  }
  for (const date of [null, '', '2026-02-30', '2026-10-01']) assert.deepEqual(assessmentReview(record({ nextReassessmentDate: date })), { dueDate: null, kind: 'none' })
  assert.equal(assessmentReview(record({}, 'movement', { date: '2028-02-28' }), 2).dueDate, '2028-03-01')
  assert.equal(assessmentReview(record(), 'invalid').dueDate, '2026-12-24')
  assert.equal(reassessmentDateError('2026-10-01', ''), '')
  assert.match(reassessmentDateError('2026-10-01', '2026-10-01'), /after/)
  assert.match(reassessmentDateError('2026-10-01', '2026-09-30'), /after/)
  assert.match(reassessmentDateError('2026-02-30', '2026-03-15'), /valid assessment date/)
})

test('latest formal record controls reminders, including same-day ties and coach civil date', () => {
  const old = record({ nextReassessmentDate: '2026-10-05' })
  const newer = record({ nextReassessmentDate: null }, 'fitness', { id: 'newer', date: '2026-10-02', createdAt: '2026-10-02T10:00:00Z' })
  const derived = record({ sourceWorkoutId: 'workout' }, 'fitness', { id: 'derived', date: '2026-10-03' })
  assert.equal(dueStatus([old, newer, derived], 'fitness', 84, '2026-10-14').overdue, false)
  newer.data.nextReassessmentDate = '2026-10-14'
  assert.equal(dueStatus([old, newer, derived], 'fitness', 84, '2026-10-13').daysLeft, 1)
  assert.equal(dueStatus([old, newer, derived], 'fitness', 84, '2026-10-14').overdue, true)
  const later = { ...newer, id: 'later', createdAt: '2026-10-02T11:00:00Z', data: { nextReassessmentDate: '2027-01-01' } }
  assert.equal(dueStatus([old, newer, later], 'fitness', 7, '2026-10-14').dueDate, '2027-01-01')
})

test('saved review date stays in assessment JSON through persistence; edits preserve historical posture and ownership', async () => {
  const db = fixture(), before = structuredClone(db)
  const form = { date: '2026-10-01', phase: 'baseline', notes: '', nextReassessmentDate: '2026-11-05' }
  const saved = saveAssessmentRecord(db, { clientId: 'local-builder-100', type: 'fitness', form, data: { posture: 'Historical observation', strength: [] } })
  assert.equal(saved.data.nextReassessmentDate, '2026-11-05')
  const calls = []
  assert.deepEqual(await persistDiff(before, db, { from: table => ({ upsert: async rows => { calls.push({ table, rows }); return {} } }) }), [])
  assert.equal(calls.length, 1)
  assert.equal(calls[0].table, 'assessments')
  assert.equal(calls[0].rows[0].data.nextReassessmentDate, '2026-11-05')
  assert.equal(Object.hasOwn(calls[0].rows[0], 'nextReassessmentDate'), false)
  const reloaded = JSON.parse(JSON.stringify(db))
  const row = reloaded.assessments[0]
  saveAssessmentRecord(reloaded, { clientId: 'local-builder-100', type: 'fitness', record: row, form: { ...form, nextReassessmentDate: '' }, data: { strength: [] } })
  assert.equal(row.data.nextReassessmentDate, null)
  assert.equal(row.data.posture, 'Historical observation')
  assert.equal(row.data.source, 'Coach entry')
  assert.equal(saveAssessmentRecord(reloaded, { clientId: 'another-client', type: 'fitness', record: row, form, data: {} }), null)
  const snapshot = structuredClone(reloaded)
  assert.throws(() => saveAssessmentRecord(reloaded, { clientId: 'local-builder-100', type: 'fitness', record: row, form: { ...form, nextReassessmentDate: '2026-09-01' }, data: {} }), /after/)
  assert.deepEqual(reloaded, snapshot)
})

test('Posture belongs to both movement editors, not Fitness, and recorded text does not invent movement findings', () => {
  const db = fixture()
  const fitness = render(assessmentForm('fitness', 'local-builder-100'), db)
  assert.doesNotMatch(fitness, />Posture</)
  assert.match(fitness, /Mobility/)
  assert.match(fitness, /aria-label="Lift 1"/)
  assert.match(fitness, /aria-label="Test weight kg 1"/)
  assert.match(fitness, /class="asf-lift-metrics"/)
  const namedFitness = render(assessmentForm('fitness', 'local-builder-100', record({ strength: [{ lift: 'Long exercise name with equipment and variation details', weightKg: 40, reps: 5 }] })), db)
  assert.match(namedFitness, /class="asf-lift-name">Long exercise name with equipment and variation details<\/p>/)
  const movementForm = render(assessmentForm('movement', 'local-builder-100'), db)
  assert.match(movementForm, /Overhead Squat Assessment/)
  assert.match(movementForm, /Static posture/)
  assert.ok(movementForm.indexOf('Static posture') < movementForm.indexOf('Overhead Squat Assessment'))
  assert.match(movementForm, /aria-expanded="true"[^>]*><span>▾ Static posture/)
  assert.doesNotMatch(movementForm, /Special \/ mobility tests/)
  for (const rec of [undefined, record({ screens: [{ pattern: 'squat', score: 2, pain: false }], posture: 'Recorded posture' }, 'movement')]) {
    const html = render(assessmentForm('movement', 'local-builder-100', rec), db)
    assert.match(html, />Posture</)
    assert.match(html, /Next reassessment date/)
    if (rec) assert.match(html, /value="Recorded posture"/)
  }
  const bodyForm = render(assessmentForm('body_comp', 'local-builder-100'), db)
  assert.match(bodyForm, /accept="\.pdf,\.png,\.jpg,\.jpeg,\.webp,\.bmp,\.csv,\.tsv,\.xlsx,\.txt"/)
  assert.match(bodyForm, /download="body-composition-template.csv"/)
  const movement = record({ protocol: 'nasm', findings: {}, posture: 'Posture note' }, 'movement')
  assert.ok(describe(movement).some(r => r.label === 'Posture' && r.value === 'Posture note'))
  assert.equal(movementScore(movement.data).findings, 0)
  for (const type of ['fitness', 'movement', 'body_comp']) {
    const html = render(assessmentForm(type, 'local-builder-100', record({ nextReassessmentDate: '2026-11-05' }, type)), db)
    assert.match(html, /Next reassessment date/)
    assert.match(html, /value="2026-11-05"/)
    assert.match(html, /Use 84-day default/)
  }
})

test('movement pain retains flagged sides and notes without inventing a pain severity', () => {
  const findings = movementPainFindings({ protocol: 'nasm', findings: {
    kneesValgus: { l: true, r: true, pain: true, severity: 'marked', note: 'Pain on descent' },
    forwardLean: { mid: true, pain: true },
    shoulderElevation: { pain: true, l: false, r: false },
    pesPlanus: { l: true, pain: false },
  } })
  assert.equal(findings.length, 2)
  assert.equal(findings[0].side, 'Left & Right')
  assert.equal(findings[0].note, 'Pain on descent')
  assert.match(findings[0].label, /Knee.*valgus/)
  assert.equal(findings[1].side, '')
  assert.ok(findings.every(finding => !Object.hasOwn(finding, 'severity')))
  assert.deepEqual(movementPainFindings({ screens: [{ pattern: 'squat', score: 1, pain: true }, { pattern: 'hinge', score: 2, pain: false }] }), [{ id: 'squat-0', label: 'Squat', side: '', note: '' }])
  assert.deepEqual(movementPainFindings(), [])
})

test('Pain card and pain history include saved movement pain and follow edits, later screens and removal', async () => {
  const db = fixture()
  const old = record({ screens: [{ pattern: 'squat', score: 1, pain: true }] }, 'movement', { id: 'old-pain-screen' })
  const current = record({ protocol: 'nasm', findings: { kneesValgus: { l: true, pain: true, severity: 'marked', note: 'QA knee discomfort' } } }, 'movement', { id: 'current-pain-screen', date: '2026-10-20', createdAt: '2026-10-20T08:00:00Z' })
  const manual = record({ sites: [{ area: 'Wrist', severity: 4 }] }, 'pain', { id: 'manual-pain', date: '2026-10-19' })
  const foreign = record({ protocol: 'nasm', findings: { kneesValgus: { l: true, pain: true, note: 'PRIVATE OTHER CLIENT' } } }, 'movement', { id: 'foreign', clientId: 'another-client', date: '2026-10-21' })
  db.assessments = [old, current, manual, foreign]
  const route = '/clients/local-builder-100/assessments'
  let html = render(null, db, route)
  assert.match(html, /1 pain flag · Movement screen · Oct 20, 2026/)
  assert.match(html, /QA knee discomfort/)
  assert.match(html, /Knee.*Left/)
  assert.match(html, /1 site · Oct 19, 2026/)
  assert.match(html, /History · 3 →/)
  assert.match(html, /assessments\/movement\?record=current-pain-screen/)
  assert.doesNotMatch(html, /PRIVATE OTHER CLIENT/)
  let history = render(null, db, `${route}/pain?record=manual-pain`)
  assert.match(history, /Pain reported in movement screens/)
  assert.match(history, /QA knee discomfort/)
  assert.match(history, /Earlier movement screen/)
  assert.match(history, /Latest movement screen/)
  assert.match(history, /4\/10/)
  assert.doesNotMatch(history, /PRIVATE OTHER CLIENT|3\/10/)
  const snapshot = structuredClone(db)
  saveAssessmentRecord(db, { clientId: 'local-builder-100', type: 'movement', record: current,
    form: { date: current.date, phase: 'reassessment', notes: '' }, data: { protocol: 'nasm', findings: { kneesValgus: { l: true, pain: false } } } })
  assert.equal(db.assessments.length, 4, 'does not manufacture another pain assessment')
  assert.deepEqual(db.assessments.find(row => row.id === 'manual-pain'), snapshot.assessments.find(row => row.id === 'manual-pain'))
  html = render(null, db, route)
  assert.match(html, /Latest movement screen: no pain flags · Oct 20, 2026/)
  assert.doesNotMatch(html, /QA knee discomfort|1 pain flag · Movement screen/)
  history = render(null, db, `${route}/pain`)
  assert.match(history, /Squat/)
  assert.doesNotMatch(history, /QA knee discomfort|current-pain-screen/)
  const calls = []
  assert.deepEqual(await persistDiff(snapshot, db, { from: table => ({ upsert: async rows => { calls.push({ table, rows }); return {} } }) }), [])
  assert.equal(calls.length, 1)
  assert.equal(calls[0].rows[0].id, current.id)
  assert.equal(calls[0].rows[0].type, 'movement')
  db.assessments = db.assessments.filter(row => row.id !== old.id)
  assert.equal(movementPainReports(db.assessments.filter(row => row.clientId === 'local-builder-100')).length, 0)
  html = render(null, db, route)
  assert.doesNotMatch(html, /pain flag.*Movement screen/)
  assert.equal(db.assessments.filter(row => row.type === 'pain').length, 1)
  const later = record({ protocol: 'nasm', findings: {} }, 'movement', { id: 'same-day-later', date: '2026-10-20', createdAt: '2026-10-20T09:00:00Z' })
  current.data.findings.kneesValgus.pain = true
  db.assessments.push(later)
  html = render(null, db, route)
  assert.match(html, /Latest movement screen: no pain flags/)
  assert.doesNotMatch(html, /1 pain flag · Movement screen/)
})

test('assessment cards and record history disclose saved, suggested and unscheduled review dates', () => {
  const db = fixture()
  db.assessments = [record({ nextReassessmentDate: '2026-11-05' }), record({}, 'movement', { id: 'movement' }), record({ nextReassessmentDate: null }, 'body_comp', { id: 'body' })]
  const html = render(null, db, '/clients/local-builder-100/assessments')
  assert.match(html, /Next reassessment Nov 5, 2026/)
  assert.match(html, /Suggested review Dec 24, 2026/)
  assert.match(html, /Next reassessment not scheduled/)
  assert.match(html, /Edit reassessment date/)
  const history = render(null, db, '/clients/local-builder-100/assessments/fitness?record=record-a')
  assert.match(history, /Next reassessment/)
  assert.match(history, /Nov 5, 2026/)
})

test('other fitness tests survive save, sync, edit and history without becoming Training Max values', async () => {
  const db = fixture(), before = structuredClone(db)
  const otherTests = gripStrengthTests().map((test, i) => ({ ...test, value: String(30 + i * 5), protocol: 'Device A; seated; best of 3' }))
  const form = { date: '2026-10-01', phase: 'baseline', notes: 'Measured grip', nextReassessmentDate: '' }
  const saved = saveAssessmentRecord(db, { clientId: 'local-builder-100', type: 'fitness', form, data: { otherTests, strength: [], posture: 'Legacy note' } })
  const calls = []
  assert.deepEqual(await persistDiff(before, db, { from: table => ({ upsert: async rows => { calls.push({ table, rows }); return {} } }) }), [])
  assert.equal(calls[0].table, 'assessments')
  assert.equal(calls[0].rows[0].data.otherTests[0].value, 30)
  assert.equal(resolveTrainingMax(db, 'local-builder-100', 'Handgrip dynamometer', '2026-10-02').kg, null)
  assert.match(summarize(saved), /2 other tests/)
  assert.deepEqual(describe(saved).filter(row => /Handgrip/.test(row.label)).map(row => row.value), ['30 kgf', '35 kgf'])
  const html = render(assessmentForm('fitness', 'local-builder-100', JSON.parse(JSON.stringify(saved))), db)
  assert.match(html, /aria-label="Other test result 1" value="30"|value="30" aria-label="Other test result 1"/)
  assert.match(html, /aria-label="Other test side 2"/)
  assert.match(html, /＋ Left\/right grip/)
  assert.match(html, /kgf/)
  const snapshot = structuredClone(db)
  assert.throws(() => saveAssessmentRecord(db, { clientId: 'local-builder-100', type: 'fitness', form, data: { otherTests: [{ ...otherTests[0], value: '' }] } }), /numeric result/)
  assert.deepEqual(db, snapshot)
  const reassess = saveAssessmentRecord(db, { clientId: 'local-builder-100', type: 'fitness', form: { ...form, date: '2026-10-20', phase: 'reassessment' }, data: { otherTests: otherTests.map(row => ({ ...row, value: +row.value + 2 })) } })
  assert.deepEqual(compare('fitness', saved, reassess).map(row => row.delta), [2, 2])
  const history = render(null, db, `/clients/local-builder-100/assessments/fitness?record=${reassess.id}`)
  assert.match(history, /Baseline → latest/)
  assert.match(history, /href="\/clients\/local-builder-100\/progress#outcomes"/)
  assert.match(history, /32 kgf/)
  const newForm = render(assessmentForm('fitness', 'local-builder-100', undefined, 'reassessment'), db)
  assert.match(newForm, /Use previous tests/)
  // Editing legacy fields preserves custom results; removing tests intentionally clears them.
  saveAssessmentRecord(db, { clientId: 'local-builder-100', type: 'fitness', record: saved, form, data: { strength: [] } })
  assert.equal(saved.data.otherTests.length, 2)
  saveAssessmentRecord(db, { clientId: 'local-builder-100', type: 'fitness', record: saved, form, data: { otherTests: [] } })
  assert.deepEqual(saved.data.otherTests, [])
  assert.equal(saved.data.posture, 'Legacy note')
})

test('Dashboard and local nudges agree with scheduled dates, blank dates and derived exclusions', () => {
  const db = fixture()
  const client = db.clients.find(c => c.id === 'local-builder-100')
  db.assessments = [record({ nextReassessmentDate: '2026-10-14' }), record({ nextReassessmentDate: null }, 'movement', { id: 'movement' }), record({ nextReassessmentDate: '2027-01-01' }, 'body_comp', { id: 'body', date: '2026-01-01' }), record({ sourceMaxId: 'max' }, 'fitness', { id: 'derived', date: '2026-10-13' })]
  const reviews = clientReviewItems(db, '2026-10-14', [client]).filter(r => /review due/.test(r.reason))
  assert.deepEqual(reviews.map(r => r.reason), ['Fitness review due'])
  const nudges = computeNudges(db, { ...db.settings, nudgeLowActivity: false }, new Date('2026-10-14T12:00:00Z')).filter(r => r.broadcastId.startsWith('nudge:reassess:'))
  assert.deepEqual(nudges.map(r => r.broadcastId), ['nudge:reassess:record-a'])
})

test('real server reminder handler reads saved dates and coach defaults without live calls', async () => {
  const today = new Date().toISOString().slice(0, 10)
  const db = memoryDb({
    settings: [{ coachId: 'coach', nudgeLowActivity: false, reassessIntervalDays: 1 }],
    clients: [{ id: 'local-builder-100', coachId: 'coach' }],
    assessments: [record({ nextReassessmentDate: today }), record({ nextReassessmentDate: null }, 'movement', { id: 'movement' }), record({}, 'body_comp', { id: 'body' }), record({ sourceWorkoutId: 'workout' }, 'fitness', { id: 'derived', date: today })],
    messages: [],
  })
  // PostgREST trims column-list spaces; normalize this in the query double too.
  const backend = { from(table) { const query = db.from(table), select = query.select; query.select = columns => select.call(query, columns.replaceAll(' ', '')); return query } }
  const handler = createHandler('comms-cron', { admin: () => backend, assessmentReview, isFormalReviewAssessment })
  const response = await handler(new Request('https://test.invalid/comms-cron', { method: 'POST' }))
  assert.equal(response.status, 200)
  const inserts = db.calls.filter(c => c.table === 'messages' && c.op === 'insert').flatMap(c => c.values)
  assert.deepEqual(inserts.map(r => r.broadcastId), ['nudge:reassess:record-a', 'nudge:reassess:body'])
  assert.ok(db.calls.find(c => c.table === 'clients').columns.includes('coachId'))
  assert.ok(db.calls.find(c => c.table === 'assessments').columns.includes('data'))
  db.tables.assessments.find(r => r.id === 'body').data.nextReassessmentDate = '2099-01-01'
  db.calls.length = 0
  assert.equal((await handler(new Request('https://test.invalid/comms-cron', { method: 'POST' }))).status, 200)
  assert.deepEqual(db.calls.filter(c => c.table === 'messages' && c.op === 'insert').flatMap(c => c.values).map(r => r.broadcastId), ['nudge:reassess:record-a'])
})
