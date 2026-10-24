import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createServer } from 'vite'
import { EXERCISE_LIBRARY } from '../src/lib/exerciseLibrary.js'
import { matchesExerciseSearch, exerciseSearchRank, exerciseSuggestionDescription } from '../src/lib/exerciseSearch.js'

test('exercise suggestions show aliases, allow all RDL matches by keyboard, and select canonical names', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', pretendToBeVisual: true })
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  const saved = new Map()
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const vite = await createServer({ configFile: false, cacheDir: '.recovery/vite-exercise-autocomplete-test', optimizeDeps: { noDiscovery: true, entries: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
  let root
  try {
    const { createRoot } = await import('react-dom/client')
    const { default: Autocomplete } = await vite.ssrLoadModule('/src/components/molecules/Autocomplete.jsx')
    root = createRoot(document.getElementById('root'))
    let selected
    const options = EXERCISE_LIBRARY.map(exercise => exercise.name).sort((a, b) => a.localeCompare(b))
    const props = { options, ariaLabel: 'Exercise name', onChange: value => { selected = value }, filterOption: matchesExerciseSearch,
      sortOptions: (a, b, query) => exerciseSearchRank(a, query) - exerciseSearchRank(b, query) || a.localeCompare(b),
      getOptionDescription: exerciseSuggestionDescription, showAllMatches: true }
    const render = async overrides => {
      await act(async () => root.render(React.createElement(Autocomplete, { ...props, ...overrides })))
      await act(async () => { document.querySelector('input').blur(); document.querySelector('input').focus() })
    }
    await render({ value: 'RFESS' })
    let suggestions = [...document.querySelectorAll('[role="option"]')]
    assert.equal(suggestions.length, 4)
    assert.ok(suggestions.every(option => /Also called:/.test(option.textContent)))
    assert.ok(suggestions.every(option => document.getElementById(option.getAttribute('aria-describedby'))))
    const dumbbell = suggestions.find(option => option.getAttribute('aria-label') === 'DB Bulgarian Split Squat')
    assert.ok(dumbbell)
    await act(async () => dumbbell.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true })))
    assert.equal(selected, 'DB Bulgarian Split Squat')
    assert.equal(document.querySelector('[role="listbox"]'), null)
    await render({ value: 'RDL' })
    suggestions = [...document.querySelectorAll('[role="option"]')]
    assert.ok(suggestions.length > 8, 'all matching variants remain available')
    assert.equal(suggestions[0].getAttribute('aria-label'), 'Romanian Deadlift')
    const last = suggestions.at(-1).getAttribute('aria-label')
    const input = document.querySelector('input')
    await act(async () => { for (let i = 1; i < suggestions.length; i++) input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })) })
    assert.equal(document.getElementById(input.getAttribute('aria-activedescendant')).getAttribute('aria-label'), last)
    await act(async () => input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    assert.equal(selected, last)
    assert.equal(document.querySelector('[role="listbox"]'), null)
    await render({ value: 'Row', options: Array.from({ length: 12 }, (_, i) => `Row ${i}`), filterOption: undefined, sortOptions: undefined, getOptionDescription: undefined, showAllMatches: false })
    assert.equal(document.querySelectorAll('[role="option"]').length, 8, 'generic autocomplete keeps its existing limit')
    assert.equal(document.querySelector('.ac-alias'), null)
  } finally {
    if (root) await act(async () => root.unmount())
    await vite.close()
    dom.window.close()
    for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] }
  }
})
