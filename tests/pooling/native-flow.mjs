// Real SQL plus JS gateway orchestration. Auth identity is synthetic, not JWT proof.
import assert from 'node:assert/strict'
import {sql,jsonSQL,literal,asActor,serviceRPC,coach,athlete} from './native-connection.mjs'
import {bundle} from './source-fixture.js'
import {createSupabaseDecisionGateway} from '../../supabase/functions/_shared/pooling-gateway.js'
import {createDecisionService} from '../../supabase/functions/_shared/pooling-decision.js'
import {syntheticGovernance} from './native-governance-fixture.mjs'
const client=process.env.FITNESS_POOLING_FLOW_CLIENT || 'recovery-client-a',at=new Date().toISOString(),run=crypto.randomUUID()
if(client!=='recovery-client-a'){
 if(!/^context-test-[a-f0-9-]{36}$/.test(client))throw Error('Synthetic context-test client ID required')
 sql(`insert into public.clients(id,"coachId","userId",name) values(${literal(client)},${literal(coach)},${literal(athlete)},'Fictional context review only')`)
}
syntheticGovernance(client)
const policy=bundle().modulePolicy
const accepted=(id,extra)=>({...structuredClone(policy),id,...extra})
const exercise=accepted('synthetic-ex',{scopes:['adult_general_fitness'],settings:['home'],levels:['beginner'],equipment:[],prerequisites:[],demands:[],roles:['main'],doseRefs:['synthetic-dose']})
const dose=accepted('synthetic-dose',{sets:1,workSeconds:1,restSeconds:0,setupSeconds:0,transitionSeconds:0,sideMultiplier:1})
const manifest={id:`native-${run}`,state:'published',releaseEvidence:'fictional-local-only',records:[policy,exercise,dose].map(({id,revision})=>({id,revision}))}
sql(`update public.pooling_runtime set r1=true where singleton;insert into public.pooling_manifests(id,state,document) values(${literal(manifest.id)},'published',${literal({modulePolicy:policy,manifest,catalogue:[exercise],doses:[dose]})});insert into public.pooling_contexts(client_id,held) values(${literal(client)},false) on conflict(client_id) do update set held=false`)
const inventory=jsonSQL(`select public.pooling_source_inventory(${literal(coach)},${literal(client)})`)
const source=inventory.find(row=>row.source==='clients' && row.id===client)
for(const [key,value] of Object.entries({adult:true,purpose:true,health:'no_change',equipment:[]})) {
 const generation=Number(sql(`select generation from public.pooling_contexts where client_id=${literal(client)}`))
 const observation={key,value,source:'clients',sourceId:client,sourceToken:source.token,state:'reported',unit:'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt:at,sessionAt:at,evidenceReference:'Fictional local engineering fixture; not professional acceptance'}
 const call=`select public.pooling_confirm_source(${literal(client)},${generation},${literal(run+key)},${literal(observation)})`
 const receipt=jsonSQL(asActor(call));assert.equal(receipt.generation,generation+1)
 assert.deepEqual(jsonSQL(asActor(call)),receipt)
}
const generation=Number(sql(`select generation from public.pooling_contexts where client_id=${literal(client)}`))
const proposal={date:at.slice(0,10),manifestId:manifest.id,session:{sessionAt:at,timeZone:'UTC',request:{setting:'home',level:'beginner',roles:[{id:'main',required:true}],budgetSeconds:10}},selection:[{occurrenceId:'synthetic-occ1',role:'main',exerciseId:exercise.id,exerciseRevision:1,doseId:dose.id,doseRevision:1}]}
const draft=jsonSQL(asActor(`select public.pooling_save_draft(${literal(client)},${generation},${literal(run+'draft')},${literal(proposal)})`))
const gateway=createSupabaseDecisionGateway({userClient:{auth:{getUser:async()=>({data:{user:{id:coach}}})}},serviceClient:{rpc:async(name,payload)=>serviceRPC(name,payload),from:()=>({select:()=>({eq:(_,id)=>({maybeSingle:async()=>({data:jsonSQL(`select jsonb_build_object('id',id,'coachId',"coachId") from public.clients where id=${literal(id)}`)})})})})}})
const decision=await createDecisionService(gateway)({clientId:client,draftId:draft.id,expectedGeneration:generation})
assert.equal(decision.result.completeness,'ready_for_coach_review')
const approve=`select public.pooling_approve(${literal(client)},${draft.id},${decision.receipt.decisionId},${generation},${literal(run+'approve')})`
const assignment=jsonSQL(asActor(approve));assert.deepEqual(jsonSQL(asActor(approve)),assignment)
jsonSQL(asActor(`select public.pooling_execution(${assignment.assignmentId},${generation},${literal(run+'start')},'start','{"healthChange":"no_change"}')`,athlete))
assert.throws(()=>jsonSQL(asActor(`select public.pooling_execution(${assignment.assignmentId},${generation},${literal(run+'wrong-unit')},'actual','{"occurrenceId":"synthetic-occ1","setIndex":1,"actual":0,"unit":"repetitions"}')`,athlete)),/invalid_actual/)
jsonSQL(asActor(`select public.pooling_execution(${assignment.assignmentId},${generation},${literal(run+'actual')},'actual','{"occurrenceId":"synthetic-occ1","setIndex":1,"actual":0,"unit":"seconds"}')`,athlete))
jsonSQL(asActor(`select public.pooling_execution(${assignment.assignmentId},${generation},${literal(run+'stop')},'stop','{}')`,athlete))
console.log(JSON.stringify({test:'native source → confirmation → gateway → exact coach approval → client start/actual/stop',passed:true,draftId:draft.id,assignmentId:assignment.assignmentId,authScope:'Synthetic identity, not hosted JWT verification'}))
export const nativeFixture={client,manifest,proposal,generation,gateway,coach,athlete,assignment}
