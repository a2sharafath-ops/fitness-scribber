import assert from 'node:assert/strict'
import {harness} from './hosted-test-runtime.mjs'
import {bundle} from '../../tests/pooling/source-fixture.js'
const h=harness(process.argv[2]),{ledger,admin,check}=h,cid=ledger.clientIds.a
if(!ledger.state.fixturesReady||ledger.state.r1Started)throw Error('fresh_completed_fixture_setup_required')
ledger.state.r1Started=true
for(const c of ledger.checks)if(c.name.endsWith(' unauthorized actor denied')&&c.status===400)c.name=c.name.replace(' unauthorized actor denied',' malformed request rejected')
h.save()
const coach=await h.signIn('coach-a'),athlete=await h.signIn('client-a'),other=await h.signIn('coach-b'),unlinked=await h.signIn('unlinked')
const base={clientId:cid,draftId:1,expectedGeneration:1},op=h.key('authz')
const requests={
 'pooling-decision':base,
 'pooling-context-review':{...base,operationKey:op,reference:'Fictional access test'},
 'pooling-extension':{...base,requestId:1,baselineAssignmentId:1,policyId:'fictional'},
 'pooling-weekly':{clientId:cid,expectedGeneration:1,operationKey:op,week:{constraints:{slots:[{draftId:1}]}}},
 'pooling-suggestion':{...base,operationKey:op,mode:'generate'},
 'pooling-publication':{clientId:cid,submissionId:1,acceptanceId:'fictional',action:'publish',reason:'Fictional access test'},
}
for(const [name,request] of Object.entries(requests))for(const [label,actor] of [['unlinked',unlinked],['other-coach',other]]){
 const result=await h.edge(actor,name,request);check(name+' valid request '+label+' forbidden',result.status===403&&result.data.error==='forbidden',{status:result.status})
}
const bad=await h.edge(coach,'pooling-decision',base,{rawToken:'not-a-valid-jwt'});check('Malformed JWT denied',[401,403].includes(bad.status),{status:bad.status})
const flags=await admin.from('pooling_runtime').update({r1:true,r2:false,r3:false}).eq('singleton',true).select().single();assert.ifError(flags.error);check('Server R1 only enabled',flags.data.r1&&!flags.data.r2&&!flags.data.r3)
ledger.state.flags={r1:true,r2:false,r3:false};h.save()
const updated=await coach.from('clients').update({status:'Active'}).eq('id',cid);assert.ifError(updated.error)
const at=new Date().toISOString(),future=new Date(Date.now()+86400000).toISOString()
const modulePolicy=bundle().modulePolicy
modulePolicy.requirements.forEach(r=>r.maxAgeSeconds=3600)
modulePolicy.requirements.push({key:'fictional-signal',source:'clients',required:true,unit:'fixture',protocol:'explicit-v1',maxAgeSeconds:3600},{key:'support',source:'clients',required:true,unit:'support',protocol:'explicit-v1',maxAgeSeconds:3600})
const accepted=(id,extra)=>({...structuredClone(modulePolicy),id,...extra})
const comparison={side:'not_applicable',range:'fictional',equipment:[],unit:'seconds',method:'fictional',assistance:'none',loadBasis:'no_external_load',effortMethod:'fictional-effort'}
const dose=accepted('fictional-dose-one',{sets:2,workSeconds:1,restSeconds:0,setupSeconds:0,transitionSeconds:0,sideMultiplier:1,comparison})
const doseTwo={...structuredClone(dose),id:'fictional-dose-two',workSeconds:2}
const exercise=accepted('fictional-exercise',{name:'ENGINEERING PLACEHOLDER — DO NOT PERFORM',familyId:'fictional-family',laterality:'bilateral',pattern:'fictional-pattern',scopes:['adult_general_fitness'],settings:['home'],levels:['beginner'],equipment:[],prerequisites:[],demands:[],roles:['main'],doseRefs:[dose.id,doseTwo.id]})
const alternative={...structuredClone(exercise),id:'fictional-alternative'}
const fields={workSeconds:{min:1,max:2,increment:1,maxChange:1}}
const daily=accepted('fictional-daily',{kind:'daily',fields,signalRules:[{id:'fictional-signal-rule',key:'fictional-signal',operator:'gte',threshold:2,delta:1,field:'workSeconds',roles:['main']}]})
const progression=accepted('fictional-progression',{kind:'progression',fields,windowSeconds:3600,minimumPerformances:1,operator:'gte',comparisonThreshold:1,field:'workSeconds',progressionDelta:1,performanceUnit:'completed_occurrence',aggregation:'minimum_actual'})
const weekly=accepted('fictional-weekly',{kind:'weekly',supportKey:'support',splits:['fictional'],goals:['fictional'],minSessions:2,maxSessions:2,maxWeeklySeconds:100,patternRules:[{pattern:'fictional-pattern',minSessions:2,maxSessions:2,recoverySeconds:1}]})
const manifest={id:ledger.runId+'_manifest',state:'published',releaseEvidence:'Fictional engineering-only evidence. No professional acceptance.',records:[modulePolicy,exercise,alternative,dose,doseTwo,daily,progression,weekly].map(({id,revision})=>({id,revision}))}
const document={modulePolicy,manifest,catalogue:[exercise,alternative],doses:[dose,doseTwo],extensionPolicies:[daily,progression,weekly]}
ledger.state.r1={at,manifestId:manifest.id,document,proposal:{date:at.slice(0,10),manifestId:manifest.id,session:{sessionAt:at,timeZone:'UTC',request:{setting:'home',level:'beginner',roles:[{id:'main',required:true}],budgetSeconds:10}},selection:[{occurrenceId:'fictional-occ1',role:'main',exerciseId:exercise.id,exerciseRevision:1,doseId:dose.id,doseRevision:1}]}};h.save()
await h.insert('pooling_manifests',{id:manifest.id,state:'published',document})
await h.insert('pooling_scope_grants',{id:ledger.runId+'_scope',client_id:cid,scope:'adult_general_fitness',market:'fictional-market',reviewer_id:'fictional-engineering-reviewer',evidence_reference:'Synthetic software fixture, not professional sign-off',valid_until:future})
const policyId=ledger.runId+'_notice'
await h.insert('pooling_policy_documents',{id:policyId,scope:'adult_general_fitness',market:'fictional-market',title:'Fictional engineering test notice',body:'Software test only. Not a real privacy notice or consent. Do not perform test exercises.',state:'published',evidence_reference:'Fictional only'})
const consentArgs={target_client:cid,target_document:policyId,decision:'accepted',operation_key:h.key('r1-consent')}
const forged=await coach.rpc('pooling_record_consent',consentArgs);check('Coach cannot forge client consent',forged.error?.message==='forbidden')
const consent=await h.rpc(athlete,'pooling_record_consent',consentArgs,2);assert.deepEqual(await h.rpc(athlete,'pooling_record_consent',consentArgs,2),consent)
const gen=async()=>{const r=await admin.from('pooling_contexts').select('generation,held').eq('client_id',cid).single();assert.ifError(r.error);return r.data.generation}
const inventory=await h.rpc(admin,'pooling_source_inventory',{verified_actor:ledger.users.find(u=>u.label==='coach-a').id,target_client:cid}),source=inventory.find(r=>r.source==='clients'&&r.id===cid)
const values={adult:true,purpose:true,health:'no_change',equipment:[],'fictional-signal':2,support:'none'}
for(const [key,value] of Object.entries(values)){
 const observation={key,value,source:'clients',sourceId:cid,sourceToken:source.token,state:'reported',unit:key==='fictional-signal'?'fixture':key==='support'?'support':'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt:at,sessionAt:at,evidenceReference:'Fictional attributed source, software test only'}
 const args={target_client:cid,expected_generation:await gen(),operation_key:h.key('r1-confirm-'+key),observation}
 const receipt=await h.rpc(coach,'pooling_confirm_source',args,2);assert.deepEqual(await h.rpc(coach,'pooling_confirm_source',args,2),receipt)
}
const g=await gen(),draft=await h.rpc(coach,'pooling_save_draft',{target_client:cid,expected_generation:g,operation_key:h.key('r1-draft'),proposal:ledger.state.r1.proposal},2)
ledger.state.r1.initialDraft=draft.id;ledger.state.r1.initialGeneration=g;h.save()
const held=await h.edge(coach,'pooling-decision',{clientId:cid,draftId:draft.id,expectedGeneration:g})
check('Held source cannot create assignable result',held.status===200&&held.data.result.sessionState!=='eligible_for_coach_review'||held.status===409,{status:held.status})
const contextRequest={clientId:cid,draftId:draft.id,expectedGeneration:g,operationKey:h.key('r1-context'),reference:'Fictional coach review; only separately provisioned fixture scope and client consent'}
const context=await h.edge(coach,'pooling-context-review',contextRequest);check('Actual context-review Edge Function commits without assignment',context.status===200&&!!context.data.receipt?.draftId&&context.data.assignment===null,{status:context.status,error:context.data.error})
assert.deepEqual((await h.edge(coach,'pooling-context-review',contextRequest)).data.receipt,context.data.receipt)
const generation=context.data.receipt.generation,draftId=context.data.receipt.draftId
ledger.state.r1.generation=generation;ledger.state.r1.draftId=draftId;h.save()
const decision=await h.edge(coach,'pooling-decision',{clientId:cid,draftId,expectedGeneration:generation})
check('Hosted R1 decision ready for coach review',decision.status===200&&decision.data.result.completeness==='ready_for_coach_review',{status:decision.status,error:decision.data.error})
const args={target_client:cid,draft_id:draftId,decision_id:decision.data.receipt.decisionId,expected_generation:generation,operation_key:h.key('r1-approve')}
ledger.state.r1.decision=decision.data.receipt.decisionId;h.save()
const noClient=await athlete.rpc('pooling_approve',args);check('Client cannot approve',noClient.error?.message==='forbidden')
const assignment=await h.rpc(coach,'pooling_approve',args,1);assert.deepEqual(await h.rpc(coach,'pooling_approve',args,1),assignment)
ledger.state.r1.assignmentId=assignment.assignmentId;h.save()
const execute=(event_kind,event_payload,operation_key)=>h.rpc(athlete,'pooling_execution',{assignment_id:assignment.assignmentId,expected_generation:generation,operation_key,event_kind,event_payload},1)
await execute('start',{healthChange:'no_change'},h.key('r1-start'))
await execute('actual',{occurrenceId:'fictional-occ1',setIndex:1,actual:0,unit:'seconds'},h.key('r1-zero'))
await execute('pause',{},h.key('r1-pause'));await execute('resume',{healthChange:'no_change'},h.key('r1-resume'))
await execute('actual',{occurrenceId:'fictional-occ1',setIndex:2,actual:2,unit:'seconds',effort:0,effortMethod:'fictional-effort'},h.key('r1-second'))
await execute('complete',{},h.key('r1-complete'))
check('Hosted approved client runner start/zero/pause/resume/complete',true)
const raw=await athlete.from('clients').select('id,notes').eq('id',cid);check('R1 client raw source hidden',!raw.error&&raw.data.length===0)
const snapshot=await h.rpc(athlete,'pooling_athlete_snapshot',{});check('R1 client projection available',snapshot.client?.id===cid&&snapshot.sourceAvailability==='protected_projection')
const wrong=await other.rpc('pooling_read_assignments',{target_client:cid});check('Other coach assignment projection denied',wrong.error?.message==='forbidden')
ledger.state.r1Passed=true;h.save();console.log(JSON.stringify({r1Passed:true,rowsReserved:ledger.rowsReserved,runLedger:h.file}))
