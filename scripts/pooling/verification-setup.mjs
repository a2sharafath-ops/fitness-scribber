import {readFileSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import {verificationHarness} from './verification-runtime.mjs'
const migration=JSON.parse(readFileSync('.recovery/hosted-test/baseline-xWSVzw/a32-hosted-migration.json','utf8'));assert.equal(migration.passed,true)
const h=verificationHarness(true),{ledger,admin}=h
const label=process.argv[2]||'a32-a';assert(['a32-a','a32-b','a32-c'].includes(label))
const old=JSON.parse(readFileSync('.recovery/hosted-test/run-pINCGI/ledger.json','utf8'))
assert(old.a31.retirement?.allSixTestUsersBanned)
const originals=old.a31.existingCoachIds
const flags=await admin.from('pooling_runtime').select('*').single();assert.ifError(flags.error);assert(!flags.data.r1&&!flags.data.r2&&!flags.data.r3)
for(const id of originals){const u=await admin.auth.admin.getUserById(id);assert.ifError(u.error);assert(!(Date.parse(u.data.user.banned_until)>Date.now()))}
let u=ledger.users.find(u=>u.label===label)
if(!u){assert(ledger.users.length<3);u={label,role:'coach',email:label+'.'+ledger.runId+'@example.invalid',password:randomBytes(27).toString('base64url'),state:'create_requested'};ledger.users.push(u);h.save()}
if(!u.id){
 h.reserve();const users=await admin.auth.admin.listUsers({page:1,perPage:100});assert.ifError(users.error);assert(users.data.users.length<100)
 const found=users.data.users.find(row=>row.email===u.email)
 if(found){assert.equal(found.user_metadata.fixture,ledger.runId);u.id=found.id}
 else{h.reserve();const created=await admin.auth.admin.createUser({email:u.email,password:u.password,email_confirm:true,user_metadata:{fixture:ledger.runId,fictional:true,scope:'A32'}});assert.ifError(created.error);u.id=created.data.user.id}
 u.state='active';h.save()
}
assert.equal(u.state,'active','Retired accounts must not be reactivated')
if(!u.prepared){
 h.reserve(1);const p=await admin.from('profiles').upsert({id:u.id,role:'coach',displayName:'FICTIONAL A32 SOFTWARE TEST'});assert.ifError(p.error)
 await h.insert('settings',{coachId:u.id,trainerName:'FICTIONAL A32 SOFTWARE TEST',businessName:'Engineering scenario only',units:'kg',tz:'UTC'})
 u.prepared=true;h.save()
}
const config=await admin.from('pooling_test_config').select('coach_ids,ends_at,enabled').single();assert.ifError(config.error)
assert(config.data.enabled&&Date.parse(config.data.ends_at)>Date.now());assert(originals.every(id=>config.data.coach_ids.includes(id)))
assert(config.data.coach_ids.every(id=>originals.includes(id)||ledger.users.some(u=>u.id===id)))
const ids=[...new Set([...config.data.coach_ids,u.id])];assert(ids.length<=5)
h.reserve();const change=await admin.from('pooling_test_config').update({coach_ids:ids}).eq('singleton',true).eq('ends_at',config.data.ends_at);assert.ifError(change.error)
const coach=await h.signIn(label)
const workspace=await h.rpc(coach,'pooling_create_test_workspace',{acknowledged:true},10)
assert(workspace.testOnly&&workspace.r1);u.clientId=workspace.clientId;u.manifestId=workspace.manifestId;u.noticeId=workspace.noticeId;ledger.clientIds[label]=u.clientId;ledger.originalCoachIds=originals;ledger.endsAt=config.data.ends_at;ledger.backup=migration.backup;h.save()
await coach.auth.signOut({scope:'local'})
h.check('A32 new fictional workspace; original coach access and global-off preserved',true,{label,clientId:u.clientId,createdAuthUsers:ledger.users.length,expiresAt:workspace.expiresAt})
