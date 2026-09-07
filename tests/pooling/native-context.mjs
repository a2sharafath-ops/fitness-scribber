import assert from 'node:assert/strict'
import {sql,jsonSQL,literal,asActor,serviceRPC,coach,athlete} from './native-connection.mjs'
import {createSupabaseDecisionGateway} from '../../supabase/functions/_shared/pooling-gateway.js'
import {createContextReviewService} from '../../supabase/functions/_shared/pooling-context-review.js'
process.env.FITNESS_POOLING_FLOW_CLIENT='context-test-'+crypto.randomUUID()
const {nativeFixture:f}=await import('./native-flow.mjs')
const run=crypto.randomUUID()
sql(`update public.pooling_contexts set held=true where client_id=${literal(f.client)}`)
const draft=jsonSQL(asActor(`select public.pooling_save_draft(${literal(f.client)},${f.generation},${literal(run+'draft')},${literal(f.proposal)})`))
const serviceClient={rpc:async(name,payload)=>serviceRPC(name,payload),from:table=>{
 if(!['clients','pooling_context_reviews'].includes(table))throw Error('Unexpected test table')
 const clauses=[]
 return {select:()=>{const builder={eq:(key,value)=>{if(!['id','client_id','actor_id','operation_key'].includes(key))throw Error('Unexpected test filter');clauses.push(`"${key}"=${literal(value)}`);return builder},maybeSingle:async()=>({data:jsonSQL(`select coalesce((select to_jsonb(t) from public.${table} t where ${clauses.join(' and ')}),'null'::jsonb)`)})};return builder}}
}}
const gateway=createSupabaseDecisionGateway({userClient:{auth:{getUser:async()=>({data:{user:{id:coach}}})}},serviceClient})
const request={clientId:f.client,draftId:draft.id,expectedGeneration:f.generation,operationKey:run+'context',reference:'Fictional owner review with independent fictional scope and consent evidence'}
const result=await createContextReviewService(gateway)(request)
assert.equal(result.receipt.generation,f.generation+1);assert.equal(result.assignment,null)
assert.deepEqual((await createContextReviewService(gateway)(request)).receipt,result.receipt)
assert.equal(Number(sql(`select count(*) from public.pooling_assignments where draft_id=${result.receipt.draftId}`)),0)
await assert.rejects(()=>createContextReviewService(gateway)({...request,expectedGeneration:request.expectedGeneration+1}),/idempotency_conflict/)
// A later no-change answer does not settle the earlier concern.
let reportGeneration=result.receipt.generation
for(const value of ['changed','no_change']){
 const receipt=jsonSQL(asActor(`select public.pooling_submit_report(${literal(f.client)},${reportGeneration},${literal(run+value)},'healthChange',${literal(JSON.stringify(value))},clock_timestamp())`,athlete))
 reportGeneration=receipt.generation
}
const unresolvedDraft=jsonSQL(asActor(`select public.pooling_save_draft(${literal(f.client)},${reportGeneration},${literal(run+'unresolved')},${literal(f.proposal)})`))
await assert.rejects(()=>createContextReviewService(gateway)({...request,draftId:unresolvedDraft.id,expectedGeneration:reportGeneration,operationKey:run+'concern'}),/context_held/)
const doc=jsonSQL(asActor(`select public.pooling_read_governance(${literal(f.client)})`,athlete)).documents.find(document=>document.decision==='accepted')
assert.ok(doc,'Fixture must have an explicitly accepted policy')
assert.throws(()=>sql(asActor(`select public.pooling_record_consent(${literal(f.client)},${literal(doc.id)},'withdrawn',${literal(run+'coach-forge')})`)),/forbidden/)
const priorGen=Number(sql(`select generation from public.pooling_contexts where client_id=${literal(f.client)}`))
jsonSQL(asActor(`select public.pooling_record_consent(${literal(f.client)},${literal(doc.id)},'withdrawn',${literal(run+'withdraw')})`,athlete))
assert.equal(Number(sql(`select generation from public.pooling_contexts where client_id=${literal(f.client)}`)),priorGen+1)
const governance=jsonSQL(`select public.pooling_governance_bundle(${literal(coach)},${literal(f.client)},'adult_general_fitness',now())`);assert.equal(governance.purposeAuthority,false)
const restriction=side=>Number(sql(`insert into public.pooling_restriction_records(client_id,field_key,side,protocol,evidence_reference,reviewer_id,effective_at) values(${literal(f.client)},'fictional-balance',${literal(side)},'fictional-protocol','fictional-source','fictional-reviewer',now()-interval '1 minute') returning id`))
const left=restriction('left'),right=restriction('right')
assert.throws(()=>sql(`set role service_role;select public.pooling_resolve_restriction(${literal(f.client)},${left},'fictional-balance','right','fictional-protocol','fictional-reviewer','fictional-resolution',now())`),/invalid_resolution/)
jsonSQL(`set role service_role;select public.pooling_resolve_restriction(${literal(f.client)},${left},'fictional-balance','left','fictional-protocol','fictional-reviewer','fictional-resolution',now())`)
assert.equal(Number(sql(`select count(*) from public.pooling_restriction_resolutions where restriction_id=${right}`)),0)
assert.equal(sql(`select held from public.pooling_contexts where client_id=${literal(f.client)}`),'t')
console.log(JSON.stringify({test:'source-bound context review, exact retry, client-only consent withdrawal invalidates authority, side-specific resolution retains broader hold',passed:true,client:f.client}))
