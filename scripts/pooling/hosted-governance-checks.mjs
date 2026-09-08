// A30 synthetic-only hosted governance verification. Retains all evidence.
import assert from 'node:assert/strict'
import {harness} from './hosted-test-runtime.mjs'
const h=harness(process.argv[2]),{ledger,admin,check}=h,cid=ledger.clientIds.a
if(!ledger.state.r3Passed||ledger.state.hostedGovernanceStarted)throw Error('fresh_governance_run_after_r3_required')
ledger.state.hostedGovernanceStarted=true;h.save()
const coach=await h.signIn('coach-a'),athlete=await h.signIn('client-a'),actor=ledger.users.find(u=>u.label==='coach-a').id
const uiAssignment=await admin.from('pooling_assignments').select('id,context_generation').eq('draft_id',ledger.state.ui.weeklyDraft0).single();assert.ifError(uiAssignment.error)
await h.rpc(athlete,'pooling_execution',{assignment_id:uiAssignment.data.id,expected_generation:uiAssignment.data.context_generation,operation_key:h.key('containment-prestart'),event_kind:'start',event_payload:{healthChange:'no_change'}},1)
ledger.state.containmentAssignment=uiAssignment.data;ledger.state.ui.weeklyApproved=true;h.save()
// Refresh validates managed Auth, not merely a hand-crafted local JWT.
const refreshed=await coach.auth.refreshSession();assert.ifError(refreshed.error)
check('Managed Auth refresh retains the fictional coach identity',refreshed.data.user?.id===actor)
const document=structuredClone(ledger.state.r1.document);document.manifest.id=ledger.runId+'_publication_check'
const args={target_client:cid,operation_key:h.key('catalogue-submit'),release_document:document,review_note:'Fictional software publication test; no professional acceptance'}
const denied=await athlete.rpc('pooling_submit_catalogue',args);check('Client cannot submit catalogue authority',denied.error?.message==='forbidden')
const submission=await h.rpc(coach,'pooling_submit_catalogue',args,1);assert.deepEqual(await h.rpc(coach,'pooling_submit_catalogue',args,1),submission)
const absent=await admin.from('pooling_manifests').select('id').eq('id',document.manifest.id);assert.ifError(absent.error);check('Catalogue review submission does not publish',absent.data.length===0)
const acceptanceId=ledger.runId+'_acceptance',request={clientId:cid,submissionId:submission.id,acceptanceId,action:'publish',reason:'Fictional exact-hash engineering test'}
const operatorDenied=await h.edge(coach,'pooling-publication',request);check('Publication requires separate release operator',operatorDenied.status===403&&operatorDenied.data.error==='forbidden')
await h.insert('pooling_release_operators',{actor_id:actor,evidence_reference:'Fictional-only A30 engineering authorization',valid_until:new Date(Date.now()+3600000).toISOString()})
const acceptanceDenied=await h.edge(coach,'pooling-publication',request);check('Release operator alone cannot publish',acceptanceDenied.status===409&&acceptanceDenied.data.error==='acceptance_required',{status:acceptanceDenied.status,error:acceptanceDenied.data.error})
await h.insert('pooling_content_acceptances',{id:acceptanceId,document_digest:submission.digest,evidence:{fictional:true,purpose:'Software verification only'},accepted_at:new Date().toISOString(),accepted_by:'fictional-engineering-fixture'})
const published=await h.edge(coach,'pooling-publication',request);check('Hosted exact-hash fictional publication commits',published.status===200&&published.data.receipt?.status==='committed'&&published.data.assignment===null,{status:published.status,error:published.data.error})
const immutable=await admin.from('pooling_content_acceptances').update({document_digest:'changed'}).eq('id',acceptanceId);check('Acceptance evidence is immutable',immutable.error?.message==='immutable_evidence')
const revoked=await admin.from('pooling_content_acceptances').update({revoked_at:new Date().toISOString()}).eq('id',acceptanceId);assert.ifError(revoked.error)
const state=await admin.from('pooling_manifests').select('state').eq('id',document.manifest.id).single();assert.ifError(state.error);check('Withdrawing acceptance revokes future catalogue reliance',state.data.state==='revoked')
ledger.state.publication={manifestId:document.manifest.id,acceptanceId,submissionId:submission.id,revoked:true};h.save()
// Scoped fictional reassessment cannot be mistaken for clinical clearance.
const restrictions=[]
for(const side of ['left','right'])restrictions.push((await h.insert('pooling_restriction_records',{client_id:cid,field_key:'fictional-balance',side,protocol:'fictional-v1',evidence_reference:'fictional-source',reviewer_id:'fictional-reviewer',effective_at:new Date(Date.now()-60000).toISOString()}))[0])
const reassessArgs={target_client:cid,operation_key:h.key('reassess-request'),review_request:{field:'fictional-balance',side:'left',protocol:'fictional-v1',sourceReference:'fictional-source',reason:'Fictional scoped software test'}}
const reassess=await h.rpc(athlete,'pooling_request_reassessment',reassessArgs,1);assert.deepEqual(await h.rpc(athlete,'pooling_request_reassessment',reassessArgs,1),reassess);check('Client reassessment request does not clear a finding',reassess.resolvesRestriction===false)
const authorizationId=ledger.runId+'_reviewer',recordArgs={verified_actor:actor,target_request:reassess.id,authorization_id:authorizationId,target_restriction:restrictions[0].id,evidence_reference:'Fictional exact left-side review',effective_at:new Date().toISOString()}
const direct=await coach.rpc('pooling_record_reassessment',recordArgs);check('Ordinary coach cannot call reviewer service RPC',!!direct.error&&/permission denied/.test(direct.error.message))
const noGrant=await admin.rpc('pooling_record_reassessment',recordArgs);check('Service also requires scoped reviewer authorization',noGrant.error?.message==='forbidden')
await h.insert('pooling_reviewer_authorizations',{id:authorizationId,actor_id:actor,client_id:cid,field_key:'fictional-balance',side:'left',protocol:'fictional-v1',evidence_reference:'Fictional engineering-only grant',valid_until:new Date(Date.now()+3600000).toISOString()})
const wrongSide=await admin.rpc('pooling_record_reassessment',{...recordArgs,target_restriction:restrictions[1].id});check('Reviewer grant cannot resolve opposite-side finding',wrongSide.error?.message==='invalid_resolution')
const receipt=await h.rpc(admin,'pooling_record_reassessment',recordArgs,3);assert.deepEqual(await h.rpc(admin,'pooling_record_reassessment',recordArgs,3),receipt)
const remaining=await admin.from('pooling_restriction_resolutions').select('id').eq('restriction_id',restrictions[1].id);assert.ifError(remaining.error);check('Opposite-side restriction remains unresolved',remaining.data.length===0)
const getContext=async()=>{const r=await admin.from('pooling_contexts').select('generation,held').eq('client_id',cid).single();assert.ifError(r.error);return r.data}
for(const value of ['changed','no_change'])await h.rpc(athlete,'pooling_submit_report',{target_client:cid,expected_generation:(await getContext()).generation,operation_key:h.key('governance-report-'+value),report_field:'healthChange',report_value:value,effective_at:new Date().toISOString()},2)
check('No-change report does not clear an earlier concern',(await getContext()).held===true)
const withdrawal=await h.rpc(athlete,'pooling_record_consent',{target_client:cid,target_document:ledger.runId+'_notice',decision:'withdrawn',operation_key:h.key('withdraw-consent')},2)
check('Client can withdraw fictional purpose consent',withdrawal.status==='committed')
ledger.state.hostedGovernancePassed=true;h.save();console.log(JSON.stringify({passed:true,rowsReserved:ledger.rowsReserved}))
