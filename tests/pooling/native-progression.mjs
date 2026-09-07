import assert from 'node:assert/strict'
import {sql,jsonSQL,literal,asActor,coach,athlete} from './native-connection.mjs'
import {nativeGateway} from './native-gateway.mjs'
import {createDecisionService} from '../../supabase/functions/_shared/pooling-decision.js'
import {createNumericalService} from '../../supabase/functions/_shared/pooling-numerical.js'
process.env.FITNESS_POOLING_FLOW_CLIENT='context-test-'+crypto.randomUUID()
const {nativeFixture:f}=await import('./native-flow.mjs'),run=crypto.randomUUID(),gen=()=>Number(sql(`select generation from public.pooling_contexts where client_id=${literal(f.client)}`))
const doc=jsonSQL(`select document from public.pooling_manifests where id=${literal(f.manifest.id)}`),at=f.proposal.session.sessionAt,later=new Date(Date.now()+5000).toISOString()
doc.manifest.id='progression-'+run
doc.doses[0].sets=2;doc.doses[0].comparison={side:'not_applicable',range:'fictional',equipment:[],unit:'seconds',method:'fictional',assistance:'none',loadBasis:'no_external_load',effortMethod:'fictional-effort'}
doc.doses.push({...structuredClone(doc.doses[0]),id:'synthetic-progressed-dose',workSeconds:2});doc.catalogue[0].doseRefs.push('synthetic-progressed-dose')
const policy={...doc.modulePolicy,id:'fictional-progression',kind:'progression',fields:{workSeconds:{min:1,max:2,increment:1,maxChange:1}},windowSeconds:60,minimumPerformances:1,operator:'gte',comparisonThreshold:1,field:'workSeconds',progressionDelta:1,performanceUnit:'completed_occurrence',aggregation:'minimum_actual'}
doc.extensionPolicies=[policy];doc.manifest.records.push(...[doc.doses[1],policy].map(({id,revision})=>({id,revision})))
sql(`update public.pooling_runtime set r3=true where singleton;insert into public.pooling_manifests(id,state,document) values(${literal(doc.manifest.id)},'published',${literal(doc)})`)
const source=jsonSQL(`select public.pooling_source_inventory(${literal(coach)},${literal(f.client)})`).find(r=>r.source==='clients')
for(const [key,value] of [['health','no_change'],['equipment',[]]])jsonSQL(asActor(`select public.pooling_confirm_source(${literal(f.client)},${gen()},${literal(run+key)},${literal({key,value,source:'clients',sourceId:f.client,sourceToken:source.token,state:'reported',unit:'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt:at,sessionAt:later,evidenceReference:'Fictional progression engineering fixture'})})`))
const generation=gen(),proposal={...f.proposal,manifestId:doc.manifest.id}
const base=jsonSQL(asActor(`select public.pooling_save_draft(${literal(f.client)},${generation},${literal(run+'base')},${literal(proposal)})`))
const decision=await createDecisionService(nativeGateway())({clientId:f.client,draftId:base.id,expectedGeneration:generation})
const assignment=jsonSQL(asActor(`select public.pooling_approve(${literal(f.client)},${base.id},${decision.receipt.decisionId},${generation},${literal(run+'approve')})`))
const execution=(kind,payload)=>jsonSQL(asActor(`select public.pooling_execution(${assignment.assignmentId},${generation},${literal(crypto.randomUUID())},${literal(kind)},${literal(payload)})`,athlete))
execution('start',{healthChange:'no_change'})
const first=execution('actual',{occurrenceId:'synthetic-occ1',setIndex:1,actual:1,unit:'seconds',effort:0,effortMethod:'wrong-method'})
execution('actual',{occurrenceId:'synthetic-occ1',setIndex:2,actual:2,unit:'seconds',effort:0,effortMethod:'fictional-effort'});execution('complete',{})
const target=jsonSQL(asActor(`select public.pooling_save_draft(${literal(f.client)},${generation},${literal(run+'target')},${literal({...proposal,session:{...proposal.session,sessionAt:later}})})`))
const intent=jsonSQL(asActor(`select public.pooling_request_extension(${literal(f.client)},${generation},${literal(run+'intent')},${literal({kind:'progression',date:proposal.date,requestedChange:'Fictional progression proof',blocks:[],authority:'none',state:'review_requested'})})`,athlete))
const request={clientId:f.client,draftId:target.id,expectedGeneration:generation,requestId:intent.id,baselineAssignmentId:assignment.assignmentId,policyId:policy.id}
const unconfirmed=await createNumericalService(nativeGateway())(request);assert.equal(unconfirmed.result.state,'insufficient_evidence')
const original=jsonSQL(`select jsonb_build_object('payload',payload,'recordedAt',recorded_at) from public.pooling_execution_events where id=${first.eventId}`)
execution('actual',{...original.payload,performedAt:original.recordedAt,supersedes:first.eventId,correctionReason:'Fictional effort method typo',effortMethod:'fictional-effort'})
const result=await createNumericalService(nativeGateway())(request)
assert.equal(result.result.state,'proposal');assert.equal(result.result.comparisons[0].included.length,1);assert.equal(result.result.effects[0].to,2)
assert.equal(result.result.suggestedDraft.selection[0].doseId,'synthetic-progressed-dose')
const accepted=jsonSQL(asActor(`select public.pooling_review_extension(${literal(f.client)},${intent.id},${generation},${literal(run+'review')},'accept','Fictional progression exact review',${result.receipt.id})`))
assert.equal(Number(sql(`select count(*) from public.pooling_assignments where draft_id=${accepted.draftId}`)),0)
assert.deepEqual(jsonSQL(`select payload from public.pooling_execution_events where id=${first.eventId}`),original.payload)
console.log(JSON.stringify({test:'native R3 excludes mismatched effort; corrected complete sets count once; exact reviewed dose becomes unassigned draft; original evidence retained',passed:true,client:f.client}))
