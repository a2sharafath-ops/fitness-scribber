// Current deployment authorization and exact transport receipts, fictional only.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {verificationHarness} from './verification-runtime.mjs'
const h=verificationHarness(),{ledger,admin,check}=h,a=ledger.users.find(u=>u.label==='a32-a'),b=ledger.users.find(u=>u.label==='a32-b')
const actor=await h.signIn(b.label),base={clientId:a.clientId,draftId:ledger.verification[a.label].baseline.draftId,expectedGeneration:10},op=h.key('v2-access')
const requests={
 'pooling-decision':base,
 'pooling-context-review':{...base,operationKey:op,reference:'Fictional access test'},
 'pooling-extension':{...base,requestId:1,baselineAssignmentId:1,policyId:'fictional'},
 'pooling-weekly':{clientId:a.clientId,expectedGeneration:10,operationKey:op,week:{constraints:{slots:[{draftId:base.draftId}]}}},
 'pooling-suggestion':{...base,operationKey:op,mode:'generate'},
 'pooling-publication':{clientId:a.clientId,submissionId:1,acceptanceId:'fictional',action:'publish',reason:'Fictional access test'},
}
for(const [name,body] of Object.entries(requests)){const r=await h.edge(actor,name,body);check('A32 v2 '+name+' rejects valid cross-owner JWT',r.status===403&&r.data.error==='forbidden',{status:r.status})}
const bad=await h.edge(actor,'pooling-decision',base,{rawToken:'not-a-valid-jwt'});check('A32 v2 malformed JWT denied',[401,403].includes(bad.status))
const forge=await actor.rpc('pooling_decision_input',{verified_actor:a.id,target_client:a.clientId,target_draft:base.draftId});check('A32 authenticated actor cannot impersonate service role',!!forge.error)
const refreshed=await actor.auth.refreshSession();assert.ifError(refreshed.error);assert.equal(refreshed.data.user.id,b.id);assert(refreshed.data.session.expires_at>Date.now()/1000)
const token=refreshed.data.session.refresh_token
await actor.auth.signOut({scope:'local'})
const signedOut=await h.client().auth.refreshSession({refresh_token:token});check('A32 real refresh succeeds; explicitly signed-out refresh token cannot resume',!!signedOut.error)
const transport=JSON.parse(readFileSync(join(dirname(h.file),'transport-evidence.json'),'utf8'))
const faults=transport.events.filter(e=>e.fault==='response_dropped_after_hosted_commit')
assert(faults.some(e=>e.path.endsWith('/pooling_execution')));assert(faults.some(e=>e.path.endsWith('/pooling_save_draft')))
for(const event of faults){
 const table=event.path.endsWith('/pooling_execution')?'pooling_execution_events':'pooling_drafts'
 const r=await admin.from(table).select('id').eq(table==='pooling_execution_events'?'actor_id':'client_id',table==='pooling_execution_events'?a.id:a.clientId).eq('operation_key',event.operationKey);assert.ifError(r.error);assert.equal(r.data.length,1)
 check('A32 browser dropped-commit response reconciles to exactly one '+table,true,{receiptId:event.receipt.eventId??event.receipt.id})
}
const execution=await admin.from('pooling_execution_events').select('kind,payload,id').eq('assignment_id',ledger.verification[a.label].baseline.assignmentId);assert.ifError(execution.error)
assert.equal(execution.data.filter(e=>e.kind==='actual').length,2);assert(execution.data.some(e=>e.kind==='actual'&&e.payload.actual===0));assert(execution.data.some(e=>e.kind==='stop'))
check('A32 browser offline pending actual plus independent Stop retain zero and both actuals',true)
const drafts=await admin.from('pooling_drafts').select('id,proposal').eq('client_id',a.clientId).eq('proposal->>source','manual_or_imported_builder');assert.ifError(drafts.error)
const ui=drafts.data.filter(d=>d.proposal.notes?.startsWith('FICTIONAL A32 local parser verification'))
assert.equal(ui.length,4);assert.deepEqual(ui.map(d=>d.proposal.date).sort(),['2026-09-08','2026-09-09','2026-09-10','2026-09-11'])
assert(ui.every(d=>d.proposal.blocks.flatMap(b=>b.exercises).length===1));
const assignments=await admin.from('pooling_assignments').select('id').in('draft_id',ui.map(d=>d.id));assert.ifError(assignments.error);assert.equal(assignments.data.length,0)
check('A32 actual manual/local-parser/tomorrow/two-date bulk UI produces four single-exercise drafts, no assignments',true)
const times=transport.events.filter(e=>e.status===200&&e.path.startsWith('/rest/v1/rpc/pooling_')&&Number.isFinite(e.ms)).map(e=>e.ms).sort((a,b)=>a-b)
ledger.finalChecks={passed:true,at:new Date().toISOString(),droppedResponses:faults.length,offlineRequests:transport.events.filter(e=>e.fault==='offline_before_send').length,proxyRequests:transport.requests,proxyWriteRequests:transport.writes,rpcLatency:{samples:times.length,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.min(times.length-1,Math.floor(times.length*.95))],scope:'Mixed warm/cold sequential browser sample including proxy overhead; not a load or SLA certificate'},manualDraftIds:ui.map(d=>d.id)};h.save()
console.log(JSON.stringify(ledger.finalChecks))
