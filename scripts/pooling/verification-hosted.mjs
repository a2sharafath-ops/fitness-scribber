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
 const document=await admin.from('pooling_manifests').select('document').eq('id',user.manifestId).single();assert.ifError(document.error)
 scenario.proposal.session.request.goalPriority=document.data.document.extensionPolicies.find(p=>p.kind==='weekly').goals
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
if(phase==='progression'&&!state.progression){
 assert(state.baseline);state.progressionWork??={};const work=state.progressionWork;h.save()
 const base=state.baseline,occurrence=state.proposal.selection[0].occurrenceId
 const execute=(kind,payload,s,g=base.generation)=>rpc('pooling_execution',{assignment_id:base.assignmentId,expected_generation:g,operation_key:key(s),event_kind:kind,event_payload:payload},1)
 if(!work.history){
  await execute('start',{healthChange:'no_change'},'start')
  const first=await execute('actual',{occurrenceId:occurrence,setIndex:1,actual:1,unit:'seconds',effort:0,effortMethod:'wrong-method'},'first')
  await execute('actual',{occurrenceId:occurrence,setIndex:2,actual:1,unit:'seconds',effort:0,effortMethod:'fictional-effort'},'second');await execute('complete',{},'complete')
  work.history={firstEventId:first.eventId};h.save()
 }
 if(!work.target){const p=await prepare();work.target={draftId:p.drafts[0].id,generation:p.generation};h.save()}
 const g=work.target.generation,request=await rpc('pooling_request_extension',{target_client:cid,expected_generation:g,operation_key:key('request'),proposal:{kind:'progression',date:state.proposal.date,requestedChange:'Fictional comparison only',blocks:[],authority:'none',state:'review_requested'}})
 const input={clientId:cid,draftId:work.target.draftId,expectedGeneration:g,requestId:request.id,baselineAssignmentId:base.assignmentId,policyId:'fictional-progression'}
 if(!work.corrected){
  const insufficient=await edge('pooling-extension',input);assert.equal(insufficient.result.state,'insufficient_evidence');check('A32 v2 progression excludes incorrect effort method',true)
  const original=await admin.from('pooling_execution_events').select('payload,recorded_at').eq('id',work.history.firstEventId).single();assert.ifError(original.error)
  work.original=original.data;h.save()
  await execute('actual',{...original.data.payload,performedAt:original.data.payload.performedAt||original.data.recorded_at,supersedes:work.history.firstEventId,correctionReason:'Fictional method correction',effortMethod:'fictional-effort'},'correction',g)
  work.corrected=true;h.save()
 }
 if(!work.proposal){const p=await edge('pooling-extension',input);assert.equal(p.result.state,'proposal');assert.equal(p.result.comparisons[0].included.length,1);assert(p.result.prescriptionChanges.length);work.proposal=p;h.save()}
 const accepted=await rpc('pooling_review_extension',{target_client:cid,request_id:request.id,expected_generation:g,operation_key:key('accept'),action:'accept',reason:'Fictional exact comparison accepted as draft only',proposal_id:work.proposal.receipt.id},2)
 const assigned=await admin.from('pooling_assignments').select('id').eq('draft_id',accepted.draftId);assert.ifError(assigned.error);assert.equal(assigned.data.length,0)
 const retained=await admin.from('pooling_execution_events').select('payload').eq('id',work.history.firstEventId).single();assert.ifError(retained.error);assert.deepEqual(retained.data.payload,work.original.payload)
 check('A32 v2 progression uses comparable history, preserves original actual, creates unassigned child with exact diff',true,{draftId:accepted.draftId})
 state.progression={passed:true,...work,accepted};h.save()
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
if(phase==='weekly'&&!state.weekly){
 const prep=state.weeklyPrepared;assert(prep?.drafts.length===2)
 const g=await gen(),base=await decision(prep.drafts[0].id),baseline=await approve(prep.drafts[0].id,base.receipt.decisionId,'daily-baseline',g)
 state.dailyBaseline=baseline.assignmentId;h.save()
 const proposals=[]
 for(const d of prep.drafts){const r=await admin.from('pooling_drafts').select('proposal').eq('id',d.id).single();assert.ifError(r.error);proposals.push(r.data.proposal)}
 const drafts=[];for(const [i,p]of proposals.entries())drafts.push(await draft('week-slot-'+i,p))
 const request=await rpc('pooling_request_extension',{target_client:cid,expected_generation:g,operation_key:key('daily-request'),proposal:{kind:'daily',date:proposals[0].date,requestedChange:'Fictional exact arithmetic review',blocks:[],authority:'none',state:'review_requested'}})
 const daily=await edge('pooling-extension',{clientId:cid,draftId:drafts[0].id,expectedGeneration:g,requestId:request.id,baselineAssignmentId:baseline.assignmentId,policyId:'fictional-daily'})
 assert.equal(daily.result.state,'proposal');assert.equal(daily.result.prescriptionChanges[0].from.workSeconds,1);assert.equal(daily.result.prescriptionChanges[0].to.workSeconds,2)
 check('A32 hosted numerical proposal supplies exact before/after prescription and time',true)
 const week={manifestId:user.manifestId,policyId:'fictional-weekly',constraints:{startDate:proposals[0].date,timeZone:'UTC',split:'fictional',goalPriority:['fictional'],slots:drafts.map((d,i)=>({id:'a32-slot-'+i,draftId:d.id,budgetSeconds:10,support:'none'}))}}
 const reviewed=await edge('pooling-weekly',{clientId:cid,expectedGeneration:g,operationKey:key('week'),week});assert.equal(reviewed.result.state,'ready_for_coach_review')
 h.reserve(5)
 const [accepted,assigned]=await Promise.all([
  coach.rpc('pooling_review_extension',{target_client:cid,request_id:request.id,expected_generation:g,operation_key:key('daily-accept-race'),action:'accept',reason:'Fictional independent draft review',proposal_id:daily.receipt.id}),
  otherSession.rpc('pooling_approve_week',{target_client:cid,target_week:reviewed.receipt.id,expected_generation:g,operation_key:key('week-approve-race')})])
 state.weeklyRace={accepted:accepted.data,acceptError:accepted.error?.message,assigned:assigned.data,assignError:assigned.error?.message};h.save()
 assert(!accepted.error||['stale_draft','source_changed'].includes(accepted.error.message));assert(!assigned.error||['stale_draft','source_changed'].includes(assigned.error.message))
 if(accepted.data){const copies=await admin.from('pooling_assignments').select('id').eq('draft_id',accepted.data.draftId);assert.ifError(copies.error);assert.equal(copies.data.length,0)}
 const original=await admin.from('pooling_drafts').select('proposal').eq('id',prep.drafts[0].id).single();assert.ifError(original.error);assert.deepEqual(original.data.proposal,proposals[0])
 check('A32 daily acceptance versus weekly approval never compounds baseline or auto-assigns daily child',true,{weekAssigned:!!assigned.data,dailyDraft:accepted.data?.draftId??null})
 // Build a separate current batch, then race a fresh concern with its approval.
 const raceDrafts=[];for(const [i,p]of proposals.entries())raceDrafts.push(await draft('health-week-slot-'+i,p))
 const raceWeek=structuredClone(week);raceWeek.constraints.slots=raceDrafts.map((d,i)=>({id:'a32-health-slot-'+i,draftId:d.id,budgetSeconds:10,support:'none'}))
 const ready=await edge('pooling-weekly',{clientId:cid,expectedGeneration:g,operationKey:key('health-week'),week:raceWeek});assert.equal(ready.result.state,'ready_for_coach_review')
 h.reserve(5)
 const [approval,report]=await Promise.all([
  coach.rpc('pooling_approve_week',{target_client:cid,target_week:ready.receipt.id,expected_generation:g,operation_key:key('health-week-approve')}),
  otherSession.rpc('pooling_submit_report',{target_client:cid,expected_generation:g,operation_key:key('new-health'),report_field:'healthChange',report_value:'changed',effective_at:new Date().toISOString()})])
 assert.ifError(report.error);assert(!approval.error||['stale_context','context_held'].includes(approval.error.message))
 const assignedRows=await admin.from('pooling_assignments').select('id').in('draft_id',raceDrafts.map(d=>d.id));assert.ifError(assignedRows.error)
 assert.equal(assignedRows.data.length,approval.data?2:0)
 for(const a of assignedRows.data){const start=await coach.rpc('pooling_execution',{assignment_id:a.id,expected_generation:g,operation_key:key('held-start-'+a.id),event_kind:'start',event_payload:{healthChange:'no_change'}});assert(['stale_context','context_held'].includes(start.error?.message))}
 check('A32 hosted new-health versus weekly batch race remains all-or-none and cannot start held work',true,{assignments:assignedRows.data.length})
 state.weekly={passed:true,dailyDraft:accepted.data?.draftId??null,reviewId:reviewed.receipt.id,raceReviewId:ready.receipt.id};h.save()
}
if(phase==='weekly-reconcile'&&!state.weekly){
 // Reconcile the original keys after the harness incorrectly required both
 // racing operations to succeed. Never replay a new payload under an old key.
 const priorKey=h.key(label+'-weekly-week'),prior=await admin.from('pooling_week_reviews').select('*').eq('client_id',cid).eq('operation_key',priorKey).single();assert.ifError(prior.error)
 const batch=await admin.from('pooling_week_approvals').select('receipt').eq('week_id',prior.data.id).single();assert.ifError(batch.error);assert.equal(batch.data.receipt.assignments.length,2)
 const reviews=await admin.from('pooling_extension_reviews').select('id,draft_id').eq('client_id',cid).eq('operation_key',h.key(label+'-weekly-daily-accept-race'));assert.ifError(reviews.error);assert.equal(reviews.data.length,0)
 const prepared=state.weeklyPrepared,proposals=[]
 for(const d of prepared.drafts){const r=await admin.from('pooling_drafts').select('proposal').eq('id',d.id).single();assert.ifError(r.error);proposals.push(r.data.proposal)}
 check('A32 reconciled daily/weekly race: weekly batch committed atomically, outdated daily source denied without child',true,{weekId:prior.data.id,assignments:2,dailyChildren:0})
 state.weeklyResume??={generation:await gen()};const progress=state.weeklyResume,g=progress.generation;h.save()
 if(!progress.accepted){
  const d=await draft('independent-daily-target',proposals[0])
  const r=await rpc('pooling_request_extension',{target_client:cid,expected_generation:g,operation_key:key('daily-request'),proposal:{kind:'daily',date:proposals[0].date,requestedChange:'Fictional refreshed exact arithmetic review',blocks:[],authority:'none',state:'review_requested'}})
  progress.daily??={draftId:d.id,requestId:r.id};h.save()
  if(!progress.daily.proposalId){const p=await edge('pooling-extension',{clientId:cid,draftId:d.id,expectedGeneration:g,requestId:r.id,baselineAssignmentId:state.dailyBaseline,policyId:'fictional-daily'});assert.equal(p.result.state,'proposal');progress.daily.proposalId=p.receipt.id;h.save()}
  const args={target_client:cid,request_id:r.id,expected_generation:g,operation_key:key('daily-accept'),action:'accept',reason:'Fictional updated source reviewed',proposal_id:progress.daily.proposalId}
  const accepted=await rpc('pooling_review_extension',args,2),retried=await rpc('pooling_review_extension',args,0);assert.deepEqual(retried,accepted)
  const assigned=await admin.from('pooling_assignments').select('id').eq('draft_id',accepted.draftId);assert.ifError(assigned.error);assert.equal(assigned.data.length,0)
  progress.accepted=accepted;h.save();check('A32 fresh numerical acceptance and same-key retry create one unassigned child',true,{draftId:accepted.draftId})
 }
 if(!progress.healthReview){
  const drafts=[];for(const [i,p]of proposals.entries())drafts.push(await draft('health-slot-'+i,p))
  const week=structuredClone(prior.data.request);week.constraints.slots=drafts.map((d,i)=>({id:'health-slot-'+i,draftId:d.id,budgetSeconds:10,support:'none'}))
  const ready=await edge('pooling-weekly',{clientId:cid,expectedGeneration:g,operationKey:key('health-week'),week});assert.equal(ready.result.state,'ready_for_coach_review')
  progress.healthReview={id:ready.receipt.id,draftIds:drafts.map(d=>d.id)};h.save()
 }
 if(!progress.healthRace){
  h.reserve(5);const [approval,report]=await Promise.all([
   coach.rpc('pooling_approve_week',{target_client:cid,target_week:progress.healthReview.id,expected_generation:g,operation_key:key('health-approve')}),
   otherSession.rpc('pooling_submit_report',{target_client:cid,expected_generation:g,operation_key:key('new-health'),report_field:'healthChange',report_value:'changed',effective_at:new Date().toISOString()})])
  progress.healthRace={approval:approval.data,approvalError:approval.error?.message,report:report.data,reportError:report.error?.message};h.save()
 }
 const race=progress.healthRace;assert(!race.reportError);assert(!race.approvalError||['stale_context','context_held'].includes(race.approvalError))
 const assigned=await admin.from('pooling_assignments').select('id').in('draft_id',progress.healthReview.draftIds);assert.ifError(assigned.error);assert.equal(assigned.data.length,race.approval?2:0)
 for(const a of assigned.data){const r=await coach.rpc('pooling_execution',{assignment_id:a.id,expected_generation:g,operation_key:key('held-start-'+a.id),event_kind:'start',event_payload:{healthChange:'no_change'}});assert(['stale_context','context_held'].includes(r.error?.message))}
 check('A32 hosted health-change/batch race: all-or-none approval, no stale or held start',true,{assignments:assigned.data.length,generation:await gen()})
 const original=await admin.from('pooling_drafts').select('proposal').eq('id',prepared.drafts[0].id).single();assert.ifError(original.error);assert.deepEqual(original.data.proposal,proposals[0])
 state.weekly={passed:true,reconciled:true,...progress};h.save()
}
const runtime=await rpc('pooling_client_runtime',{target_client:cid},0)
check('A32 per-workspace quota and fixed expiry retained',runtime.remainingWrites>=20&&runtime.testOnly,{remainingWrites:runtime.remainingWrites})
await coach.auth.signOut({scope:'local'});await otherSession.auth.signOut({scope:'local'})
console.log(JSON.stringify({passed:true,label,phase,rowsReserved:ledger.rowsReserved,apiCalls:ledger.apiCalls}))
