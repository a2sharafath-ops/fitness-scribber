import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHandler as handler, memoryDb } from './helpers/wearable-harness.mjs'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

// Execute the real Edge Function handlers with isolated auth/database/provider
// doubles. These tests never contact Supabase or an external service.
const request = (body = { clientId: 'client-a', action: 'list' }) => new Request('https://test.invalid/function', { method: 'POST', body: JSON.stringify(body) })
function connectionFixture(userId = 'coach-a', options = {}) {
  const calls = []
  const db = { from(table) {
    const call = { table, filters: [] }; calls.push(call)
    const result = () => table === 'clients'
      ? { data: options.missing ? null : { id: 'client-a', coachId: 'coach-a', userId: 'athlete-a' }, error: null }
      : { data: [{ provider: 'oura', expiresAt: '2027-01-01', accessToken: 'private-access', refreshToken: 'private-refresh' }], error: options.error || null }
    return {
      select(columns) { call.columns = columns; return this },
      delete() { call.deleted = true; return this },
      eq(key, value) { call.filters.push([key, value]); return this },
      maybeSingle: async () => result(),
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject) },
    }
  } }
  return { calls, serve: handler('wearable-connections', { userFromRequest: async () => userId ? { id: userId } : null, admin: () => db }) }
}

test('connection metadata denies unauthenticated and unrelated users before token-table access', async () => {
  for (const [id, status] of [[null, 401], ['unrelated-user', 404]]) {
    const { serve, calls } = connectionFixture(id)
    assert.equal((await serve(request())).status, status)
    assert.ok(calls.every(c => c.table !== 'wearable_tokens'))
  }
  const { serve } = connectionFixture('coach-a', { missing: true })
  assert.equal((await serve(request())).status, 404)
})

test('owner and linked athlete receive only provider metadata even if a database response includes secrets', async () => {
  for (const id of ['coach-a', 'athlete-a']) {
    const { serve, calls } = connectionFixture(id)
    const response = await serve(request())
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { connections: [{ provider: 'oura', expiresAt: '2027-01-01' }] })
    assert.equal(calls[1].columns, 'provider,expiresAt')
    assert.deepEqual(calls[1].filters, [['clientId', 'client-a'], ['coachId', 'coach-a']])
  }
})

test('disconnect is ownership checked and restricted to the requested provider/client/coach', async () => {
  const body = { clientId: 'client-a', action: 'disconnect', provider: 'oura' }
  const denied = connectionFixture('unrelated-user')
  assert.equal((await denied.serve(request(body))).status, 404)
  assert.ok(denied.calls.every(c => !c.deleted))
  const owner = connectionFixture()
  assert.equal((await owner.serve(request(body))).status, 200)
  assert.equal(owner.calls[1].deleted, true)
  assert.deepEqual(owner.calls[1].filters, [['clientId', 'client-a'], ['coachId', 'coach-a'], ['provider', 'oura']])
  const invalid = connectionFixture()
  assert.equal((await invalid.serve(request({ ...body, provider: 'unknown' }))).status, 400)
  assert.ok(invalid.calls.every(c => c.table !== 'wearable_tokens'))
})

test('connection errors never disclose database error contents and unsupported requests cannot mutate', async () => {
  const { serve, calls } = connectionFixture('coach-a', { error: { message: 'private-error-secret' } })
  const response = await serve(request())
  assert.equal(response.status, 500)
  assert.doesNotMatch(await response.text(), /private-error-secret/)
  const before = calls.length
  assert.equal((await serve(new Request('https://test.invalid/function'))).status, 405)
  assert.equal(calls.length, before)
  assert.equal((await serve(request({ clientId: 42, action: 'list' }))).status, 400)
})

test('both LLM endpoints sanitize provider errors for both supported services', async () => {
  for (const name of ['insights', 'parse-workout']) for (const provider of ['openai', 'anthropic']) {
    let providerCalled = false
    const serve = handler(name, {
      userFromRequest: async () => ({ id: 'coach-a' }),
      fetch: async () => { providerCalled = true; return Response.json({ error: 'credential-fragment-should-not-escape' }, { status: 401 }) },
    }, { LLM_PROVIDER: provider })
    const response = await serve(request({ summary: 'test', transcript: 'test' }))
    assert.ok(providerCalled)
    assert.equal(response.status, 500)
    assert.doesNotMatch(await response.text(), /credential-fragment/)
  }
})

test('OAuth callback failures omit storage errors from the redirect URL and body', async () => {
  const db = memoryDb({}, () => true)
  const serve = handler('wearable-callback', {
    PROVIDERS: { oura: {} }, admin: () => db,
  }, { APP_URL: 'https://app.invalid', SUPABASE_URL: 'https://db.invalid' })
  const response = await serve(new Request('https://test.invalid/wearable-callback/oura?code=test&state=' + 'a'.repeat(43)))
  assert.equal(response.status, 303)
  assert.equal(response.headers.get('location'), 'https://app.invalid/#wearable=error')
  assert.doesNotMatch(await response.text(), /private database failure/)
})

test('actual Vite config accepts public keys and rejects privileged, malformed and unexpected browser configuration without printing values', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'fitness-public-env-'))
  const configUrl = pathToFileURL(path.resolve('vite.config.js')).href
  const jwt = role => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'testsignature'].join('.')
  const cases = [
    [{}, true],
    [{ VITE_SUPABASE_ANON_KEY: jwt('anon') }, true],
    [{ VITE_SUPABASE_ANON_KEY: 'sb_publishable_testpublic' }, true],
    [{ VITE_VERCEL_GIT_REPO_ID: '123456', VITE_VERCEL_ENV: 'production', VITE_VERCEL_URL: 'deployment.example' }, true],
    [{ VITE_SUPABASE_ANON_KEY: jwt('service_role') }, false],
    [{ VITE_SUPABASE_ANON_KEY: 'sb_secret_privileged-test-value' }, false],
    [{ VITE_SUPABASE_ANON_KEY: 'malformed-private-value' }, false],
    [{ VITE_OPENAI_API_KEY: 'private-provider-value' }, false],
    [{ VITE_SUPABASE_ANON_KEY_SECRET: 'private-suffix-value' }, false],
  ]
  try {
    for (const [vars, accepted] of cases) {
      const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('VITE_')))
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import config from ${JSON.stringify(configUrl)}; try { config({mode:'production'}); } catch(e) { console.error(e.message); process.exit(1); }`], { cwd, env: { ...env, ...vars }, encoding: 'utf8' })
      assert.equal(result.status === 0, accepted, result.stderr)
      for (const value of Object.values(vars)) assert.ok(!result.stderr.includes(value))
    }
  } finally {
    const target = path.resolve(cwd)
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()))
    assert.ok(path.basename(target).startsWith('fitness-public-env-'))
    fs.rmSync(target, { recursive: true, force: true })
  }
})

test('production build accepts Vercel metadata and exposes only reviewed app variables, including whole-env access', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'fitness-public-env-build-'))
  const configPath = path.resolve('vite.config.js')
  const vars = {
    VITE_SUPABASE_URL: 'https://public-config.example',
    VITE_SUPABASE_ANON_KEY: 'sb_publishable_testpublic',
    VITE_LOCAL_BUILDER_QA: 'false',
    VITE_VERCEL_GIT_REPO_ID: 'vercel-repository-marker',
    VITE_VERCEL_GIT_COMMIT_SHA: 'vercel-commit-marker',
    VITE_VERCEL_ENV: 'vercel-environment-marker',
    VITE_VERCEL_CUSTOM_SECRET: 'excluded-metadata-marker',
    SERVER_ONLY_SECRET: 'excluded-server-marker',
  }
  try {
    fs.writeFileSync(path.join(cwd, 'entry.js'), 'globalThis.probe = { env: import.meta.env, repository: import.meta.env.VITE_VERCEL_GIT_REPO_ID, server: import.meta.env.SERVER_ONLY_SECRET };')
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('VITE_')))
    const code = `import {build} from ${JSON.stringify(import.meta.resolve('vite'))};
      const result = await build({configFile:${JSON.stringify(configPath)},logLevel:'silent',build:{write:false,minify:false,lib:{entry:'entry.js',formats:['es']}}});
      for (const output of (Array.isArray(result) ? result : [result])) for (const chunk of output.output) if (chunk.type === 'chunk') process.stdout.write(chunk.code);`
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd, env: { ...env, ...vars }, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_LOCAL_BUILDER_QA']) assert.ok(result.stdout.includes(vars[name]), name + ' must reach the browser')
    for (const [name, value] of Object.entries(vars).filter(([name]) => name.startsWith('VITE_VERCEL_') || name === 'SERVER_ONLY_SECRET')) {
      assert.ok(!result.stdout.includes(value), name + ' must stay out of the browser bundle')
    }
  } finally {
    const target = path.resolve(cwd)
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()))
    assert.ok(path.basename(target).startsWith('fitness-public-env-build-'))
    fs.rmSync(target, { recursive: true, force: true })
  }
})
