import assert from 'node:assert/strict'
import {nativeFixture as f} from './native-flow.mjs'
import {sql,jsonSQL,literal,asActor} from './native-connection.mjs'
const run=crypto.randomUUID(),assignmentId=f.assignment.assignmentId
const original=jsonSQL(`select jsonb_build_object('id',e.id,'payload',e.payload,'recordedAt',e.recorded_at) from public.pooling_execution_events e where e.assignment_id=${assignmentId} and e.kind='actual'`)
const call=payload=>asActor(`select public.pooling_execution(${assignmentId},${f.generation},${literal(crypto.randomUUID())},'actual',${literal(payload)})`,f.athlete)
assert.throws(()=>sql(call({...original.payload,performedAt:null})),/invalid_actual/)
assert.throws(()=>sql(call({...original.payload,performedAt:new Date().toISOString()})),/invalid_actual/)
assert.throws(()=>sql(call({...original.payload,performedAt:original.recordedAt})),/correction_required/)
assert.throws(()=>sql(call({...original.payload,performedAt:original.recordedAt,supersedes:original.id,correctionReason:''})),/invalid_actual/)
const correction={...original.payload,performedAt:original.recordedAt,supersedes:original.id,correctionReason:'Fictional typo correction',actual:1,loadKg:0}
jsonSQL(call(correction))
assert.deepEqual(jsonSQL(`select payload from public.pooling_execution_events where id=${original.id}`),original.payload)
assert.throws(()=>sql(call(correction)),/invalid_actual/)
const projection=jsonSQL(asActor(`select public.pooling_read_assignments(${literal(f.client)})`,f.athlete)).find(row=>row.id===assignmentId)
assert.equal(projection.actuals.length,2);assert.equal(projection.actuals[1].supersedes,original.id);assert.equal(projection.actuals[1].loadKg,0)
const workout=`synthetic-legacy-${run}`
sql(`insert into public.workouts(id,"coachId","clientId",date,status,main) values(${literal(workout)},${literal(f.coach)},${literal(f.client)},'2026-09-07','in_progress','[{"actual":0,"privateNote":"fixture not in client projection"}]')`)
const prior=jsonSQL(`select to_jsonb(w)-'status' from public.workouts w where id=${literal(workout)}`)
const stopped=jsonSQL(asActor(`select public.pooling_stop_legacy(${literal(f.client)},${literal(workout)})`,f.athlete));assert.equal(stopped.status,'committed')
assert.deepEqual(jsonSQL(`select to_jsonb(w)-'status' from public.workouts w where id=${literal(workout)}`),prior)
const home=jsonSQL(asActor(`select public.pooling_client_home(${literal(f.client)})`,f.athlete))
assert(!JSON.stringify(home).includes('privateNote'));assert(home.classicHistory.some(row=>row.id===workout && row.status==='stopped'))
console.log(JSON.stringify({test:'late actual/correction boundaries, duplicate protection, retained original/zero load and safe Classic stop/history',passed:true}))
