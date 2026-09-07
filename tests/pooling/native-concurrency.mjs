import assert from 'node:assert/strict'
import {sql,jsonSQL,literal,asActor,sqlProcess,coach,athlete} from './native-connection.mjs'
const run=crypto.randomUUID(),client=`concurrent-${run}`,manifest=`concurrent-manifest-${run}`
sql(`insert into public.clients(id,"coachId","userId",name) values(${literal(client)},${literal(coach)},${literal(athlete)},'Synthetic concurrency only');insert into public.pooling_contexts(client_id,held) values(${literal(client)},false);insert into public.pooling_manifests(id,state,document) values(${literal(manifest)},'published',${literal({manifest:{id:manifest}})})`)
function decision(key){
 const d=jsonSQL(asActor(`select public.pooling_save_draft(${literal(client)},1,${literal(run+key)},jsonb_build_object('date',to_char(now() at time zone 'UTC','YYYY-MM-DD')))`))
 sql(`insert into public.pooling_source_snapshots(draft_id,client_id,generation,manifest_id,context_input,session_request,verified,valid_until) values(${d.id},${literal(client)},1,${literal(manifest)},jsonb_build_object('sessionAt',now(),'timeZone','UTC'),'{}',true,now()+interval '1 hour')`)
 const snapshot=jsonSQL(`select public.pooling_decision_input(${literal(coach)},${literal(client)},${d.id})`)
 const v=jsonSQL(`select public.pooling_record_decision(${literal(coach)},${literal(client)},${d.id},1,${literal(manifest)},${literal(snapshot.sourceToken)},${literal({contextGeneration:1,manifestId:manifest,completeness:'ready_for_coach_review',sessionState:'eligible_for_coach_review',blocks:[{occurrenceId:'fixture',dose:{prescription:{sets:1}}}]})})`)
 return {draftId:d.id,decisionId:v.decisionId}
}
const first=decision('first'),second=decision('second')
const count=()=>Number(sql(`select count(*) from public.pooling_assignments where client_id=${literal(client)}`))
try{sql(asActor(`select public.pooling_approve_batch(${literal(client)},1,${literal(run+'failed-batch')},${literal([first,{...second,decisionId:2147483647}])})`));throw Error('Batch unexpectedly accepted')}
catch(error){assert.match(error.stderr?.toString() || error.message,/decision_unavailable/)}
assert.equal(count(),0,'failed second item rolled back first approval')
const batch=jsonSQL(asActor(`select public.pooling_approve_batch(${literal(client)},1,${literal(run+'batch')},${literal([first,second])})`))
assert.equal(count(),2);assert.deepEqual(jsonSQL(asActor(`select public.pooling_approve_batch(${literal(client)},1,${literal(run+'batch')},${literal([first,second])})`)),batch)
const third=decision('third')
const health=sqlProcess(asActor(`select public.pooling_submit_report(${literal(client)},1,${literal(run+'health')},'healthChange','"changed"',now());select pg_advisory_xact_lock(934617);select pg_sleep(0.8)`,athlete))
const healthDone=new Promise((resolve,reject)=>{let err='';health.stderr.on('data',data=>err+=data);health.on('exit',code=>code===0?resolve():reject(Error(err)))})
for(let i=0;i<20;i++){
 const busy=sql('select not pg_try_advisory_lock(934617)')==='t'
 if(busy)break
 if(i===19)throw Error('Concurrent transaction did not enter')
 await new Promise(resolve=>setTimeout(resolve,30))
}
try{sql(asActor(`select public.pooling_approve(${literal(client)},${third.draftId},${third.decisionId},1,${literal(run+'stale-approval')})`));throw Error('Stale approval accepted')}
catch(error){assert.match(error.stderr?.toString() || error.message,/stale_context/)}
await healthDone
assert.equal(count(),2)
try{sql(asActor(`select public.pooling_execution(${batch.assignments[0].assignmentId},1,${literal(run+'stale-start')},'start','{"healthChange":"no_change"}')`,athlete));throw Error('Stale assigned start accepted')}
catch(error){assert.match(error.stderr?.toString() || error.message,/stale_context/)}
console.log(JSON.stringify({test:'real PostgreSQL batch rollback, retry and concurrent health/approval plus post-approval invalidation',passed:true}))
