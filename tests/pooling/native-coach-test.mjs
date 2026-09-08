// A31 native integration: real restored functions/roles, fictional identities.
// Never treats locally set JWT claims as hosted Auth evidence.
import assert from 'node:assert/strict'
import {sql,jsonSQL,literal as q,asActor,serviceRPC} from './native-connection.mjs'
import {coachTestTemplate} from '../../scripts/pooling/coach-test-template.mjs'
import {createSupabaseDecisionGateway} from '../../supabase/functions/_shared/pooling-gateway.js'
import {createDecisionService} from '../../supabase/functions/_shared/pooling-decision.js'
import {createContextReviewService} from '../../supabase/functions/_shared/pooling-context-review.js'
const coach='00000000-0000-4000-8000-000000000101',other='00000000-0000-4000-8000-000000000102',athlete='00000000-0000-4000-8000-000000000103'
const run=crypto.randomUUID(),checks=[]
function check(name,test){test();checks.push(name);console.log(JSON.stringify({name,passed:true}))}
const call=(text,actor=coach)=>jsonSQL(asActor('select '+text,actor))
const deny=(text,error,actor=coach)=>assert.throws(()=>call(text,actor),new RegExp(error))
assert.equal(sql(`select count(*) from auth.users where id in (${q(coach)},${q(other)},${q(athlete)})`),'0')
sql(`insert into auth.users(id) values(${q(coach)}),(${q(other)}),(${q(athlete)});
 insert into public.profiles(id,role) values(${q(coach)},'coach'),(${q(other)},'coach'),(${q(athlete)},'athlete') on conflict(id) do update set role=excluded.role;
 insert into public.clients(id,"coachId","userId",name) values('a31-native-classic',${q(coach)},${q(athlete)},'FICTIONAL Classic isolation case');
 update public.pooling_runtime set r1=false,r2=false,r3=false;
 insert into public.pooling_test_config(singleton,enabled,ends_at,coach_ids,template) values(true,true,clock_timestamp()+interval '7 days',array[${q(coach)}::uuid,${q(other)}::uuid],${q(coachTestTemplate())});`)
check('A31 acknowledgement and coach-only creation',()=>{deny('public.pooling_create_test_workspace(false)','test_acknowledgement_required');deny('public.pooling_create_test_workspace(true)','forbidden',athlete)})
const created=call('public.pooling_create_test_workspace(true)'),cid=created.clientId
check('A31 new fictional workspace active and retry-safe',()=>{assert.equal(created.testOnly,true);assert.equal(created.r1,true);assert.equal(created.r2,true);assert.equal(created.r3,true);assert.deepEqual(call('public.pooling_create_test_workspace(true)'),created)})
check('A31 existing client keeps Classic read/write semantics',()=>{
 const runtime=call("public.pooling_client_runtime('a31-native-classic')");assert.equal(runtime.governed,false);assert.equal(runtime.r1,false)
 assert.equal(sql(asActor("select count(*) from public.clients where id='a31-native-classic'",athlete)),'1')
 sql(asActor("update public.clients set notes='Fictional normal coach update' where id='a31-native-classic'",coach))
 assert.equal(sql("select notes from public.clients where id='a31-native-classic'"),'Fictional normal coach update')
 deny("public.pooling_test_scenario('a31-native-classic')",'forbidden')
})
check('A31 wrong owner and client role denied',()=>{deny(`public.pooling_client_runtime(${q(cid)})`,'forbidden',other);deny(`public.pooling_test_scenario(${q(cid)})`,'forbidden',athlete)})
check('A31 raw enrollment/config edits and identity change denied',()=>{
 assert.throws(()=>sql(asActor('update public.pooling_test_config set enabled=false',coach)),/permission denied/)
 assert.throws(()=>sql(asActor(`update public.clients set name='Changed' where id=${q(cid)}`,coach)),/fictional_identity_locked/)
})
const second=call('public.pooling_create_test_workspace(true)',other)
check('A31 manifest cannot cross test/Classic boundaries',()=>{
 assert.equal(sql(`select public.pooling_manifest_allowed(${q(cid)},${q(second.manifestId)})`),'f')
 assert.equal(sql(`select public.pooling_manifest_allowed('a31-native-classic',${q(created.manifestId)})`),'f')
 assert.equal(sql(`select public.pooling_manifest_allowed(${q(cid)},${q(created.manifestId)})`),'t')
})
const scenario=call(`public.pooling_test_scenario(${q(cid)})`)
const gen=()=>Number(sql(`select generation from public.pooling_contexts where client_id=${q(cid)}`))
for(const [key,value]of Object.entries(scenario.values)){
 const observation={key,value,source:'clients',sourceId:cid,sourceToken:scenario.source.token,state:'reported',unit:key==='fictional-signal'?'fixture':key==='support'?'support':'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt:scenario.at,sessionAt:scenario.at,evidenceReference:'Explicit fictional native software scenario'}
 const request=`public.pooling_confirm_source(${q(cid)},${gen()},${q(run+key)},${q(observation)})`
 const receipt=call(request);assert.deepEqual(call(request),receipt)
}
const parent=call(`public.pooling_save_draft(${q(cid)},${gen()},${q(run+'parent')},${q(scenario.proposal)})`)
const serviceClient={rpc:async(name,payload)=>serviceRPC(name,payload),from:table=>{
 const filters=[]
 const builder={select:()=>builder,eq:(key,value)=>{assert(['id','client_id','actor_id','operation_key'].includes(key));filters.push(`${key}=${q(value)}`);return builder},maybeSingle:async()=>{
  assert(['clients','pooling_context_reviews'].includes(table))
  const raw=sql(`select to_jsonb(r) from public.${table} r where ${filters.join(' and ')}`)
  return {data:raw?JSON.parse(raw):null}
 }}
 return builder
}}
const gateway=createSupabaseDecisionGateway({userClient:{auth:{getUser:async()=>({data:{user:{id:coach}}})}},serviceClient})
const reviewed=await createContextReviewService(gateway)({clientId:cid,draftId:parent.id,expectedGeneration:gen(),operationKey:run+'review',reference:'Fictional local coach review only'})
const generation=gen(),draftId=reviewed.receipt.draftId
const decision=await createDecisionService(gateway)({clientId:cid,draftId,expectedGeneration:generation})
check('A31 scenario resolves through real context/decision gateways',()=>assert.equal(decision.result.completeness,'ready_for_coach_review'))
const approve=`public.pooling_approve(${q(cid)},${draftId},${decision.receipt.decisionId},${generation},${q(run+'approve')})`
deny(approve,'forbidden',athlete)
const assigned=call(approve);assert.deepEqual(call(approve),assigned)
const execute=(kind,payload={},key=run+kind)=>call(`public.pooling_execution(${assigned.assignmentId},${generation},${q(key)},${q(kind)},${q(payload)})`)
execute('start',{healthChange:'no_change'});execute('actual',{occurrenceId:'fictional-occ1',setIndex:1,actual:0,unit:'seconds'})
execute('pause')
check('A31 write cap reserves Stop for every open session',()=>{
 sql(`begin;update public.pooling_test_workspaces set writes=159 where client_id=${q(cid)};
 set local role authenticated;set local request.jwt.claim.sub=${q(coach)};
 do $$begin
  begin perform public.pooling_execution(${assigned.assignmentId},${generation},${q(run+'quota-actual')},'actual','{"occurrenceId":"fictional-occ1","setIndex":2,"actual":0,"unit":"seconds"}');raise exception 'quota_did_not_reject';
  exception when others then if SQLERRM<>'test_limit_reached' then raise;end if;end;
  perform public.pooling_execution(${assigned.assignmentId},${generation},${q(run+'quota-stop')},'stop','{}');
 end $$;reset role;
 do $$begin if(select writes from public.pooling_test_workspaces where client_id=${q(cid)})<>160 then raise exception 'stop_reserve_failed';end if;end $$;
 rollback;`)
})
sql(`update public.pooling_test_config set ends_at=clock_timestamp()-interval '1 second'`)
check('A31 expiry denies resume but keeps governed marker and history',()=>{
 const runtime=call(`public.pooling_client_runtime(${q(cid)})`);assert.equal(runtime.r1,false);assert.equal(runtime.governed,true)
 deny(`public.pooling_execution(${assigned.assignmentId},${generation},${q(run+'expired-resume')},'resume','{"healthChange":"no_change"}')`,'feature_disabled')
 assert.equal(call(`public.pooling_read_assignments(${q(cid)})`).length>0,true)
 deny(`public.pooling_save_draft(${q(cid)},${generation},${q(run+'expired-draft')},${q(scenario.proposal)})`,'feature_disabled')
})
execute('stop')
check('A31 stop and actual correction survive expiry',()=>{
 const raw=jsonSQL(`select to_jsonb(e) from public.pooling_execution_events e where assignment_id=${assigned.assignmentId} and kind='actual'`)
 execute('actual',{occurrenceId:'fictional-occ1',setIndex:1,actual:1,unit:'seconds',supersedes:raw.id,correctionReason:'Fictional correction test',performedAt:raw.recorded_at},run+'correction')
})
check('A31 revocation is monotonic and never renews enrollment',()=>{
 const revoked=call(`public.pooling_revoke_test_workspace(${q(cid)})`);assert.equal(revoked.revoked,true)
 assert.equal(call('public.pooling_create_test_workspace(true)').clientId,cid)
 assert.equal(call('public.pooling_create_test_workspace(true)').r1,false)
})
check('A31 global flags remain off',()=>assert.deepEqual(jsonSQL('select to_jsonb(r) from public.pooling_runtime r'),{singleton:true,r1:false,r2:false,r3:false}))
console.log(JSON.stringify({passed:true,checks,scope:'Native real schema/service code with synthetic claims; not hosted JWT/browser or human UAT'}))
