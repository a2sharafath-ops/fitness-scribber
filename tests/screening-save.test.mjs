import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const load = path => vite.ssrLoadModule('/src/' + path)
const { saveAthleteScreening, saveCoachScreening } = await load('api/screenings.js')
const { newScreening } = await load('lib/screening.js')
const { default: ScreeningFlow } = await load('components/organisms/screening/ScreeningFlow.jsx')

test('an unconfirmed save keeps the step, answers, and form open for retry', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://app.invalid/' })
  const globals = Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  const restore = new Map()
  for (const [key, value] of globals) {
    restore.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const root = createRoot(document.getElementById('root'))
  try {
    const calls = []
    const screening = {
      id: 'same-draft', ...newScreening('client', '2026-11-28'),
      consent: { collect: 'consented', share: 'consented' },
    }
    let respond, closed = false
    const button = label => [...document.querySelectorAll('button')].find(b => b.textContent === label)
    const deferredWrite = row => {
      calls.push(row)
      return new Promise(resolve => { respond = resolve })
    }
    await act(async () => root.render(React.createElement(ScreeningFlow, {
      screening, onSave: deferredWrite, onComplete: deferredWrite, onCancel: () => { closed = true },
    })))

    await act(async () => button('Continue →').click())
    assert.match(document.body.textContent, /Before we start/)
    assert.equal(button('Saving…').disabled, true)
    assert.equal(document.querySelector('fieldset').disabled, true)
    await act(async () => respond(false))
    assert.match(document.querySelector('[role=alert]').textContent, /Your answers are still here/)
    assert.match(document.body.textContent, /Before we start/)
    assert.equal(document.querySelector('input[type=checkbox]').checked, true)

    await act(async () => button('Continue →').click())
    assert.deepEqual(calls[0], calls[1])
    await act(async () => respond({ ...calls[1], updatedAt: '2026-11-28T14:05:00Z' }))
    assert.match(document.body.textContent, /General Health Questions/)

    await act(async () => button('Save & close').click())
    assert.equal(calls.at(-1).updatedAt, '2026-11-28T14:05:00Z')
    assert.equal(closed, false)
    await act(async () => respond(false))
    assert.equal(closed, false)
    await act(async () => button('Save & close').click())
    await act(async () => respond(calls.at(-1)))
    assert.equal(closed, true)
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of restore) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})

test('the client posts only answers and a version to the scoped server function', async () => {
  const row = { id: 'draft', ...newScreening('mine', '2026-11-28'), updatedAt: 'v1',
    outcome: 'C', programStatus: 'gated', clearance: { status: 'received' }, coachId: 'private' }
  const response = { id: row.id, clientId: 'mine', updatedAt: 'v2' }
  const result = await saveAthleteScreening(row, true, {
    rpc: async (name, payload) => {
      assert.equal(name, 'save_athlete_screening')
      assert.equal(payload.p_client_id, 'mine')
      assert.equal(payload.p_submit, true)
      assert.deepEqual(Object.keys(payload.p_answers).sort(), ['acknowledgements', 'consent', 'goals', 'hhq', 'id', 'parq', 'step', 'updatedAt'])
      return { data: response }
    },
  })
  assert.deepEqual(result, response)
})

test('coach draft saves stay conditional and a lost response can be retried', async () => {
  const row = { id: 'draft', ...newScreening('mine', '2026-11-28'), step: 'parq', updatedAt: 'v1' }
  const confirmed = { ...row, updatedAt: 'v2' }
  const filters = []
  let reads = 0
  const client = { from: name => {
    assert.equal(name, 'screenings')
    return {
      update(fields) { assert.equal(fields.step, 'parq'); return this },
      eq(key, value) { filters.push([key, value]); return this },
      select() { return this },
      maybeSingle() { reads++; return reads === 1 ? { data: null } : { data: { ...confirmed, coachId: 'owner' } } },
    }
  } }
  assert.deepEqual(await saveCoachScreening(row, 'v1', client), confirmed)
  assert.deepEqual(filters.slice(0, 4), [['id', 'draft'], ['clientId', 'mine'], ['status', 'draft'], ['updatedAt', 'v1']])
  assert.equal(reads, 2)
})
