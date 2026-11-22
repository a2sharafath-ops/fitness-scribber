import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createServer } from 'vite'

test('autosave recovers failed writes, recognizes saved drafts, and blocks conflicting retries', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://app.invalid/' })
  const globals = new Map()
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
  let root
  try {
    const { default: useLiveSession } = await vite.ssrLoadModule('/src/hooks/useLiveSession.js')
    let remote = { id: 'test-recovery', clientId: 'test-client', status: 'in_progress', date: '2026-11-19', warmup: [], cooldown: [],
      main: [{ id: 'exercise', name: 'Test exercise', sets: 1, reps: '10' }] }
    let api, failure = false, responseLost = false, calls = 0
    const persist = async (next) => {
      calls++
      if (failure) return { saved: false, issues: [{ message: 'Offline' }] }
      remote = structuredClone(next)
      if (responseLost) return { saved: false, issues: [{ message: 'Connection reset' }] }
      return { saved: true }
    }
    function Harness() {
      api = useLiveSession(remote, 'synthetic-owner', null, persist)
      return React.createElement('p', null, api.status)
    }
    const mount = async () => {
      root = createRoot(document.getElementById('root'))
      await act(async () => root.render(React.createElement(Harness)))
    }
    await mount()
    await act(async () => assert.equal(await api.flush(), true))
    await act(async () => assert.equal(await api.flush(), true))
    assert.equal(calls, 1)
    await act(async () => api.change({ type: 'row', id: 'exercise:set:1', patch: { reps: 8 } }))
    await act(async () => assert.equal(await api.flush(), true))
    assert.equal(calls, 2)
    assert.equal(remote.main[0].setRows[0].reps, 8)
    failure = true
    await act(async () => api.change({ type: 'row', id: 'exercise:set:1', patch: { reps: 7 } }))
    await act(async () => assert.equal(await api.flush(), false))
    assert.equal(api.status, 'failed')
    await act(async () => root.unmount())
    root = null
    failure = false
    await mount()
    assert.equal(api.session.main[0].setRows[0].reps, 7)
    await act(async () => assert.equal(await api.flush(), true))
    assert.equal(remote.main[0].setRows[0].reps, 7)

    responseLost = true
    await act(async () => api.change({ type: 'row', id: 'exercise:set:1', patch: { reps: 6 } }))
    await act(async () => assert.equal(await api.flush(), false))
    assert.equal(remote.main[0].setRows[0].reps, 6)
    await act(async () => root.unmount())
    root = null
    responseLost = false
    remote.endedAt = null
    await mount()
    const writes = calls
    assert.equal(api.conflict, false)
    await act(async () => assert.equal(await api.flush(), true))
    assert.equal(calls, writes)

    await act(async () => root.unmount())
    root = null
    remote.main[0].setRows[0].reps = 8
    await mount()
    assert.equal(api.conflict, false)
    assert.equal(api.session.main[0].setRows[0].reps, 8)
    await act(async () => assert.equal(await api.flush(), true))
    assert.equal(calls, writes)

    failure = true
    await act(async () => api.change({ type: 'row', id: 'exercise:set:1', patch: { reps: 5 } }))
    await act(async () => assert.equal(await api.flush(), false))
    await act(async () => root.unmount())
    root = null
    remote.main[0].setRows[0].reps = 4
    failure = false
    await mount()
    assert.equal(api.conflict, true)
    assert.equal(api.session.main[0].setRows[0].reps, 5)
    const callsBeforeRetry = calls
    await act(async () => assert.equal(await api.flush(), false))
    assert.equal(calls, callsBeforeRetry)
    assert.throws(() => api.change({ type: 'row', id: 'exercise:set:1', patch: { reps: 3 } }), /changed elsewhere/)
    assert.equal(remote.main[0].setRows[0].reps, 4)
  } finally {
    if (root) await act(async () => root.unmount())
    await vite.close()
    dom.window.close()
    for (const [key, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
