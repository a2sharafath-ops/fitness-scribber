// Safe retirement is independent of test success. Never delete fixture history.
import assert from 'node:assert/strict'
import {a33Harness} from './a33-runtime.mjs'
const h=a33Harness(),{ledger,admin}=h;h.beginCleanup()
assert.equal(ledger.users.length,2);assert.equal(ledger.workspaces.length,3)
const originals=ledger.originalCoachIds;assert.equal(originals.length,2)
const config=await admin.from('pooling_test_config').select('*').single();assert.ifError(config.error)
assert(config.data.enabled&&Date.parse(config.data.ends_at)===Date.parse(ledger.endsAt))
assert(config.data.coach_ids.every(id=>originals.includes(id)||ledger.users.some(u=>u.id===id)))
for(const u of ledger.users){
 assert(!originals.includes(u.id))
 const account=await admin.auth.admin.getUserById(u.id);assert.ifError(account.error)
 assert.equal(account.data.user.user_metadata.fixture,ledger.runId);assert.equal(account.data.user.user_metadata.scope,'A33')
 const spaces=ledger.workspaces.filter(w=>w.coachId===u.id);assert.equal(spaces.length,u.workspaceLimit)
 const active=!(Date.parse(account.data.user.banned_until)>Date.now()),actor=active?await h.signIn(u.label):null
 for(const w of spaces){
  assert(w.clientId.startsWith('fs_pool_coachtest_'))
  const row=await admin.from('pooling_test_workspaces').select('*').eq('client_id',w.clientId).single();assert.ifError(row.error)
  assert.equal(row.data.coach_id,u.id);assert.equal(row.data.manifest_id,w.manifestId);assert.equal(row.data.notice_id,w.noticeId)
  if(actor){
   const before=await h.rpc(actor,'pooling_read_assignments',{target_client:w.clientId},0)
   assert(!before.some(a=>['start','pause','resume'].includes(a.status)),'Reconcile and Stop open fictional sessions before retirement')
   const result=await h.rpc(actor,'pooling_revoke_test_workspace',{target_client:w.clientId},0);assert(result.revoked&&result.governed&&!result.r1&&!result.r2&&!result.r3)
   const after=await h.rpc(actor,'pooling_read_assignments',{target_client:w.clientId},0)
   assert.deepEqual(after.map(a=>({id:a.id,status:a.status,actuals:a.actuals})),before.map(a=>({id:a.id,status:a.status,actuals:a.actuals})))
  }else assert(row.data.revoked_at,'Banned fixture workspace still active; investigate')
  const mapped=await admin.from('pooling_engineering_releases').select('manifest_id').eq('client_id',w.clientId);assert.ifError(mapped.error)
  const now=new Date().toISOString()
  for(const mid of [w.manifestId,...mapped.data.map(r=>r.manifest_id)]){assert(mid.startsWith(w.clientId+'_'));const r=await admin.from('pooling_manifests').update({state:'revoked'}).eq('id',mid);assert.ifError(r.error)}
  for(const [table,id,patch]of [['pooling_policy_documents',w.noticeId,{state:'withdrawn'}],['pooling_scope_grants',w.clientId+'_scope',{revoked_at:now}]]){const r=await admin.from(table).update(patch).eq('id',id);assert.ifError(r.error)}
  if(mapped.data.length){const r=await admin.from('pooling_engineering_releases').update({revoked_at:now}).eq('client_id',w.clientId).is('revoked_at',null);assert.ifError(r.error)}
 }
 const revoked=await admin.from('pooling_engineering_slots').update({revoked_at:new Date().toISOString()}).eq('coach_id',u.id).eq('run_id',ledger.runId).is('revoked_at',null);assert.ifError(revoked.error)
 if(actor){const {data:{session}}=await actor.auth.getSession();const out=await admin.auth.admin.signOut(session.access_token,'global');assert.ifError(out.error);const ban=await admin.auth.admin.updateUserById(u.id,{ban_duration:'876000h'});assert.ifError(ban.error)}
 const denied=await h.client().auth.signInWithPassword({email:u.email,password:u.password});assert.equal(denied.error?.code,'user_banned')
 u.state='retired';u.disabledAt=new Date().toISOString();h.save()
}
const restored=await admin.from('pooling_test_config').update({coach_ids:originals}).eq('singleton',true).eq('ends_at',ledger.endsAt).select('*').single();assert.ifError(restored.error);assert.deepEqual(restored.data.coach_ids,originals)
for(const id of originals){const r=await admin.auth.admin.getUserById(id);assert.ifError(r.error);assert(!(Date.parse(r.data.user.banned_until)>Date.now()))}
const flags=await admin.from('pooling_runtime').select('*').single();assert.ifError(flags.error);assert.deepEqual(flags.data,{singleton:true,r1:false,r2:false,r3:false})
ledger.retirement={passed:true,at:new Date().toISOString(),newAccountsBanned:2,newWorkspacesRevoked:3,historyRetained:true,originalCoachesPreserved:2,globalFlagsOff:true,endsAt:ledger.endsAt};h.save();console.log(JSON.stringify(ledger.retirement))
