// Retire ONLY the sixth engineering identity after the final browser check.
// Keep the two original coaches' seven-day entry enabled; never delete history.
import assert from 'node:assert/strict'
import {harness} from './hosted-test-runtime.mjs'
const h=harness('.recovery/hosted-test/run-pINCGI/ledger.json'),{ledger,admin}=h
assert.equal(ledger.a31?.finalPreviewSmoke?.passed,true)
assert.equal(ledger.previewBuilds,10)
const user=ledger.users.find(u=>u.label==='a31-client-coach-test')
assert(user?.id===ledger.a31.testUserId && ledger.users.length===6)
const cid=ledger.a31.clientId
assert(cid.startsWith('fs_pool_coachtest_'))
const workspace=await admin.from('pooling_test_workspaces').select('*').eq('client_id',cid).single();assert.ifError(workspace.error)
assert.equal(workspace.data.coach_id,user.id);assert(workspace.data.revoked_at,'Revoke this engineering workspace in the browser first')
const originalIds=[...ledger.a31.existingCoachIds].sort();assert.equal(originalIds.length,2);assert(!originalIds.includes(user.id))
const config=await admin.from('pooling_test_config').select('enabled,ends_at,coach_ids').single();assert.ifError(config.error)
assert.equal(config.data.enabled,true);assert.equal(Date.parse(config.data.ends_at),Date.parse(ledger.a31.endsAt))
assert.deepEqual(config.data.coach_ids.filter(id=>id!==user.id).sort(),originalIds)
assert(config.data.coach_ids.every(id=>id===user.id||originalIds.includes(id)))
const coaches=await admin.from('profiles').select('id,role').in('id',originalIds);assert.ifError(coaches.error)
assert.equal(coaches.data.length,2);assert(coaches.data.every(c=>c.role==='coach'))
const account=await admin.auth.admin.getUserById(user.id);assert.ifError(account.error)
assert.equal(account.data.user.user_metadata.fixture,ledger.runId)
if(!(Date.parse(account.data.user.banned_until)>Date.now())){
 const coach=await h.signIn(user.label)
 const runtime=await h.rpc(coach,'pooling_client_runtime',{target_client:cid})
 assert(!runtime.r1&&!runtime.r2&&!runtime.r3&&runtime.governed&&runtime.revoked)
 const scenario=await coach.rpc('pooling_test_scenario',{target_client:cid});assert.equal(scenario.error?.message,'test_unavailable')
 const history=await h.rpc(coach,'pooling_read_assignments',{target_client:cid})
 assert(history.some(a=>a.status==='complete'&&a.actuals.length===3))
 assert(history.some(a=>a.id===ledger.a31.finalPreviewSmoke.assignmentId&&a.status==='stopped'&&a.actuals.length>=2))
 const {data:{session}}=await coach.auth.getSession()
 const logout=await admin.auth.admin.signOut(session.access_token,'global');assert.ifError(logout.error)
 const ban=await admin.auth.admin.updateUserById(user.id,{ban_duration:'876000h'});assert.ifError(ban.error)
}
// The fixed window is not extended. Existing owners can still enroll NEW fixtures.
const available=await admin.from('pooling_test_config').update({coach_ids:originalIds}).eq('singleton',true).select('enabled,ends_at,coach_ids').single();assert.ifError(available.error)
assert.equal(available.data.enabled,true);assert.deepEqual([...available.data.coach_ids].sort(),originalIds)
const now=new Date().toISOString()
for(const [table,id,patch] of [
 ['pooling_manifests',workspace.data.manifest_id,{state:'revoked'}],
 ['pooling_policy_documents',workspace.data.notice_id,{state:'withdrawn'}],
 ['pooling_scope_grants',cid+'_scope',{revoked_at:now}],
]){
 assert(id.startsWith(cid+'_'))
 const result=await admin.from(table).update(patch).eq('id',id).select('id');assert.ifError(result.error);assert.equal(result.data.length,1)
}
const retry=await h.client().auth.signInWithPassword({email:user.email,password:user.password});assert.equal(retry.error?.code,'user_banned')
for(const retired of ledger.users){const result=await admin.auth.admin.getUserById(retired.id);assert.ifError(result.error);assert(Date.parse(result.data.user.banned_until)>Date.now())}
const flags=await admin.from('pooling_runtime').select('*').single();assert.ifError(flags.error)
assert.deepEqual(flags.data,{singleton:true,r1:false,r2:false,r3:false})
user.state='retired';user.disabledAt=now
ledger.a31.retirement={passed:true,recordedAt:now,existingCoachesAvailable:2,engineeringWorkspaceRevoked:true,allSixTestUsersBanned:true,globalFlagsOff:true,historyRetained:true,endsAt:available.data.ends_at}
h.save();console.log(JSON.stringify(ledger.a31.retirement))
