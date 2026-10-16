import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createServer } from 'vite'

test('real app opens goal history, follows full entries, and edits current goals inside its router', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/clients/local-builder-100/profile', pretendToBeVisual: true })
  dom.window.scrollTo = () => {}
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  const saved = new Map()
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true })) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const vite = await createServer({ configFile: false, cacheDir: '.recovery/vite-profile-goals-test', optimizeDeps: { noDiscovery: true, entries: [] },
    define: { 'import.meta.env.VITE_LOCAL_BUILDER_QA': '"true"' }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
  let root
  const waitFor = async predicate => {
    for (let i = 0; i < 250; i++) {
      if (predicate()) return
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    }
    assert.fail('Expected profile UI did not appear: ' + document.body.textContent.slice(-600))
  }
  const button = (text, scope = document) => [...scope.querySelectorAll('button')].find(el => el.textContent.trim() === text)
  const click = async element => { assert.ok(element); await act(async () => element.click()) }
  try {
    const { seedBuilderQA } = await vite.ssrLoadModule('/src/lib/builderQA.js')
    const { localStorageKey } = await vite.ssrLoadModule('/src/lib/storage.js')
    const { saveAssessmentRecord } = await vite.ssrLoadModule('/src/lib/assessmentWrite.js')
    const db = seedBuilderQA('2026-10-16')
    db.assessments = [
      { id: 'older-goals', clientId: 'local-builder-100', type: 'goals', date: '2026-10-01', phase: 'baseline', data: { shortTerm: [{ text: 'Older goal' }] } },
      { id: 'current-goals', clientId: 'local-builder-100', type: 'goals', date: '2026-10-16', phase: 'reassessment', data: { source: 'Coach entry', shortTerm: [{ text: 'Current short goal', target: '3 sessions', by: '2026-11-01' }], longTerm: [{ text: 'Current long goal', target: '10 km', by: '2027-01-01' }] } },
      { id: 'private-goals', clientId: 'local-builder-200', type: 'goals', date: '2026-10-16', data: { shortTerm: [{ text: 'PRIVATE OTHER CLIENT' }] } },
    ]
    localStorage.setItem(localStorageKey, JSON.stringify(db))
    const { default: App } = await vite.ssrLoadModule('/src/App.jsx')
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(App)))
    await waitFor(() => button('Goal history · 2 →'))
    await click(button('Goal history · 2 →'))
    assert.ok(document.querySelector('[role="dialog"]'))
    assert.match(document.querySelector('[role="dialog"]').textContent, /Goal history/)
    assert.doesNotMatch(document.body.textContent, /PRIVATE OTHER CLIENT/)
    await click(document.querySelector('[role="dialog"] a'))
    await waitFor(() => document.getElementById('assessment-record-current-goals'))
    assert.equal(window.location.pathname, '/clients/local-builder-100/profile/goals')
    assert.equal(document.querySelector('[role="dialog"]'), null)
    await click(button('Edit goals', document.getElementById('assessment-record-current-goals')))
    assert.equal(document.querySelector('[aria-label="Short-term goal 1"]').value, 'Current short goal')
    assert.equal(document.querySelector('[aria-label="Long-term goal 1"]').value, 'Current long goal')
    await click(button('Cancel'))
    await click([...document.querySelectorAll('a')].find(el => el.textContent.trim() === '← Profile'))
    await waitFor(() => button('Edit current goals'))
    await click(button('Edit current goals'))
    assert.equal(document.querySelector('[aria-label="Short-term target 1"]').value, '3 sessions')
    assert.equal(document.querySelector('[aria-label="Long-term target 1"]').value, '10 km')
    await click(button('Save changes'))
    const stored = JSON.parse(localStorage.getItem(localStorageKey))
    assert.equal(stored.assessments.length, 3, 'editing does not create another goal history row')
    assert.equal(stored.assessments.find(row => row.id === 'current-goals').data.longTerm[0].text, 'Current long goal')
    const untouched = structuredClone(stored.assessments.filter(row => row.id !== 'current-goals'))
    saveAssessmentRecord(stored, { clientId: 'local-builder-100', type: 'goals', record: stored.assessments.find(row => row.id === 'current-goals'),
      form: { date: '2026-10-16', phase: 'reassessment', notes: '' }, data: { shortTerm: [{ text: 'Edited short goal' }], longTerm: [{ text: 'Edited long goal' }], why: '' } })
    assert.deepEqual(stored.assessments.filter(row => row.id !== 'current-goals'), untouched)
    assert.equal(stored.assessments.length, 3)
  } finally {
    if (root) await act(async () => root.unmount())
    await vite.close()
    dom.window.close()
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
