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
const { dueStatus, describe, movementScore } = await load('lib/assessment.js')
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
  for (const rec of [undefined, record({ screens: [{ pattern: 'squat', score: 2, pain: false }], posture: 'Recorded posture' }, 'movement')]) {
    const html = render(assessmentForm('movement', 'local-builder-100', rec), db)
    assert.match(html, />Posture</)
    assert.match(html, /Next reassessment date/)
    if (rec) assert.match(html, /value="Recorded posture"/)
  }
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
