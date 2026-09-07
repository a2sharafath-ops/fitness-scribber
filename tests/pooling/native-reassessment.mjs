import assert from 'node:assert/strict'
import {sql,jsonSQL,literal,asActor,coach,athlete} from './native-connection.mjs'
process.env.FITNESS_POOLING_FLOW_CLIENT='context-test-'+crypto.randomUUID()
const {nativeFixture:f}=await import('./native-flow.mjs'),run=crypto.randomUUID(),effectiveAt=new Date().toISOString()
sql('update public.pooling_runtime set r3=true where singleton')
const restriction=Number(sql(`insert into public.pooling_restriction_records(client_id,field_key,side,protocol,evidence_reference,reviewer_id,effective_at) values(${literal(f.client)},'fictional-balance','left','fictional-v1','fictional-source','fictional-reviewer',now()-interval '1 minute') returning id`))
const review={field:'fictional-balance',side:'left',protocol:'fictional-v1',sourceReference:'fictional-source',reason:'Fictional scoped review request'}
const requestSQL=`select public.pooling_request_reassessment(${literal(f.client)},${literal(run+'request')},${literal(review)})`
const request=jsonSQL(asActor(requestSQL,athlete));assert.deepEqual(jsonSQL(asActor(requestSQL,athlete)),request);assert.equal(request.resolvesRestriction,false)
const call=`select public.pooling_record_reassessment(${literal(coach)},${request.id},${literal(run)},${restriction},'Fictional exact evidence',${literal(effectiveAt)})`
assert.throws(()=>sql(asActor(call)),/permission denied/);assert.throws(()=>sql(`set role service_role;${call}`),/forbidden/)
sql(`insert into public.pooling_reviewer_authorizations(id,actor_id,client_id,field_key,side,protocol,evidence_reference,valid_until) values(${literal(run)},${literal(coach)},${literal(f.client)},'fictional-balance','left','fictional-v1','Fictional-only reviewer grant',now()+interval '1 hour')`)
const receipt=jsonSQL(`set role service_role;${call}`);assert.deepEqual(jsonSQL(`set role service_role;${call}`),receipt)
assert.equal(sql(`select held from public.pooling_contexts where client_id=${literal(f.client)}`),'t')
assert.equal(Number(sql(`select count(*) from public.pooling_restriction_resolutions where restriction_id=${restriction}`)),1)
console.log(JSON.stringify({test:'scoped reassessment request cannot clear findings; service also requires exact reviewer authorization; resolution keeps broader hold',passed:true,requestId:request.id}))
