// Bounded A31 setup. The sixth/final synthetic identity first exercises a real
// hosted client-role denial, then the same run-owned identity tests coach UX.
// No retired account is unbanned and no existing person's role is changed.
import {readFileSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import {harness} from './hosted-test-runtime.mjs'
import {coachTestTemplate} from './coach-test-template.mjs'
const migration=JSON.parse(readFileSync('.recovery/hosted-test/baseline-bucN7d/a31-hosted-migration-result.json','utf8'))
assert.equal(migration.passed,true)
const h=harness('.recovery/hosted-test/run-pINCGI/ledger.json'),{ledger,admin,check}=h
ledger.a31??={checks:[],startedAt:new Date().toISOString()};h.save()
let user=ledger.users.find(u=>u.label==='a31-client-coach-test')
if(!user){
 assert.equal(ledger.users.length,5)
 user={label:'a31-client-coach-test',role:'athlete',email:'a31.'+ledger.runId+'@example.invalid',password:randomBytes(27).toString('base64url'),state:'create_requested'}
 ledger.users.push(user);h.save()
}
assert.equal(ledger.users.length,6)
if(!user.id){
 h.reserve();const existing=await admin.auth.admin.listUsers({page:1,perPage:100});assert.ifError(existing.error)
 assert(existing.data.users.length<100,'bounded auth inventory must fit one page')
 const found=existing.data.users.filter(u=>u.email===user.email)
 assert(found.length<=1)
 if(found.length){assert.equal(found[0].user_metadata.fixture,ledger.runId);user.id=found[0].id}
 else{h.reserve();const created=await admin.auth.admin.createUser({email:user.email,password:user.password,email_confirm:true,user_metadata:{fixture:ledger.runId,fictional:true,scope:'A31'}});assert.ifError(created.error);user.id=created.data.user.id}
 user.state='active';h.save()
}
assert.equal(user.state,'active','Do not reactivate a retired test identity')
if(!ledger.a31.clientRoleChecked){
 h.reserve(1);const profile=await admin.from('profiles').upsert({id:user.id,role:'athlete',displayName:'Fictional A31 software tester'});assert.ifError(profile.error)
 const client=await h.signIn(user.label)
 const result=await client.rpc('pooling_create_test_workspace',{acknowledged:true});check('A31 hosted client role cannot create a coach workspace',result.error?.message==='forbidden')
 const elevation=await client.from('profiles').update({role:'coach'}).eq('id',user.id);check('A31 hosted client cannot self-promote',!!elevation.error)
 const configWrite=await client.from('pooling_test_config').update({enabled:true}).eq('singleton',true);check('A31 hosted client cannot edit test enrollment configuration',!!configWrite.error)
 await client.auth.signOut();ledger.a31.clientRoleChecked=true;h.save()
}
if(!ledger.a31.coachReady){
 h.reserve();const role=await admin.from('profiles').update({role:'coach'}).eq('id',user.id);assert.ifError(role.error)
 user.role='coach'
 await h.insert('settings',{coachId:user.id,trainerName:'Fictional Software Tester',businessName:'A31 engineering scenario only',units:'kg',tz:'UTC'})
 ledger.a31.coachReady=true;h.save()
}
const profiles=await admin.from('profiles').select('id,role').eq('role','coach');assert.ifError(profiles.error)
const oldIds=ledger.users.map(u=>u.id),existingCoaches=profiles.data.filter(p=>!oldIds.includes(p.id))
assert.equal(existingCoaches.length,2,'Exact existing coach population must remain unchanged')
const ids=[...existingCoaches.map(p=>p.id).sort(),user.id]
const before=await admin.from('pooling_test_config').select('*').maybeSingle();assert.ifError(before.error)
if(before.data){
 assert.deepEqual(before.data.coach_ids,ids);assert.equal(before.data.enabled,true)
 ledger.a31.endsAt=before.data.ends_at
}else{
 ledger.a31.endsAt??=new Date(Date.now()+7*86400000).toISOString();h.save()
 h.reserve(1);const configuration=await admin.from('pooling_test_config').insert({singleton:true,enabled:true,ends_at:ledger.a31.endsAt,coach_ids:ids,template:coachTestTemplate()});assert.ifError(configuration.error)
}
ledger.a31.existingCoachIds=existingCoaches.map(p=>p.id);ledger.a31.testUserId=user.id;ledger.a31.setupReady=true;h.save()
const flags=await admin.from('pooling_runtime').select('*').single();assert.ifError(flags.error)
check('A31 global flags remain off after scoped setup',!flags.data.r1&&!flags.data.r2&&!flags.data.r3)
for(const old of ledger.users.filter(u=>u.id!==user.id)){
 const info=await admin.auth.admin.getUserById(old.id);assert.ifError(info.error)
 assert(Date.parse(info.data.user.banned_until)>Date.now(),'Retired test user must remain banned')
}
const coach=await h.signIn(user.label),status=await h.rpc(coach,'pooling_test_status',{})
check('A31 normal coach JWT can access bounded test entry point',status.available===true&&status.clientId===null)
await coach.auth.signOut()
console.log(JSON.stringify({setupReady:true,existingCoaches:2,oldTestUsersStillBanned:5,totalCreatedAuthUsers:6,endsAt:ledger.a31.endsAt,globalFlagsOff:true,workspaceNotYetCreated:true}))
