import assert from 'node:assert/strict'
import {harness} from './hosted-test-runtime.mjs'
const h=harness(process.argv[2]),{ledger,admin,check}=h,cid=ledger.clientIds.a,f=ledger.state.r1
if(!ledger.state.r2Passed||ledger.state.r3Started)throw Error('fresh_r3_after_r2_required')
ledger.state.r3Started=true;h.save()
const coach=await h.signIn('coach-a'),athlete=await h.signIn('client-a')
const on=await admin.from('pooling_runtime').update({r1:true,r2:true,r3:true}).eq('singleton',true).select().single();assert.ifError(on.error);ledger.state.flags=on.data;h.save();check('R3 enabled after R2 verification',on.data.r3)
const id=ledger.state.r2.assignmentId,g=ledger.state.r2.generation
const execute=(event_kind,event_payload,key,gen=g)=>h.rpc(athlete,'pooling_execution',{assignment_id:id,expected_generation:gen,operation_key:h.key(key),event_kind,event_payload},1)
await execute('start',{healthChange:'no_change'},'r3-history-start')
const first=await execute('actual',{occurrenceId:'fictional-occ1',setIndex:1,actual:1,unit:'seconds',effort:0,effortMethod:'wrong-method'},'r3-history-first')
await execute('actual',{occurrenceId:'fictional-occ1',setIndex:2,actual:2,unit:'seconds',effort:0,effortMethod:'fictional-effort'},'r3-history-second');await execute('complete',{},'r3-history-complete')
const original=await admin.from('pooling_execution_events').select('payload,recorded_at').eq('id',first.eventId).single();assert.ifError(original.error)
const at=new Date().toISOString(),later=new Date(Date.now()+300000).toISOString(),secondSlot=new Date(Date.parse(later)+30000).toISOString()
ledger.state.r3={at,later,secondSlot,firstEventId:first.eventId};h.save()
const generation=async()=>{const r=await admin.from('pooling_contexts').select('generation').eq('client_id',cid).single();assert.ifError(r.error);return r.data.generation}
const inventory=await h.rpc(admin,'pooling_source_inventory',{verified_actor:ledger.users.find(u=>u.label==='coach-a').id,target_client:cid}),source=inventory.find(r=>r.source==='clients'&&r.id===cid)
for(const sessionAt of [later,secondSlot])for(const [key,value] of [['health','no_change'],['equipment',[]]]){
 await h.rpc(coach,'pooling_confirm_source',{target_client:cid,expected_generation:await generation(),operation_key:h.key('r3-'+key+'-'+sessionAt),observation:{key,value,source:'clients',sourceId:cid,sourceToken:source.token,state:'reported',unit:'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt:at,sessionAt,evidenceReference:'Fictional per-session source confirmation'}},2)
}
const gen=await generation(),targetProposal={...f.proposal,session:{...f.proposal.session,sessionAt:later}}
ledger.state.r3.generation=gen;ledger.state.r3.targetProposal=targetProposal;h.save()
const draft=(label,proposal)=>h.rpc(coach,'pooling_save_draft',{target_client:cid,expected_generation:gen,operation_key:h.key('r3-'+label),proposal},2)
const target=await draft('progression-target',targetProposal)
const request=await h.rpc(athlete,'pooling_request_extension',{target_client:cid,expected_generation:gen,operation_key:h.key('r3-intent'),proposal:{kind:'progression',date:targetProposal.date,requestedChange:'Fictional progression comparison only',blocks:[],authority:'none',state:'review_requested'}},1)
const edgeRequest={clientId:cid,draftId:target.id,expectedGeneration:gen,requestId:request.id,baselineAssignmentId:id,policyId:'fictional-progression'}
const insufficient=await h.edge(coach,'pooling-extension',edgeRequest)
check('Hosted progression rejects mismatched effort evidence',insufficient.status===200&&insufficient.data.result?.state==='insufficient_evidence',{status:insufficient.status,state:insufficient.data.result?.state,error:insufficient.data.error})
await execute('actual',{...original.data.payload,performedAt:original.data.recorded_at,supersedes:first.eventId,correctionReason:'Fictional effort-method typo correction',effortMethod:'fictional-effort'},'r3-correction',gen)
const result=await h.edge(coach,'pooling-extension',edgeRequest)
check('Hosted progression uses one complete comparable occurrence',result.status===200&&result.data.result?.state==='proposal'&&result.data.result.effects[0].to===2&&result.data.result.comparisons[0].included.length===1,{status:result.status,state:result.data.result?.state,error:result.data.error})
const review=await h.rpc(coach,'pooling_review_extension',{target_client:cid,request_id:request.id,expected_generation:gen,operation_key:h.key('r3-review'),action:'accept',reason:'Fictional exact progression proposal',proposal_id:result.data.receipt.id},2)
const count=await admin.from('pooling_assignments').select('id').eq('draft_id',review.draftId);assert.ifError(count.error);check('Progression acceptance remains unassigned',count.data.length===0)
const retained=await admin.from('pooling_execution_events').select('payload').eq('id',first.eventId).single();assert.deepEqual(retained.data.payload,original.data.payload);check('Actual correction retains original evidence',true)
ledger.state.r3.progressionDraft=review.draftId;ledger.state.r3.progressionPassed=true;h.save()
// Weekly composition uses explicitly confirmed per-session equipment/health,
// fictional arithmetic-only constraints, and explicit two-item coach approval.
const slots=[]
for(const sessionAt of [later,secondSlot]){
 const d=await draft('week-'+sessionAt,{...targetProposal,session:{...targetProposal.session,sessionAt,request:{...targetProposal.session.request,goalPriority:['fictional']}}})
 slots.push({id:'fixture-slot-'+d.id,draftId:d.id,budgetSeconds:10,support:'none'})
}
const weekRequest={clientId:cid,expectedGeneration:gen,operationKey:h.key('r3-week'),week:{manifestId:f.manifestId,policyId:'fictional-weekly',constraints:{startDate:later.slice(0,10),timeZone:'UTC',split:'fictional',goalPriority:['fictional'],slots}}}
const week=await h.edge(coach,'pooling-weekly',weekRequest)
check('Hosted weekly review ready, not assigned',week.status===200&&week.data.result?.state==='ready_for_coach_review'&&week.data.assignment===null,{status:week.status,state:week.data.result?.state,error:week.data.error})
assert.deepEqual((await h.edge(coach,'pooling-weekly',weekRequest)).data.receipt,week.data.receipt)
const approve={target_client:cid,target_week:week.data.receipt.id,expected_generation:gen,operation_key:h.key('r3-week-approve')}
const denied=await athlete.rpc('pooling_approve_week',approve);check('Client cannot approve weekly plan',denied.error?.message==='forbidden')
const approved=await h.rpc(coach,'pooling_approve_week',approve,4);assert.deepEqual(await h.rpc(coach,'pooling_approve_week',approve,4),approved);check('Atomic weekly approval creates exactly two assignments',approved.assignments.length===2)
const revised=structuredClone(weekRequest);revised.operationKey=h.key('r3-week-revised');revised.week.constraints.slots[0].support='unconfirmed'
const blocked=await h.edge(coach,'pooling-weekly',revised);check('Unconfirmed weekly support blocks planning',blocked.status===200&&blocked.data.result?.state==='blocked',{status:blocked.status,state:blocked.data.result?.state})
const stale=await athlete.rpc('pooling_execution',{assignment_id:approved.assignments[0].assignmentId,expected_generation:gen,operation_key:h.key('r3-superseded-start'),event_kind:'start',event_payload:{healthChange:'no_change'}})
check('Superseded weekly decision cannot start',!!stale.error&&/stale_draft|source_changed/.test(stale.error.message))
ledger.state.r3.weeklyPassed=true;ledger.state.r3Passed=true;h.save();console.log(JSON.stringify({r3Passed:true,rowsReserved:ledger.rowsReserved}))
