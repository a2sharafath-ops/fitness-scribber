import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import {a33Harness} from './a33-runtime.mjs'
const migrationFile=resolve(process.argv[2]||'');assert(migrationFile.startsWith(resolve('.recovery/hosted-test/baseline-'))&&migrationFile.endsWith('/a33-hosted-migration.json'))
const migration=JSON.parse(readFileSync(migrationFile,'utf8'));assert(migration.passed&&migration.mode==='apply')
const h=a33Harness(true),{ledger,admin}=h
const config=await admin.from('pooling_test_config').select('*').single();assert.ifError(config.error)
const flags=await admin.from('pooling_runtime').select('*').single();assert.ifError(flags.error);assert.deepEqual(flags.data,{singleton:true,r1:false,r2:false,r3:false})
if(!ledger.originalCoachIds){assert.equal(config.data.coach_ids.length,2);ledger.originalCoachIds=config.data.coach_ids;ledger.endsAt=config.data.ends_at;ledger.backup=migration.backup;ledger.restoreFile=migration.restoreFile;h.save()}
assert.equal(Date.parse(config.data.ends_at),Date.parse('2026-09-15T10:37:56.492Z'))
for(const [label,limit]of [['a33-a',2],['a33-b',1]]){
 let u=ledger.users.find(u=>u.label===label)
 if(!u){assert(ledger.users.length<2);u={label,workspaceLimit:limit,email:label+'.'+ledger.runId+'@example.invalid',password:randomBytes(27).toString('base64url'),state:'create_requested'};ledger.users.push(u);h.save()}
 if(!u.id){
  const list=await admin.auth.admin.listUsers({page:1,perPage:100});assert.ifError(list.error);assert(list.data.users.length<100)
  const existing=list.data.users.find(row=>row.email===u.email)
  if(existing){assert.equal(existing.user_metadata.fixture,ledger.runId);u.id=existing.id}
  else{const created=await admin.auth.admin.createUser({email:u.email,password:u.password,email_confirm:true,user_metadata:{fixture:ledger.runId,fictional:true,scope:'A33'}});assert.ifError(created.error);u.id=created.data.user.id}
  u.state='active';h.save()
 }
 assert.equal(u.state,'active','Never reactivate retired accounts');assert(!ledger.originalCoachIds.includes(u.id))
 if(!u.prepared){
  h.reserve(3)
  const p=await admin.from('profiles').upsert({id:u.id,role:'coach',displayName:'FICTIONAL A33 SOFTWARE TEST'});assert.ifError(p.error)
  const settings=await admin.from('settings').upsert({coachId:u.id,trainerName:'FICTIONAL A33 SOFTWARE TEST',businessName:'Engineering scenario only',units:'kg',tz:'UTC'});assert.ifError(settings.error)
  const prior=await admin.from('pooling_engineering_slots').select('*').eq('coach_id',u.id).maybeSingle();assert.ifError(prior.error)
  if(prior.data){assert.equal(prior.data.run_id,ledger.runId);assert.equal(prior.data.workspace_limit,limit)}
  else{const grant=await admin.from('pooling_engineering_slots').insert({coach_id:u.id,workspace_limit:limit,run_id:ledger.runId,expires_at:ledger.endsAt});assert.ifError(grant.error)}
  u.prepared=true;h.save()
 }
 const current=await admin.from('pooling_test_config').select('coach_ids').single();assert.ifError(current.error)
 assert(current.data.coach_ids.every(id=>ledger.originalCoachIds.includes(id)||ledger.users.some(u=>u.id===id)))
 const ids=[...new Set([...current.data.coach_ids,u.id])];assert(ids.length<=4)
 const update=await admin.from('pooling_test_config').update({coach_ids:ids}).eq('singleton',true).eq('ends_at',ledger.endsAt);assert.ifError(update.error)
 const c=await h.signIn(label)
 if(!u.expirySession){const {data:{session}}=await c.auth.getSession();u.expirySession={access_token:session.access_token,refresh_token:session.refresh_token,expires_at:session.expires_at};h.save()}
 for(let slot=1;slot<=limit;slot++){
  const r=await h.rpc(c,slot===1?'pooling_create_test_workspace':'pooling_create_engineering_secondary',{acknowledged:true},12)
  assert(r.testOnly&&r.r1&&Date.parse(r.expiresAt)<=Date.parse(ledger.endsAt))
  const old=ledger.workspaces.find(w=>w.label===label&&w.slot===slot)
  if(old)assert.equal(old.clientId,r.clientId)
  else{assert(ledger.workspaces.length<3);ledger.workspaces.push({label,slot,coachId:u.id,...r});h.save()}
 }
 // Retain this isolated provider session for a genuine signed-JWT expiry test.
 h.check('A33 bounded fictional account and workspaces created',true,{label,workspaces:limit,jwtExpiresAt:new Date(u.expirySession.expires_at*1000).toISOString()})
}
const spaces=await admin.from('pooling_test_workspaces').select('client_id,coach_id,revoked_at');assert.ifError(spaces.error)
assert.equal(spaces.data.length,7);assert(ledger.originalCoachIds.every(id=>!spaces.data.some(w=>w.coach_id===id)))
ledger.setup={passed:true,at:new Date().toISOString(),originalReservations:2,lifetimeWorkspaces:7};h.save();console.log(JSON.stringify(ledger.setup))
