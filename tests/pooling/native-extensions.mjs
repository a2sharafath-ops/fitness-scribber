// Entirely fictional policies, doses, sources and users on the private PG socket.
import assert from 'node:assert/strict'
import {sql,jsonSQL,literal,asActor,serviceRPC,coach,athlete} from './native-connection.mjs'
import {bundle} from './source-fixture.js'
import {createSupabaseDecisionGateway} from '../../supabase/functions/_shared/pooling-gateway.js'
import {createDecisionService} from '../../supabase/functions/_shared/pooling-decision.js'
import {createNumericalService} from '../../supabase/functions/_shared/pooling-numerical.js'
const client='recovery-client-a',at=new Date().toISOString(),run=crypto.randomUUID(),modulePolicy=bundle().modulePolicy
modulePolicy.requiredFields.push('fictional-signal');modulePolicy.requirements.push({key:'fictional-signal',source:'clients',required:true,unit:'fixture',protocol:'explicit-v1',maxAgeSeconds:60})
const accepted=(id,extra)=>({...structuredClone(modulePolicy),id,...extra})
const exercise=accepted('synthetic-extension-ex',{scopes:['adult_general_fitness'],settings:['home'],levels:['beginner'],equipment:[],prerequisites:[],demands:[],roles:['main'],doseRefs:['synthetic-extension-dose','synthetic-extension-dose-two']})
const dose=accepted('synthetic-extension-dose',{sets:1,workSeconds:1,restSeconds:0,setupSeconds:0,transitionSeconds:0,sideMultiplier:1})
const doseTwo={...dose,id:'synthetic-extension-dose-two',workSeconds:2}
const daily=accepted('synthetic-daily',{kind:'daily',fields:{workSeconds:{min:1,max:2,increment:1,maxChange:1}},signalRules:[{id:'fictional-signal-rule',key:'fictional-signal',operator:'gte',threshold:2,delta:1,field:'workSeconds',roles:['main']}]})
const manifest={id:`extension-${run}`,state:'published',releaseEvidence:'fictional-local-only',records:[modulePolicy,exercise,dose,doseTwo,daily].map(({id,revision})=>({id,revision}))}
sql(`update public.pooling_runtime set r1=true,r2=true,r3=true where singleton;insert into public.pooling_manifests(id,state,document) values(${literal(manifest.id)},'published',${literal({modulePolicy,manifest,catalogue:[exercise],doses:[dose,doseTwo],extensionPolicies:[daily]})});update public.pooling_contexts set held=false where client_id=${literal(client)}`)
const source=jsonSQL(`select public.pooling_source_inventory(${literal(coach)},${literal(client)})`).find(row=>row.source==='clients' && row.id===client)
for(const [key,value] of Object.entries({adult:true,purpose:true,health:'no_change',equipment:[],'fictional-signal':2})){
 const gen=Number(sql(`select generation from public.pooling_contexts where client_id=${literal(client)}`))
 const observation={key,value,source:'clients',sourceId:client,sourceToken:source.token,state:'reported',unit:key==='fictional-signal'?'fixture':'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt:at,sessionAt:at,evidenceReference:'Fictional engineering test only'}
 jsonSQL(asActor(`select public.pooling_confirm_source(${literal(client)},${gen},${literal(run+key)},${literal(observation)})`))
}
const generation=Number(sql(`select generation from public.pooling_contexts where client_id=${literal(client)}`))
const proposal={date:at.slice(0,10),manifestId:manifest.id,session:{sessionAt:at,timeZone:'UTC',request:{setting:'home',level:'beginner',roles:[{id:'main',required:true}],budgetSeconds:10}},selection:[{occurrenceId:'extension-occ',role:'main',exerciseId:exercise.id,exerciseRevision:1,doseId:dose.id,doseRevision:1}]}
const gateway=()=>createSupabaseDecisionGateway({userClient:{auth:{getUser:async()=>({data:{user:{id:coach}}})}},serviceClient:{rpc:async(name,payload)=>serviceRPC(name,payload),from:()=>({select:()=>({eq:(_,id)=>({maybeSingle:async()=>({data:jsonSQL(`select jsonb_build_object('id',id,'coachId',"coachId") from public.clients where id=${literal(id)}`)})})})})}})
const baseline=jsonSQL(asActor(`select public.pooling_save_draft(${literal(client)},${generation},${literal(run+'base')},${literal(proposal)})`))
const baseDecision=await createDecisionService(gateway())({clientId:client,draftId:baseline.id,expectedGeneration:generation})
const assignment=jsonSQL(asActor(`select public.pooling_approve(${literal(client)},${baseline.id},${baseDecision.receipt.decisionId},${generation},${literal(run+'approve')})`))
const target=jsonSQL(asActor(`select public.pooling_save_draft(${literal(client)},${generation},${literal(run+'target')},${literal(proposal)})`))
const reviewRequest={kind:'daily',date:proposal.date,requestedChange:'Fictional one-second arithmetic test, not exercise guidance',blocks:[],authority:'none',state:'review_requested'}
const requestSQL=`select public.pooling_request_extension(${literal(client)},${generation},${literal(run+'request')},${literal(reviewRequest)})`
const request=jsonSQL(asActor(requestSQL,athlete));assert.deepEqual(jsonSQL(asActor(requestSQL,athlete)),request)
const result=await createNumericalService(gateway())({clientId:client,draftId:target.id,expectedGeneration:generation,requestId:request.id,baselineAssignmentId:assignment.assignmentId,policyId:daily.id})
assert.equal(result.result.state,'proposal');assert.equal(result.result.effects[0].from,1);assert.equal(result.result.effects[0].to,2);assert.equal(result.result.suggestedDraft.selection[0].doseId,doseTwo.id)
const clientView=jsonSQL(asActor(`select public.pooling_read_extensions(${literal(client)},'daily')`,athlete)).find(row=>row.id===request.id)
assert.deepEqual(clientView.numericalProposals,[])
const review=`select public.pooling_review_extension(${literal(client)},${request.id},${generation},${literal(run+'review')},'accept','Fictional exact-diff review',${result.receipt.id})`
assert.throws(()=>sql(asActor(review,athlete)),/forbidden/)
const acceptedReview=jsonSQL(asActor(review));assert.deepEqual(jsonSQL(asActor(review)),acceptedReview);assert(acceptedReview.draftId)
assert.equal(Number(sql(`select count(*) from public.pooling_assignments where draft_id=${acceptedReview.draftId}`)),0)
assert.equal(jsonSQL(`select proposal from public.pooling_drafts where id=${baseline.id}`).selection[0].doseId,dose.id)
const workspace=jsonSQL(asActor(`select public.pooling_review_workspace(${literal(client)})`));assert(workspace.decisions.some(row=>row.draftId===target.id))
assert.throws(()=>sql(asActor(`select public.pooling_review_workspace(${literal(client)})`,athlete)),/forbidden/)
const second=jsonSQL(asActor(`select public.pooling_request_extension(${literal(client)},${generation},${literal(run+'request2')},${literal(reviewRequest)})`,athlete))
const changed=await createNumericalService(gateway())({clientId:client,draftId:target.id,expectedGeneration:generation,requestId:second.id,baselineAssignmentId:assignment.assignmentId,policyId:daily.id})
jsonSQL(asActor(`select public.pooling_submit_report(${literal(client)},${generation},${literal(run+'health')},'healthChange','"changed"',clock_timestamp())`,athlete))
assert.throws(()=>sql(asActor(`select public.pooling_review_extension(${literal(client)},${second.id},${generation},${literal(run+'stale-review')},'accept','Stale fictional review',${changed.receipt.id})`)),/stale_context/)
const rejected=jsonSQL(asActor(`select public.pooling_review_extension(${literal(client)},${second.id},${generation+1},${literal(run+'reject')},'reject','Fictional hold; source review needed')`));assert.equal(rejected.draftId,null)
console.log(JSON.stringify({test:'R2 source-backed numerical proposal → exact reviewed-dose match → coach acceptance creates draft only',passed:true,requestId:request.id,draftId:acceptedReview.draftId,authScope:'Synthetic SQL role, not hosted JWT'}))
