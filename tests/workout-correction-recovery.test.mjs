import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('correction recovery distinguishes a failed submission, a saved correction, and newer edits', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'silent' })
  try {
    const { inspectCorrectionDraft } = await vite.ssrLoadModule('/src/lib/workoutCorrectionRecovery.js')
    const expected = {
      id: 'workout-nine', clientId: 'fixture', date: '2026-11-22', bookingId: 'nine', status: 'completed',
      durationSec: 1680, main: [{ id: 'exercise', setRows: [{ done: true, reps: 7 }] }], liveState: { original: { main: [] } },
    }
    const workout = { ...expected, durationSec: 1920 }
    const afternoon = { ...expected, id: 'workout-fifteen', bookingId: 'fifteen' }
    const old = { id: 'effort', clientId: 'fixture', date: expected.date, sessionId: 'nine', source: 'Workout completion', rpe: 7, duration: 28, tl: 196 }
    const row = { ...old, rpe: 8, duration: 32, tl: 256 }
    const attempt = { id: 'submission', expected, workout, effort: { expected: old, row } }
    const raw = JSON.stringify(attempt)
    const check = (saved, effort, draft = raw) => inspectCorrectionDraft('coach', { srpe: [effort] }, saved, draft)

    assert.equal(check(expected, old).kind, 'retry')
    assert.equal(check(workout, row).kind, 'saved')
    // A write changing just the effort is still pending until that effort matches.
    const effortOnly = JSON.stringify({ ...attempt, workout: expected })
    assert.equal(check(expected, old, effortOnly).kind, 'retry')
    assert.equal(check(expected, row, effortOnly).kind, 'saved')
    assert.equal(check(workout, old).kind, 'conflict')
    assert.equal(check({ ...expected, note: 'Edited from another browser' }, old).kind, 'conflict')
    assert.equal(check(expected, { ...old, rpe: 5, tl: 140 }).kind, 'conflict')
    assert.equal(check(afternoon, old), null)
    assert.equal(check(workout, row, '{'), null)
    assert.equal(check(Object.fromEntries(Object.entries(workout).reverse()), row).kind, 'saved')

    const records = new Map()
    const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key),
    } })
    Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() })
    try {
      const { readCorrectionDraft, rememberCorrectionDraft, forgetCorrectionDraft } = await vite.ssrLoadModule('/src/lib/workoutCorrectionRecovery.js')
      rememberCorrectionDraft('coach', attempt)
      assert.equal(readCorrectionDraft('another-coach', expected), null)
      assert.equal(readCorrectionDraft('coach', afternoon), null)
      assert.equal(readCorrectionDraft('coach', expected), raw)
      forgetCorrectionDraft('coach', { ...attempt, id: 'older-attempt' })
      assert.equal(readCorrectionDraft('coach', expected), raw)
      forgetCorrectionDraft('coach', attempt)
      assert.equal(readCorrectionDraft('coach', expected), null)
    } finally {
      if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage)
      else delete globalThis.localStorage
      if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow)
      else delete globalThis.window
    }
  } finally { await vite.close() }
})
