// Isolated browser baseline; pass only a restored, local-only Vite origin.
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const executable = process.env.CLASSIC_CHROMIUM
assert(executable, 'Set CLASSIC_CHROMIUM to the installed headless Chromium executable')
const origin = process.env.POOL_SMOKE === 'true' ? 'http://127.0.0.1:4179' : 'http://127.0.0.1:4178'
const profile = await mkdtemp(join(tmpdir(), 'fitness-smoke-'))
const child = spawn(executable, ['--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-background-networking', 'about:blank'])
let stderr = ''
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Browser startup timed out')), 15000)
    child.stderr.on('data', data => {
      stderr += data
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) { clearTimeout(timer); resolve(match[1]) }
    })
    child.on('error', reject)
  })
  const socket = new WebSocket(endpoint)
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (!message.id) return
    const job = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) job.reject(new Error(message.error.message))
    else job.resolve(message.result)
  })
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const requestId = ++id
    pending.set(requestId, { resolve, reject })
    socket.send(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true })
  const page = (method, params) => call(method, params, sessionId)
  await page('Network.enable')
  await page('Network.setBlockedURLs', { urls: ['https://*.supabase.co/*', 'https://*.googleapis.com/*', 'https://*.gstatic.com/*'] })
  const evaluate = async expression => {
    const result = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    assert(!result.exceptionDetails, 'Browser evaluation failed')
    return result.result.value
  }
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('Browser condition timed out')
  }
  for (const path of ['/', '/clients', '/workouts', '/schedule']) {
    await page('Page.navigate', { url: origin + path })
    await waitFor('!!document.querySelector("#main h1")')
    assert(await evaluate('document.querySelector("#root").innerText.length > 100'))
    console.log(`PASS Classic route ${path}`)
  }
  await evaluate(`(async () => {
    const { loadDB, saveDB } = await import('/src/lib/storage.js')
    const db = loadDB()
    db.settings.businessName = 'Synthetic recovery persistence'
    saveDB(db)
  })()`)
  await page('Page.reload')
  await waitFor('!!document.querySelector("#main h1")')
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("fitscribe_v1")).settings.businessName'), 'Synthetic recovery persistence')
  console.log('PASS synthetic local persistence survives reload')
  if (process.env.POOL_SMOKE === 'true') {
    const clientId = await evaluate('JSON.parse(localStorage.getItem("fitscribe_v1")).clients[0].id')
    await page('Page.navigate', { url: `${origin}/clients/${encodeURIComponent(clientId)}/pool` })
    await waitFor('document.body.innerText.includes("48 candidate records")')
    assert(await evaluate('document.body.innerText.includes("Local preview only")'))
    assert(await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Save attributed report")).disabled'))
    await evaluate('document.querySelector("#pool-filter").focus()')
    assert(await evaluate('document.activeElement.id === "pool-filter"'))
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    assert(await evaluate('document.querySelector("#candidate-review") !== null'))
    console.log('PASS candidate preview, local authority disabled, keyboard focus and mobile DOM')
  }
  socket.close()
} finally {
  child.kill('SIGTERM')
}
