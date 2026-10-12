import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createServer } from 'vite'

test('callback stays mounted through auth updates after clearing the fragment', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://app.invalid/' })
  const saved = new Map()
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, sessionStorage: dom.window.sessionStorage, IS_REACT_ACT_ENVIRONMENT: true })) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  // Keep the real Gate, return component and completion API. Stub unrelated
  // app providers and the network boundary so this never touches live data.
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, entries: [] }, server: { middlewareMode: true, hmr: false }, plugins: [{
    name: 'callback-test-boundaries', enforce: 'pre',
    transform(source, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/App.jsx')) return source.replace(/^import .* from ['"]([^'"]+)['"]\r?\n/gm, (line, path) => {
        if (path === 'react' || path === './api/wearable' || path.endsWith('/WearableReturn')) return line
        if (path === './lib/supabase') return 'const hasBackend = true\n'
        if (path === './store/AuthContext') return 'const useAuth = () => globalThis.__callbackAuth; const AuthProvider = ({children}) => children\n'
        if (path.endsWith('/Toaster')) return 'const Toaster = () => null\n'
        return ''
      })
      if (id.replaceAll('\\', '/').endsWith('/src/api/wearable.js')) return source.replace("import { callFunction } from './functions'", 'const callFunction = (...args) => globalThis.__callbackCall(...args)')
    },
  }] })
  let root
  try {
    const { default: App } = await server.ssrLoadModule('/src/App.jsx')
    for (const success of [false, true]) {
      const state = 'a'.repeat(43), calls = []
      let complete
      globalThis.__callbackCall = (...args) => { calls.push(args); return new Promise(resolve => { complete = resolve }) }
      window.history.replaceState({}, '', success ? `/#wearable=complete&state=${state}` : '/#wearable=error')
      if (success) sessionStorage.setItem('fitness.wearable.pending', JSON.stringify({ state, verifier: 'b'.repeat(43), expires: Date.now() + 60000, returnPath: '/clients/test/check-ins?view=wearables' }))
      globalThis.__callbackAuth = { ready: false }
      root = createRoot(document.getElementById('root'))
      await act(async () => root.render(React.createElement(App)))
      assert.match(document.body.textContent, /Starting/)
      globalThis.__callbackAuth = { ready: true, session: {}, profileReady: false }
      await act(async () => root.render(React.createElement(App)))
      assert.equal(window.location.hash, '')
      globalThis.__callbackAuth = { ready: true, session: {}, profileReady: true, role: 'coach' }
      await act(async () => root.render(React.createElement(App)))
      if (success) {
        assert.match(document.body.textContent, /Connecting device/)
        await act(async () => complete({ connected: true }))
      }
      await act(async () => root.render(React.createElement(App)))
      assert.match(document.body.textContent, success ? /Device connected/ : /Device connection failed/)
      assert.equal(document.querySelector('a').getAttribute('href'), success ? '/clients/test/check-ins?view=wearables' : '/')
      assert.equal(calls.length, success ? 1 : 0)
      await act(async () => root.unmount())
      root = null
    }
  } finally {
    if (root) await act(async () => root.unmount())
    await server.close()
    dom.window.close()
    delete globalThis.__callbackAuth
    delete globalThis.__callbackCall
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
