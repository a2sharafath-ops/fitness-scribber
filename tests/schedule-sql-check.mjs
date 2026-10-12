// Isolated PostgreSQL/WASM verification. No live Supabase connection is used.
import { pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite')
const pg = new PGlite(), owner='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222'
const file=async path=>pg.exec(await readFile(path,'utf8'))
try {
  await pg.exec(`create schema auth; create role authenticated; create role anon; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    insert into auth.users values ('${owner}'),('${other}'); grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`)
  await file('supabase/schema.sql');await file('supabase/schema_program.sql');await file('supabase/schema_session_name.sql')
  await pg.exec('alter table clients add column "userId" uuid;')
  await file('supabase/schema_workouts.sql');await file('supabase/schema_program_library.sql')
  await pg.exec('grant select,insert,update,delete on all tables in schema public to authenticated;')
  await file('supabase/migrations/20261011102502_protected_schedule.sql');await file('supabase/migrations/20261011102502_protected_schedule.sql')
  await pg.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'; insert into clients(id,name) values ('a','Client A'),('b','Client B');
    insert into sessions(id,"clientId",date,time,type,dur,status) values ('s','a','2099-01-05','09:00','1-on-1 Training',60,'Confirmed');
    insert into prescriptions(id,"clientId",date,name,items,blocks) values ('p','a','2099-01-05','Upper','[{"reps":5,"percent":80,"rir":2}]','[]');
    insert into "programAssignments"(id,"clientId",name,data) values ('assignment','a','Program','{"schedule":[{"prescriptionId":"p","date":"2099-01-05","week":1}]}');`)
  const get=async(table,id)=>(await pg.query(`select to_jsonb(t)-'coachId'-'requestHash' as row from public."${table}" t where id=$1`,[id])).rows[0]?.row||null
  const request=async next=>({original:await get('sessions','s'),next,plan:await get('prescriptions','p'),assignments:[await get('programAssignments','assignment')]})
  const rpc=r=>pg.query('select public.save_schedule_booking($1::jsonb)',[JSON.stringify(r)])
  const s=await get('sessions','s'),p=await get('prescriptions','p'),a=await get('programAssignments','assignment')
  await rpc(await request({...s,date:'2099-01-08'}))
  assert.equal((await get('sessions','s')).date,'2099-01-08')
  assert.deepEqual({...await get('prescriptions','p'),date:p.date},p)
  assert.equal((await get('programAssignments','assignment')).data.schedule[0].date,'2099-01-08')
  const moved=await get('sessions','s')
  await rpc({original:moved,next:{...moved,dur:30},plan:null,assignments:[]})
  assert.equal((await get('sessions','s')).dur,30)
  await pg.exec(`insert into prescriptions(id,"clientId",date,name) values('occupied','a','2099-01-09','Lower');`)
  const blocked=await request({...await get('sessions','s'),date:'2099-01-09'})
  await assert.rejects(rpc(blocked),/Day already prescribed/)
  assert.equal((await get('sessions','s')).date,'2099-01-08');assert.equal((await get('prescriptions','p')).date,'2099-01-08')
  await pg.exec(`insert into sessions(id,"clientId",date,time,type,dur,status) values('other','b','2099-01-10','09:00','Consultation',60,'Confirmed')`)
  await assert.rejects(rpc(await request({...await get('sessions','s'),date:'2099-01-10'})),/Coach time already occupied/)
  await rpc(await request({...await get('sessions','s'),date:'2099-01-10',time:'10:00'}))
  const stale=await request({...await get('sessions','s'),date:'2099-01-11'})
  await pg.exec(`update prescriptions set name='Edited elsewhere' where id='p'`)
  await assert.rejects(rpc(stale),/workout changed/)
  assert.equal((await get('sessions','s')).date,'2099-01-10')
  const now=await get('sessions','s')
  await rpc({original:now,next:{...now,time:'23:30',dur:30},plan:null,assignments:[]})
  await assert.rejects(rpc({original:null,next:{id:'late',clientId:'b',date:now.date,time:'23:45',dur:15,type:'Check-in',status:'Pending'},plan:null,assignments:[]}),/Coach time already occupied/)
  // RLS isolation and execute privileges are exercised as actual roles.
  await pg.exec(`set request.jwt.claim.sub='${other}'`)
  await assert.rejects(rpc(stale),/Client unavailable/)
  assert.equal(await get('sessions','s'),null)
  await pg.exec('set role anon')
  await assert.rejects(rpc(stale),/permission denied/)
  await pg.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'`)
  const final=await get('sessions','s')
  await rpc({original:final,next:{...final,status:'Completed'},plan:null,assignments:[]})
  const complete=await get('sessions','s')
  await assert.rejects(rpc({...await request({...complete,date:'2099-01-12'})}),/Session protected/)
  assert.equal((await get('programAssignments','assignment')).data.schedule[0].week,a.data.schedule[0].week)
  console.log('Schedule SQL checks passed: repeatable setup, atomic move/resize, conflict rollback, midnight overlap, stale prescription, completed protection, owner isolation and anonymous rejection.')
} finally { await pg.close() }
