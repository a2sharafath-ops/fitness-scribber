// A31: verify only the new fictional workspace with normal hosted coach JWTs.
import assert from 'node:assert/strict'
import {harness} from './hosted-test-runtime.mjs'
const h=harness('.recovery/hosted-test/run-pINCGI/ledger.json'),{ledger,admin,check}=h
assert.equal(ledger.a31?.setupReady,true)
const coach=await h.signIn('a31-client-coach-test')
const status=await h.rpc(coach,'pooling_test_status',{}),cid=status.clientId
assert.equal(status.runtime?.testOnly,true);assert.equal(status.runtime?.r1,true)
ledger.a31.clientId=cid;h.save()
const state=await h.rpc(coach,'pooling_read_assignments',{target_client:cid})
const baseline=state.find(a=>a.status==='complete')
assert(baseline,'Complete the browser fictional session first')
check('A31 hosted browser journey persisted complete session and original zero',baseline.actuals.length===3&&baseline.actuals.some(a=>a.actual===0)&&baseline.actuals.some(a=>a.supersedes))
ledger.a31.baselineAssignmentId=baseline.id;h.save()
const rows=await admin.from('clients').select('id,coachId').neq('id',cid);assert.ifError(rows.error)
const other=rows.data.find(c=>!ledger.users.some(u=>u.id===c.coachId));assert(other)
const denied=await coach.rpc('pooling_client_runtime',{target_client:other.id});check('A31 hosted wrong-owner client runtime denied',denied.error?.message==='forbidden')
const scenarioDenied=await coach.rpc('pooling_test_scenario',{target_client:other.id});check('A31 hosted existing client cannot borrow fictional scenario',scenarioDenied.error?.message==='forbidden')
const forged=await coach.from('pooling_test_workspaces').insert({client_id:other.id,coach_id:ledger.a31.testUserId});check('A31 hosted arbitrary client enrollment denied',!!forged.error)
const renamed=await coach.from('clients').update({name:'INVALID test rename'}).eq('id',cid);check('A31 hosted fictional identity cannot be relabelled as a real client',renamed.error?.message==='fictional_identity_locked')
assert.equal((await h.rpc(coach,'pooling_create_test_workspace',{acknowledged:true})).clientId,cid)
const context=await admin.from('pooling_contexts').select('generation').eq('client_id',cid).single();assert.ifError(context.error)
const generation=context.data.generation
if(process.argv[2]==='daily'){
 const original=await admin.from('pooling_drafts').select('proposal').eq('id',baseline.draftId).single();assert.ifError(original.error)
 const proposal=original.data.proposal
 const target=await h.rpc(coach,'pooling_save_draft',{target_client:cid,expected_generation:generation,operation_key:h.key('a31-daily-target'),proposal},1)
 const request=await h.rpc(coach,'pooling_request_extension',{target_client:cid,expected_generation:generation,operation_key:h.key('a31-daily-request'),proposal:{kind:'daily',date:proposal.date,requestedChange:'Fictional arithmetic-only daily review',blocks:[],authority:'none',state:'review_requested'}},1)
 const completeResult=await h.edge(coach,'pooling-extension',{clientId:cid,draftId:target.id,expectedGeneration:generation,requestId:request.id,baselineAssignmentId:baseline.id,policyId:'fictional-daily'})
 check('A31 daily review does not change already completed occurrences',completeResult.status===200&&completeResult.data.result?.state==='no_change')
 const future=await h.rpc(coach,'pooling_save_draft',{target_client:cid,expected_generation:generation,operation_key:h.key('a31-daily-baseline'),proposal},1)
 const decision=await h.edge(coach,'pooling-decision',{clientId:cid,draftId:future.id,expectedGeneration:generation});assert.equal(decision.status,200);assert.equal(decision.data.result.completeness,'ready_for_coach_review')
 const approved=await h.rpc(coach,'pooling_approve',{target_client:cid,draft_id:future.id,decision_id:decision.data.receipt.decisionId,expected_generation:generation,operation_key:h.key('a31-daily-explicit-baseline-approval')},1)
 const result=await h.edge(coach,'pooling-extension',{clientId:cid,draftId:target.id,expectedGeneration:generation,requestId:request.id,baselineAssignmentId:approved.assignmentId,policyId:'fictional-daily'})
 check('A31 scoped hosted daily proposal works with global flags off',result.status===200&&result.data.result?.state==='proposal'&&result.data.result.effects?.[0]?.to===2,{status:result.status,state:result.data.result?.state,error:result.data.error})
 const review=await h.rpc(coach,'pooling_review_extension',{target_client:cid,request_id:request.id,expected_generation:generation,operation_key:h.key('a31-daily-review'),action:'accept',reason:'Explicit fictional engineering review; no training.',proposal_id:result.data.receipt.id},2)
 const assigned=await admin.from('pooling_assignments').select('id').eq('draft_id',review.draftId);assert.ifError(assigned.error)
 check('A31 daily acceptance saves a draft without assigning',review.draftId>0&&assigned.data.length===0)
 ledger.a31.daily={requestId:request.id,draftId:review.draftId};h.save()
}
if(process.argv[2]==='progression'){
 const drafts=await admin.from('pooling_drafts').select('id,proposal').eq('client_id',cid).eq('context_generation',generation).order('id',{ascending:false});assert.ifError(drafts.error)
 const prepared=drafts.data.find(d=>d.proposal.session?.request?.goalPriority?.includes('fictional'))
 assert(prepared,'Prepare fresh weekly slots through the browser first')
 const original=await admin.from('pooling_drafts').select('proposal').eq('id',baseline.draftId).single();assert.ifError(original.error)
 const proposal={...prepared.proposal,selection:original.data.proposal.selection}
 const target=await h.rpc(coach,'pooling_save_draft',{target_client:cid,expected_generation:generation,operation_key:h.key('a31-comparable-progression-target'),proposal},1)
 const request=await h.rpc(coach,'pooling_request_extension',{target_client:cid,expected_generation:generation,operation_key:h.key('a31-progression-request'),proposal:{kind:'progression',date:proposal.date,requestedChange:'Fictional comparable-history progression review',blocks:[],authority:'none',state:'review_requested'}},1)
 const result=await h.edge(coach,'pooling-extension',{clientId:cid,draftId:target.id,expectedGeneration:generation,requestId:request.id,baselineAssignmentId:baseline.id,policyId:'fictional-progression'})
 check('A31 scoped progression uses completed comparable fictional history',result.status===200&&result.data.result?.state==='proposal'&&result.data.result.effects?.[0]?.to===2,{status:result.status,state:result.data.result?.state,error:result.data.error})
 const review=await h.rpc(coach,'pooling_review_extension',{target_client:cid,request_id:request.id,expected_generation:generation,operation_key:h.key('a31-progression-review'),action:'accept',reason:'Explicit fictional comparison review; no training.',proposal_id:result.data.receipt.id},2)
 const assigned=await admin.from('pooling_assignments').select('id').eq('draft_id',review.draftId);assert.ifError(assigned.error)
 check('A31 progression acceptance remains an unassigned draft',review.draftId>0&&assigned.data.length===0)
 ledger.a31.progression={requestId:request.id,draftId:review.draftId};h.save()
}
const flags=await admin.from('pooling_runtime').select('*').single();assert.ifError(flags.error)
check('A31 globals still off after hosted checks',!flags.data.r1&&!flags.data.r2&&!flags.data.r3)
await coach.auth.signOut({scope:'local'})
console.log(JSON.stringify({passed:true,clientId:cid,baselineAssignmentId:baseline.id,writesUsed:(await admin.from('pooling_test_workspaces').select('writes').eq('client_id',cid).single()).data?.writes,scope:'Synthetic coach-operated engineering proof, not participant UAT'}))
