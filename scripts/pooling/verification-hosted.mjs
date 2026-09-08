// Normal hosted JWT/RPC/Edge integration using A32 run-owned fictional clients.
import assert from 'node:assert/strict'
import {verificationHarness} from './verification-runtime.mjs'
import {prepareFictionalScenario} from '../../src/lib/pooling/test-preparation.js'
import {builderDraft} from '../../src/lib/pooling/drafts.js'
const h=verificationHarness(),{ledger,admin,check}=h,label=process.argv[2]||'a32-a',phase=process.argv[3]||'baseline'
const user=ledger.users.find(u=>u.label===label),cid=user?.clientId;assert(cid&&user.state==='active')
const coach=await h.signIn(label),otherSession=await h.signIn(label)
ledger.verification??={};const state=ledger.verification[label]??={};h.save()
const gen=async()=>{const r=await admin.from('pooling_contexts').select('generation,held').eq('client_id',cid).single();assert.ifError(r.error);return r.data.generation}
const key=s=>h.key(label+'-'+phase+'-'+s)
const rpc=(name,args,rows=1)=>h.rpc(coach,name,args,rows)
async function edge(name,body){const r=await h.edge(coach,name,body);assert.equal(r.status,200,JSON.stringify({name,status:r.status,error:r.data.error}));return r.data}
async function prepare(count=1){
 const scenario=await rpc('pooling_test_scenario',{target_client:cid},0)
 const storage={getItem:k=>state.storage?.[k]??null,setItem:(k,v)=>{state.storage??={};state.storage[k]=v;h.save()},removeItem:k=>{delete state.storage[k];h.save()}}
 const r=await prepareFictionalScenario({clientId:cid,count,scenario,storage,uuid:()=>key('prepare'),api:{
  read:async()=>({context:{generation:await gen()}}),
  confirm:r=>rpc('pooling_confirm_source',{target_client:cid,expected_generation:r.generation,operation_key:r.operationKey,observation:r.observation},2),
  draft:r=>rpc('pooling_save_draft',{target_client:cid,expected_generation:r.generation,operation_key:r.operationKey,proposal:r.proposal},1),
  review:async r=>(await edge('pooling-context-review',{clientId:cid,draftId:r.draftId,expectedGeneration:r.generation,operationKey:r.operationKey,reference:r.reference})).receipt,
 }})
 state.prepared=r;state.proposal=scenario.proposal;h.save();return r
}
async function draft(s,proposal=state.proposal){return rpc('pooling_save_draft',{target_client:cid,expected_generation:await gen(),operation_key:key(s),proposal})}
async function decision(id){return edge('pooling-decision',{clientId:cid,draftId:id,expectedGeneration:await gen()})}
const approve=(d,v,k,g)=>rpc('pooling_approve',{target_client:cid,draft_id:d,decision_id:v,expected_generation:g,operation_key:key(k)})
if(phase==='baseline'&&!state.baseline){
 const prepared=await prepare(),g=prepared.generation,d=prepared.drafts[0].id,v=await decision(d)
 assert.equal(v.result.completeness,'ready_for_coach_review')
 state.baseline={draftId:d,generation:g,decisionId:v.receipt.decisionId};h.save()
 const assignment=await approve(d,v.receipt.decisionId,'baseline-approve',g)
 state.baseline.assignmentId=assignment.assignmentId;h.save()
 check('A32 source-confirmed draft and explicit hosted approval',true,{label,draftId:d,assignmentId:assignment.assignmentId})
}
if(phase==='boundaries'&&!state.boundaries){
 assert(state.baseline)
 const proposal=builderDraft({date:state.proposal.date,notes:'PRIVATE FICTIONAL COACH NOTE',crossClient:true,blocks:[{blockId:'fictional-import',blockType:'main',exercises:[{exerciseId:'legacy-id',exerciseName:'Fictional imported label',approval:true,sets:[{prescribedReps:1,prescribedLoadKg:0,completedReps:9,status:'complete'}]}]}]})
 for(const path of ['manual','template','copy-last','cross-client','bulk','voice-parser']){
  const d=await draft('entry-'+path,proposal),v=await h.edge(coach,'pooling-decision',{clientId:cid,draftId:d.id,expectedGeneration:await gen()})
  // Unmapped imports have no admitted manifest/session: the gateway rejects
  // them before selection. This is stricter than a blocked selection result.
  const denied=v.status===409&&v.data.error==='content_revoked'
  const assigned=await admin.from('pooling_assignments').select('id',{count:'exact',head:true}).eq('draft_id',d.id);assert.ifError(assigned.error)
  check('A32 '+path+' imported draft cannot inherit identity, actuals or assignment',denied&&v.data.assignment===null&&assigned.count===0&&proposal.notes===''&&proposal.blocks[0].exercises[0].sets[0].completedReps===null)
 }
 const g=await gen(),args={target_client:cid,expected_generation:g,operation_key:key('same-draft-two-sessions'),proposal:state.proposal}
 const [a,b]=await Promise.all([h.rpc(coach,'pooling_save_draft',args,1),h.rpc(otherSession,'pooling_save_draft',args,1)])
 assert.deepEqual(a,b)
 const count=await admin.from('pooling_drafts').select('id',{count:'exact',head:true}).eq('client_id',cid).eq('operation_key',args.operation_key);assert.ifError(count.error);assert.equal(count.count,1)
 check('A32 two hosted authenticated sessions retry one key: exactly one durable draft',true)
 const conflict=await coach.rpc('pooling_save_draft',{...args,proposal:{...state.proposal,notes:'different'}});check('A32 same key different payload rejected',conflict.error?.message==='idempotency_conflict')
 const legacy=await coach.from('workouts').insert({id:ledger.runId+'-forbidden-workout',clientId:cid,coachId:user.id,date:state.proposal.date,status:'planned'});check('A32 legacy direct workout insertion cannot bypass governed draft approval',!!legacy.error)
 state.boundaries=true;h.save()
}
if(phase==='races'&&!state.races){
 const d=await draft('race-candidate'),g=await gen(),v=await decision(d.id)
 const args={target_client:cid,draft_id:d.id,decision_id:v.receipt.decisionId,expected_generation:g,operation_key:key('racing-approve')}
 h.reserve(4)
 const [approval,report]=await Promise.all([coach.rpc('pooling_approve',args),otherSession.rpc('pooling_submit_report',{target_client:cid,expected_generation:g,operation_key:key('racing-report'),report_field:'budgetSeconds',report_value:12,effective_at:new Date().toISOString()})])
 assert.ifError(report.error);assert(!approval.error||approval.error.message==='stale_context')
 if(approval.data){const start=await coach.rpc('pooling_execution',{assignment_id:approval.data.assignmentId,expected_generation:g,operation_key:key('post-race-start'),event_kind:'start',event_payload:{healthChange:'no_change'}});assert.equal(start.error?.message,'stale_context')}
 const retry=await coach.rpc('pooling_approve',args)
 // An already committed approval is replayable as history; it cannot restore start authority.
 assert(approval.data?retry.data?.assignmentId===approval.data.assignmentId:retry.error?.message==='stale_context')
 check('A32 real hosted approval/report race: serialization preserves stale-start denial',true,{approvalWon:!!approval.data,newGeneration:await gen()})
 const stale=await coach.rpc('pooling_execution',{assignment_id:state.baseline.assignmentId,expected_generation:state.baseline.generation,operation_key:key('old-baseline-start'),event_kind:'start',event_payload:{healthChange:'no_change'}});check('A32 context change invalidates earlier assignment start',stale.error?.message==='stale_context')
 state.races=true;h.save()
}
if(phase==='refresh'){
 const r=await prepare(2);check('A32 fresh source review prepares two later unassigned weekly slots',r.drafts.length===2);state.weeklyPrepared=r;h.save()
}
const runtime=await rpc('pooling_client_runtime',{target_client:cid},0)
check('A32 per-workspace quota and fixed expiry retained',runtime.remainingWrites>=20&&runtime.testOnly,{remainingWrites:runtime.remainingWrites})
await coach.auth.signOut({scope:'local'});await otherSession.auth.signOut({scope:'local'})
console.log(JSON.stringify({passed:true,label,phase,rowsReserved:ledger.rowsReserved,apiCalls:ledger.apiCalls}))
