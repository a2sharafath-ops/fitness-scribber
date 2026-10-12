import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import vm from 'node:vm'
import { createHandler, memoryDb } from './helpers/wearable-harness.mjs'

const hash = text => createHash('sha256').update(text).digest('base64url')
const proof = () => randomBytes(32).toString('base64url')
const client = { id: 'client-a', coachId: 'coach-a', userId: 'athlete-a' }
const env = { APP_URL: 'https://app.invalid', SUPABASE_URL: 'https://db.invalid', CLIENT_ID: 'public-id', CLIENT_SECRET: 'private-secret' }
const providers = { oura: { id: 'oura', pkce: true, authorizeUrl: 'https://vendor.invalid/authorize', tokenUrl: 'https://vendor.invalid/token', clientIdEnv: 'CLIENT_ID', clientSecretEnv: 'CLIENT_SECRET', scope: 'daily', fetchReading: async () => ({ hrv: 50 }) }, whoop: { id: 'whoop' } }
const post = body => new Request('https://db.invalid/function', { method: 'POST', body: JSON.stringify(body) })
function fixture(userId = 'coach-a', fail) {
  const db = memoryDb({ clients: [client] }, fail), tokenCalls = []
  const bindings = { admin: () => db, userFromRequest: async () => userId ? { id: userId } : null, PROVIDERS: providers,
    fetch: async (url, options) => { tokenCalls.push({ url, options }); return Response.json({ access_token: 'private-access', refresh_token: 'private-refresh', expires_in: 3600, token_type: 'Bearer' }) } }
  const serve = name => createHandler(name, bindings, env)
  return { db, bindings, tokenCalls, serve }
}
async function pending(f, extra = {}) {
  const state = proof(), verifier = proof()
  f.db.tables.wearable_oauth_requests = [{ coachId: client.coachId, clientId: client.id, userId: 'coach-a', provider: 'oura', challenge: hash(verifier), code: 'one-code', expiresAt: new Date(Date.now() + 600_000).toISOString(), ...extra, id: hash(state) }]
  return { state, verifier }
}

test('connect rejects unrelated users before storing state and uses the actual coach when an athlete starts it', async () => {
  for (const [id, status] of [[null, 401], ['stranger', 404], ['athlete-a', 200]]) {
    const f = fixture(id), challenge = hash(proof())
    const response = await f.serve('wearable-connect')(post({ provider: 'oura', clientId: 'client-a', challenge }))
    assert.equal(response.status, status)
    if (status !== 200) { assert.equal(f.db.tables.wearable_oauth_requests, undefined); continue }
    const value = await response.json(), url = new URL(value.url), record = f.db.tables.wearable_oauth_requests[0]
    assert.equal(record.coachId, 'coach-a'); assert.equal(record.userId, id)
    assert.equal(record.id, hash(value.state)); assert.notEqual(record.id, value.state)
    assert.equal(record.challenge, challenge)
    assert.equal(url.searchParams.get('code_challenge'), challenge)
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
    assert.equal(url.searchParams.get('redirect_uri'), 'https://db.invalid/functions/v1/wearable-callback/oura')
    assert.ok(Date.parse(record.expiresAt) > Date.now()); assert.ok(Date.parse(record.expiresAt) <= Date.now() + 600_000)
    assert.doesNotMatch(value.url, /coach-a|athlete-a|private-secret/)
  }
})

test('callback rejects forged, expired, provider-swapped and duplicate state; never exchanges tokens', async () => {
  const f = fixture(), { state } = await pending(f, { code: null })
  const callback = f.serve('wearable-callback')
  const call = (s, provider = 'oura', code = 'one-code') => callback(new Request(`https://db.invalid/functions/v1/wearable-callback/${provider}?state=${s}&code=${code}`))
  for (const [s,p] of [[proof(),'oura'], ['forged-base64','oura'], [state,'whoop']]) assert.match((await call(s,p)).headers.get('location'), /wearable=error/)
  const ok = await call(state)
  assert.match(ok.headers.get('location'), /#wearable=complete&state=/)
  assert.doesNotMatch(ok.headers.get('location'), /one-code|private-access/)
  assert.equal(ok.headers.get('referrer-policy'), 'no-referrer')
  assert.match((await call(state,'oura','replacement')).headers.get('location'), /wearable=error/)
  assert.equal(f.db.tables.wearable_oauth_requests[0].code, 'one-code')
  const expired = await pending(f, { code: null, expiresAt: new Date(Date.now() - 1).toISOString() })
  assert.match((await call(expired.state)).headers.get('location'), /wearable=error/)
  assert.equal(f.tokenCalls.length, 0); assert.equal(f.db.tables.wearable_tokens, undefined)
})

test('completion needs the initiating user AND browser proof, and concurrent replay exchanges once', async () => {
  const f = fixture(), body = await pending(f)
  const complete = f.serve('wearable-complete')
  assert.equal((await complete(post({ ...body, verifier: proof() }))).status, 409)
  const other = createHandler('wearable-complete', { ...f.bindings, userFromRequest: async () => ({ id: 'athlete-a' }) }, env)
  assert.equal((await other(post(body))).status, 409)
  assert.equal(f.db.tables.wearable_oauth_requests.length, 1)
  const responses = await Promise.all([complete(post(body)), complete(post(body))])
  assert.deepEqual(responses.map(r => r.status).sort(), [200,409])
  assert.equal(f.tokenCalls.length, 1)
  assert.equal(f.tokenCalls[0].options.body.get('code_verifier'), body.verifier)
  assert.equal(f.db.tables.wearable_tokens[0].coachId, 'coach-a')
  for (const response of responses) assert.doesNotMatch(await response.text(), /private-access|private-refresh|one-code/)
})

test('expired or incomplete transactions cannot exchange; reassignment and revoked athlete access prevent linking', async () => {
  for (const extra of [{ code: null }, { expiresAt: new Date(Date.now()-1).toISOString() }]) {
    const f = fixture(), body = await pending(f, extra)
    assert.equal((await f.serve('wearable-complete')(post(body))).status,409)
    assert.equal(f.tokenCalls.length,0)
  }
  const f = fixture('athlete-a'), body = await pending(f, { userId: 'athlete-a' })
  f.db.tables.clients[0].userId = 'different-athlete'
  assert.equal((await f.serve('wearable-complete')(post(body))).status,404)
  assert.equal(f.tokenCalls.length,0)
  const reassigned = fixture(), saved = await pending(reassigned)
  reassigned.db.tables.clients[0].coachId = 'new-coach'
  assert.equal((await reassigned.serve('wearable-complete')(post(saved))).status,404)
})

test('token storage failure returns failure, and ownership changes during exchange prevent writing', async () => {
  const f = fixture('coach-a', call => call.table === 'wearable_tokens'), body = await pending(f)
  assert.equal((await f.serve('wearable-complete')(post(body))).status,500)
  const moved = fixture(), pendingBody = await pending(moved)
  moved.bindings.fetch = async () => { moved.db.tables.clients[0].coachId='new-coach'; return Response.json({ access_token:'private-token' }) }
  assert.equal((await moved.serve('wearable-complete')(post(pendingBody))).status,404)
  assert.equal(moved.db.tables.wearable_tokens,undefined)
})

test('sync blocks unrelated users, filters tokens by current coach, and attributes athlete sync to the coach', async () => {
  const denied = fixture('stranger')
  assert.equal((await denied.serve('wearable-sync')(post({ clientId:'client-a' }))).status,404)
  assert.ok(denied.db.calls.every(c=>c.table!=='wearable_tokens'))
  const f = fixture('athlete-a')
  f.db.tables.wearable_tokens = [
    { clientId:'client-a',coachId:'coach-a',provider:'oura',accessToken:'private-access',expiresAt:new Date(Date.now()+3600_000).toISOString() },
    { clientId:'client-a',coachId:'old-coach',provider:'whoop',accessToken:'old-access' },
  ]
  const response = await f.serve('wearable-sync')(post({ clientId:'client-a' }))
  assert.equal(response.status,200)
  assert.equal(f.db.tables.wearable[0].coachId,'coach-a')
  assert.equal(f.db.tables.wearable[0].source,'oura')
  assert.doesNotMatch(await response.text(),/private-access|old-access/)
})

test('refresh and reading persistence failures cannot report success', async () => {
  for (const target of ['wearable_tokens', 'wearable']) {
    const f = fixture('coach-a', call => call.table===target && ['update','upsert'].includes(call.op))
    f.db.tables.wearable_tokens=[{clientId:'client-a',coachId:'coach-a',provider:'oura',accessToken:'old-token',refreshToken:'refresh-secret'}]
    const response=await f.serve('wearable-sync')(post({clientId:'client-a'}))
    assert.equal(response.status,500)
    assert.doesNotMatch(await response.text(),/refresh-secret|private database failure/)
  }
})

test('browser binds completion to its own tab, removes callback state, and never sends verifier to connect', async () => {
  const storage=new Map(), calls=[], location={origin:'https://app.invalid',pathname:'/clients/client-a/check-ins',search:'?view=wearables',hash:'',assign:url=>{location.redirect=url}}, history={replaceState:()=>{location.hash=''}}
  const state=proof()
  const context=vm.createContext({crypto,TextEncoder,Uint8Array,btoa,URL,URLSearchParams,window:{location,history},sessionStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)},callFunction:async(name,body)=>{calls.push({name,body});return name==='wearable-connect'?{state,url:'https://cloud.ouraring.com/oauth/authorize?state='+state}:{connected:true}}})
  const source=fs.readFileSync('src/api/wearable.js','utf8').replace(/^import .*\r?\n/gm,'').replace(/^export /gm,'')
  const api=vm.runInContext(`${source};({beginWearableConnection,completeWearableConnection})`,context)
  await api.beginWearableConnection('oura','client-a')
  assert.equal(calls[0].body.verifier,undefined)
  location.hash='#wearable=complete&state='+proof()
  await assert.rejects(api.completeWearableConnection(),/another tab/)
  assert.equal(calls.length,1);assert.equal(storage.size,0)
  await api.beginWearableConnection('oura','client-a')
  location.hash='#wearable=complete&state='+state
  assert.equal(await api.completeWearableConnection(),'/clients/client-a/check-ins?view=wearables')
  assert.equal(hash(calls[2].body.verifier),calls[1].body.challenge)
  assert.equal(location.hash,'');assert.equal(storage.size,0)
  await assert.rejects(api.completeWearableConnection())
  for (const expires of [undefined, Date.now()-1]) {
    await api.beginWearableConnection('oura','client-a')
    const saved=JSON.parse(storage.get('fitness.wearable.pending'))
    storage.set('fitness.wearable.pending',JSON.stringify({...saved,expires}))
    location.hash='#wearable=complete&state='+state
    const count=calls.length
    await assert.rejects(api.completeWearableConnection(),/expired/)
    assert.equal(calls.length,count)
  }
})

test('missing transaction storage fails closed without returning an authorization URL', async () => {
  const f=fixture('coach-a',call=>call.table==='wearable_oauth_requests')
  const response=await f.serve('wearable-connect')(post({provider:'oura',clientId:'client-a',challenge:hash(proof())}))
  assert.equal(response.status,500)
  assert.equal((await response.json()).url,undefined)
})

test('Fitbit exchanges use Basic authentication and PKCE; invalid vendor responses never save tokens', async () => {
  const f=fixture(), body=await pending(f,{provider:'fitbit'})
  f.bindings.PROVIDERS={fitbit:{...providers.oura,id:'fitbit'}}
  assert.equal((await f.serve('wearable-complete')(post(body))).status,200)
  const request=f.tokenCalls[0].options
  assert.equal(request.headers.Authorization,'Basic '+btoa('public-id:private-secret'))
  assert.equal(request.body.get('code_verifier'),body.verifier)
  assert.equal(request.body.get('client_secret'),null)
  for (const value of [{error:'private-vendor-error'}, {access_token:'private-token',expires_in:-1}, {access_token:'private-token',token_type:'unexpected'}]) {
    const broken=fixture(), data=await pending(broken)
    broken.bindings.fetch=async()=>Response.json(value)
    const response=await broken.serve('wearable-complete')(post(data))
    assert.equal(response.status,500)
    assert.equal(broken.db.tables.wearable_tokens,undefined)
    assert.doesNotMatch(await response.text(),/private-vendor-error|private-token/)
  }
})

test('provider reading errors return a sanitized sync failure', async () => {
  const f=fixture()
  f.db.tables.wearable_tokens=[{clientId:'client-a',coachId:'coach-a',provider:'oura',accessToken:'private-access'}]
  f.bindings.PROVIDERS={oura:{...providers.oura,fetchReading:async()=>{throw new Error('private-vendor-error')}}}
  const response=await f.serve('wearable-sync')(post({clientId:'client-a'}))
  assert.equal(response.status,500)
  assert.doesNotMatch(await response.text(),/private-vendor-error|private-access/)
  assert.equal(f.db.tables.wearable,undefined)
})
