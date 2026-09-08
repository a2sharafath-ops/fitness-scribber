import assert from 'node:assert/strict'
import {harness} from './hosted-test-runtime.mjs'
const h=harness(process.argv[2]),{ledger,admin,check}=h,cid=ledger.clientIds.a,f=ledger.state.r1
if(!ledger.state.r1Passed||ledger.state.r2Started)throw Error('fresh_r2_after_r1_required')
ledger.state.r2Started=true;h.save()
const coach=await h.signIn('coach-a'),athlete=await h.signIn('client-a'),g=f.generation
const on=await admin.from('pooling_runtime').update({r1:true,r2:true,r3:false}).eq('singleton',true).select().single();assert.ifError(on.error)
check('Server R2 enabled, R3 remains off',on.data.r1&&on.data.r2&&!on.data.r3);ledger.state.flags=on.data;h.save()
const draft=label=>h.rpc(coach,'pooling_save_draft',{target_client:cid,expected_generation:g,operation_key:h.key('r2-'+label),proposal:f.proposal},2)
const baseline=await draft('baseline'),target=await draft('target')
const decision=await h.edge(coach,'pooling-decision',{clientId:cid,draftId:baseline.id,expectedGeneration:g});assert.equal(decision.status,200)
const assignment=await h.rpc(coach,'pooling_approve',{target_client:cid,draft_id:baseline.id,decision_id:decision.data.receipt.decisionId,expected_generation:g,operation_key:h.key('r2-approval')},1)
ledger.state.r2={baselineDraftId:baseline.id,targetDraftId:target.id,assignmentId:assignment.assignmentId,generation:g};h.save()
const intent={kind:'daily',date:f.proposal.date,requestedChange:'Fictional arithmetic change; not fitness guidance',blocks:[],authority:'none',state:'review_requested'}
const args={target_client:cid,expected_generation:g,operation_key:h.key('r2-request'),proposal:intent}
const request=await h.rpc(athlete,'pooling_request_extension',args,1);assert.deepEqual(await h.rpc(athlete,'pooling_request_extension',args,1),request)
const r3=await athlete.rpc('pooling_request_extension',{...args,operation_key:h.key('r2-premature-r3'),proposal:{...intent,kind:'progression'}});check('R3 request blocked during R2 stage',r3.error?.message==='feature_disabled')
const edgeRequest={clientId:cid,draftId:target.id,expectedGeneration:g,requestId:request.id,baselineAssignmentId:assignment.assignmentId,policyId:'fictional-daily'}
const result=await h.edge(coach,'pooling-extension',edgeRequest)
check('Hosted R2 exact dose proposal',result.status===200&&result.data.result?.state==='proposal'&&result.data.result.effects?.[0].from===1&&result.data.result.effects[0].to===2,{status:result.status,error:result.data.error})
const view=await h.rpc(athlete,'pooling_read_extensions',{target_client:cid,request_kind:'daily'});check('Client cannot read internal numerical evidence',view.find(r=>r.id===request.id)?.numericalProposals.length===0)
const review={target_client:cid,request_id:request.id,expected_generation:g,operation_key:h.key('r2-review'),action:'accept',reason:'Fictional exact-difference review',proposal_id:result.data.receipt.id}
const denied=await athlete.rpc('pooling_review_extension',review);check('Client cannot accept own numerical proposal',denied.error?.message==='forbidden')
const accepted=await h.rpc(coach,'pooling_review_extension',review,2);assert.deepEqual(await h.rpc(coach,'pooling_review_extension',review,2),accepted)
const existing=await admin.from('pooling_assignments').select('id').eq('draft_id',accepted.draftId);assert.ifError(existing.error);check('R2 acceptance creates draft, not assignment',accepted.draftId>0&&existing.data.length===0)
const original=await admin.from('pooling_drafts').select('proposal').eq('id',baseline.id).single();assert.ifError(original.error);check('R2 preserves original baseline dose',original.data.proposal.selection[0].doseId==='fictional-dose-one')
for(const action of ['reject','amend']){
 const req=await h.rpc(athlete,'pooling_request_extension',{...args,operation_key:h.key('r2-'+action)},1)
 const v=await h.rpc(coach,'pooling_review_extension',{target_client:cid,request_id:req.id,expected_generation:g,operation_key:h.key('r2-review-'+action),action,reason:'Fictional '+action+' review',...(action==='amend'?{amended_draft:f.proposal}:{})},3)
 check('R2 '+action+' disposition',action==='reject'?v.draftId===null:v.draftId>0)
}
ledger.state.r2.acceptedDraftId=accepted.draftId;ledger.state.r2Passed=true;h.save();console.log(JSON.stringify({r2Passed:true,rowsReserved:ledger.rowsReserved}))
