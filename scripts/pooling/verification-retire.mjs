// Revoke and disable ONLY the three A32-owned engineering identities. Preserve
// all historical rows, original users, fixed expiry and the original coach window.
import assert from 'node:assert/strict'
import {verificationHarness} from './verification-runtime.mjs'
const h=verificationHarness(),{ledger,admin}=h
assert(ledger.finalChecks?.passed&&ledger.finalPreview?.passed,'Final hosted verification must be recorded first')
assert.equal(ledger.users.length,3);assert(ledger.previewBuilds<=4)
const originals=ledger.originalCoachIds;assert.equal(originals.length,2)
const config=await admin.from('pooling_test_config').select('*').single();assert.ifError(config.error)
assert(config.data.enabled&&Date.parse(config.data.ends_at)===Date.parse(ledger.endsAt))
assert(config.data.coach_ids.every(id=>originals.includes(id)||ledger.users.some(u=>u.id===id)))
for(const id of originals){const r=await admin.auth.admin.getUserById(id);assert.ifError(r.error);assert(!(Date.parse(r.data.user.banned_until)>Date.now()))}
for(const u of ledger.users){
 assert(!originals.includes(u.id));assert(u.clientId.startsWith('fs_pool_coachtest_'))
 const account=await admin.auth.admin.getUserById(u.id);assert.ifError(account.error);assert.equal(account.data.user.user_metadata.fixture,ledger.runId);assert.equal(account.data.user.user_metadata.scope,'A32')
 const workspace=await admin.from('pooling_test_workspaces').select('*').eq('client_id',u.clientId).single();assert.ifError(workspace.error);assert.equal(workspace.data.coach_id,u.id)
 assert.equal(workspace.data.manifest_id,u.manifestId);assert.equal(workspace.data.notice_id,u.noticeId)
 if(!(Date.parse(account.data.user.banned_until)>Date.now())){
  const c=await h.signIn(u.label),history=await h.rpc(c,'pooling_read_assignments',{target_client:u.clientId},0)
  const runtime=await h.rpc(c,'pooling_revoke_test_workspace',{target_client:u.clientId},1);assert(runtime.revoked&&runtime.governed&&!runtime.r1&&!runtime.r2&&!runtime.r3)
  const preserved=await h.rpc(c,'pooling_read_assignments',{target_client:u.clientId},0);assert.deepEqual(preserved.map(a=>({id:a.id,status:a.status,actuals:a.actuals})),history.map(a=>({id:a.id,status:a.status,actuals:a.actuals})))
  const blocked=await c.rpc('pooling_test_scenario',{target_client:u.clientId});assert.equal(blocked.error?.message,'test_unavailable')
  const {data:{session}}=await c.auth.getSession();const out=await admin.auth.admin.signOut(session.access_token,'global');assert.ifError(out.error)
  const ban=await admin.auth.admin.updateUserById(u.id,{ban_duration:'876000h'});assert.ifError(ban.error)
 }
 const now=new Date().toISOString()
 for(const [table,id,patch]of [['pooling_manifests',u.manifestId,{state:'revoked'}],['pooling_policy_documents',u.noticeId,{state:'withdrawn'}],['pooling_scope_grants',u.clientId+'_scope',{revoked_at:now}]]){
  assert(id.startsWith(u.clientId+'_'));const r=await admin.from(table).update(patch).eq('id',id).select('id');assert.ifError(r.error);assert.equal(r.data.length,1)
 }
 const denied=await h.client().auth.signInWithPassword({email:u.email,password:u.password});assert.equal(denied.error?.code,'user_banned')
 u.state='retired';u.disabledAt=now;h.save()
}
const restored=await admin.from('pooling_test_config').update({coach_ids:config.data.coach_ids.filter(id=>originals.includes(id))}).eq('singleton',true).select('*').single();assert.ifError(restored.error);assert.equal(restored.data.coach_ids.length,2)
const flags=await admin.from('pooling_runtime').select('*').single();assert.ifError(flags.error);assert.deepEqual(flags.data,{singleton:true,r1:false,r2:false,r3:false})
ledger.retirement={passed:true,recordedAt:new Date().toISOString(),newTestUsersBanned:3,originalCoachesAvailable:2,allNewWorkspacesRevoked:true,historyRetained:true,globalFlagsOff:true,endsAt:restored.data.ends_at};h.save();console.log(JSON.stringify(ledger.retirement))
