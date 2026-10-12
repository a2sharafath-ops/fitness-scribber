// Optional integration test using an isolated PostgreSQL WASM instance.
// PGLITE_MODULE optionally overrides the development dependency.
// No production database is used.
import { pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite')
const pg = new PGlite()
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222'
const execFile = async path => pg.exec(await readFile(path, 'utf8'))
try {
  await pg.exec(`create schema auth; create role authenticated; create role anon;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    insert into auth.users values ('${owner}'), ('${other}');
    grant usage on schema auth, public to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`)
  await execFile('supabase/schema.sql')
  await execFile('supabase/schema_program.sql')
  await pg.exec('alter table public.clients add column "userId" uuid;')
  await execFile('supabase/schema_workouts.sql')
  await pg.exec('grant select, insert, update, delete on all tables in schema public to authenticated;')
  await execFile('supabase/schema_program_library.sql')
  await execFile('supabase/schema_program_library.sql') // idempotent setup
  await execFile('supabase/schema_session_name.sql')
  await execFile('supabase/migrations/20261011102502_protected_schedule.sql')
  await execFile('supabase/migrations/20261011122215_program_training_times.sql')
  await execFile('supabase/migrations/20261011123312_training_plan_sync.sql')
  await execFile('supabase/migrations/20261011122215_program_training_times.sql')
  await pg.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';
    insert into clients(id,name) values ('client-a','Coach A client');`)
  const row = (id, date) => ({ id, clientId: 'client-a', date, name: id, notes: '', blocks: [{ blockType: 'Main Lifts', exercises: [] }], items: [] })
  const assign = (id, rows) => ({ id, clientId: 'client-a', name: 'SQL test', data: { weeks: 1, start: rows[0].date, schedule: rows.map(r => ({ prescriptionId: r.id, date: r.date })) } })
  const rpc = (a, rows, expected = rows.map(() => null)) => pg.query('select public.assign_program($1::jsonb, $2::jsonb, $3::jsonb)', [JSON.stringify(a), JSON.stringify(rows), JSON.stringify(expected)])
  const count = async table => (await pg.query(`select count(*)::integer as n from public."${table}"`)).rows[0].n
  const rows = [row('p1','2099-01-05'), row('p2','2099-01-07')], a = assign('a1', rows)
  await rpc(a, rows)
  assert.equal(await count('prescriptions'),2); assert.equal(await count('programAssignments'),1)
  await pg.query("update prescriptions set name = 'Personalized' where id = 'p1'")
  await rpc(a, rows)
  assert.equal((await pg.query("select name from prescriptions where id = 'p1'")).rows[0].name, 'Personalized')
  assert.equal(await count('prescriptions'),2)
  await assert.rejects(rpc(a, rows.map(r => ({ ...r, name: 'Changed retry' }))), /different sessions/)
  const blocked = [row('p3','2099-01-12'), row('p4','2099-01-14')]
  await pg.exec("insert into workouts(id,\"clientId\",date,status) values('w1','client-a','2099-01-14','in_progress')")
  await assert.rejects(rpc(assign('a2',blocked), blocked), /protected/)
  assert.equal(await count('prescriptions'),2); assert.equal(await count('programAssignments'),1)
  const race = [row('p5','2099-01-19'), row('p6','2099-01-21')]
  await pg.exec("insert into prescriptions(id,\"clientId\",date,name,blocks) values('other-plan','client-a','2099-01-21','Another plan','[]')")
  await assert.rejects(rpc(assign('a3',race), race), /calendar changed/)
  assert.equal(await count('prescriptions'),3)
  const existing = (await pg.query("select to_jsonb(p)-'coachId' as p from prescriptions p where id='other-plan'")).rows[0].p
  race[1].id = 'other-plan'
  await rpc(assign('a3',race), race, [null,existing])
  assert.equal(await count('prescriptions'),4)
  const timing={time:'17:30',duration:60}
  await pg.query('update clients set intake=$1 where id=$2',[{trainingSchedule:timing},'client-a'])
  const scheduledRows=[row('timed1','2099-03-02'),row('timed2','2099-03-04')]
  const scheduled=assign('timed-assignment',scheduledRows)
  scheduled.data.trainingTiming=timing
  scheduled.data.initialBookings=scheduledRows.map((r,i)=>({id:'booking'+i,clientId:'client-a',date:r.date,time:timing.time,dur:60,type:'Personal training',status:'Confirmed',notes:''}))
  const timedRpc=a=>pg.query('select public.assign_program_scheduled($1::jsonb,$2::jsonb,$3::jsonb)',[JSON.stringify(a),JSON.stringify(scheduledRows),JSON.stringify([null,null])])
  await pg.exec("insert into sessions(id,\"clientId\",date,time,type,dur,status) values('blocker','client-a','2099-03-04','18:00','Personal training',60,'Confirmed')")
  const beforeTimed=await count('prescriptions'),beforeAssignments=await count('programAssignments')
  await assert.rejects(timedRpc(scheduled),/2099-03-04.*Coach time already occupied/)
  assert.equal(await count('prescriptions'),beforeTimed);assert.equal(await count('programAssignments'),beforeAssignments)
  assert.equal((await pg.query("select count(*)::int as n from sessions where id like 'booking%'")).rows[0].n,0)
  await pg.exec("update sessions set status='Cancelled' where id='blocker'")
  const wrong=structuredClone(scheduled);wrong.data.trainingTiming.time='18:30'
  await assert.rejects(timedRpc(wrong),/Profile training time changed/)
  const duplicate=structuredClone(scheduled);duplicate.data.initialBookings[1].date=duplicate.data.initialBookings[0].date
  await assert.rejects(timedRpc(duplicate),/one unique booking/)
  await timedRpc(scheduled)
  assert.equal(await count('prescriptions'),beforeTimed+2)
  await pg.exec("update sessions set time='19:00' where id='booking0'")
  await timedRpc(scheduled)
  assert.equal((await pg.query("select time from sessions where id='booking0'")).rows[0].time,'19:00')
  assert.equal((await pg.query("select count(*)::int as n from sessions where id like 'booking%'")).rows[0].n,2)
  const syncRpc=r=>pg.query('select public.save_training_plan_batch($1::jsonb)',[JSON.stringify(r)])
  const oldIntake={trainingSchedule:timing}, newTiming={time:'10:00',duration:60}, newIntake={trainingSchedule:newTiming}
  const builderRow=row('builder-row','2099-04-06')
  const syncRequest={clients:[{id:'client-a',expectedIntake:oldIntake,intake:newIntake}],plans:[{original:null,next:builderRow}],timings:[{clientId:'client-a',timing:newTiming}],bookings:[{id:'builder-booking',clientId:'client-a',date:builderRow.date,time:'10:00',dur:60,type:'Personal training',status:'Confirmed',notes:''}]}
  await pg.exec("insert into sessions(id,\"clientId\",date,time,type,dur,status) values('sync-blocker','client-a','2099-04-06','10:00','Personal training',60,'Confirmed')")
  await assert.rejects(syncRpc(syncRequest),/2099-04-06.*Coach time already occupied/)
  assert.deepEqual((await pg.query("select intake from clients where id='client-a'")).rows[0].intake,oldIntake)
  assert.equal((await pg.query("select count(*)::int as n from prescriptions where id='builder-row'")).rows[0].n,0)
  await pg.exec("update sessions set status='Cancelled' where id='sync-blocker'")
  await syncRpc(syncRequest);await syncRpc(syncRequest)
  assert.equal((await pg.query("select count(*)::int as n from sessions where id='builder-booking'")).rows[0].n,1)
  assert.equal((await pg.query("select time from sessions where id='builder-booking'")).rows[0].time,'10:00')
  const stale=structuredClone(syncRequest);stale.clients[0].expectedIntake={};stale.clients[0].intake={trainingSchedule:{time:'11:00',duration:60}}
  await assert.rejects(syncRpc(stale),/Profile changed/)
  await pg.exec(`set request.jwt.claim.sub = '${other}';`)
  assert.equal(await count('programAssignments'),0)
  await assert.rejects(rpc(assign('stolen',[row('stolen-row','2099-02-02')]),[row('stolen-row','2099-02-02')]), /Client not found/)
  await assert.rejects(pg.query('insert into "programAssignments"(id,"clientId",name,data) values($1,$2,$3,$4)', ['stolen','client-a','Bad',{schedule:[]}]), /row-level security/)
  await pg.exec(`set request.jwt.claim.sub = '${owner}'; delete from prescriptions; delete from workouts; delete from clients where id='client-a';`)
  assert.equal(await count('programAssignments'),0)
  console.log('SQL checks passed: timed assignment rollback, profile validation, booking retry, RLS,  setup twice, atomic commit/rollback, retry, conflict detection, explicit replacement, RLS isolation, deletion cascade.')
} finally { await pg.close() }
