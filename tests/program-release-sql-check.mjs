// Test the exact reviewed release transaction using synthetic rows only.
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const pg = new PGlite()
const owner = '11111111-1111-4111-8111-111111111111'
try {
  await pg.exec(`create schema auth; create role anon; create role authenticated;
    create table auth.users(id uuid primary key); insert into auth.users values('${owner}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`)
  for (const file of ['supabase/schema.sql','supabase/schema_program.sql']) await pg.exec(await readFile(file,'utf8'))
  await pg.exec('alter table clients add column "userId" uuid;')
  await pg.exec(await readFile('supabase/schema_workouts.sql','utf8'))
  await pg.query('insert into clients(id,"coachId",name) values($1,$2,$3)',['ihw9kzb',owner,'Synthetic release fixture'])
  let sql = await readFile('docs/program-release-install.sql','utf8')
  const targets = [...sql.matchAll(/\('([^']+)','(2026-07-\d+)','([a-f0-9]{32})'\)/g)]
  assert.equal(targets.length,6)
  for (const [,id,date] of targets) await pg.query('insert into prescriptions(id,"coachId","clientId",date,name) values($1,$2,$3,$4,$5)',[id,owner,'ihw9kzb',date,'Synthetic plan'])
  await pg.query('insert into prescriptions(id,"coachId","clientId",date) values($1,$2,$3,$4)',['untouched',owner,'ihw9kzb','2026-07-25'])
  const before = (await pg.query('select * from prescriptions order by id')).rows
  // The real production fingerprints must reject different/stale records.
  await assert.rejects(pg.exec(sql),/Reviewed plans changed/)
  await pg.exec('rollback')
  assert.deepEqual((await pg.query('select * from prescriptions order by id')).rows,before)
  for (const [,id,,hash] of targets) {
    const fixtureHash = (await pg.query('select md5(to_jsonb(p)::text) as hash from prescriptions p where id=$1',[id])).rows[0].hash
    sql = sql.replace(hash,fixtureHash)
  }
  // Failure after deletion and installation restores data AND schema.
  await assert.rejects(pg.exec(sql.replace("notify pgrst, 'reload schema';", () => "do $$ begin raise exception 'simulated installation failure'; end $$;")),/simulated installation failure/)
  await pg.exec('rollback')
  assert.deepEqual((await pg.query('select * from prescriptions order by id')).rows,before)
  assert.equal((await pg.query("select to_regclass('programs') as relation")).rows[0].relation,null)
  await pg.exec(sql)
  assert.deepEqual((await pg.query('select id from prescriptions')).rows,[{id:'untouched'}])
  const backup = (await pg.query('select row_data from app_private.release_prescription_backup order by id')).rows.map(r=>r.row_data)
  assert.deepEqual(backup,before.filter(r=>r.id!=='untouched'))
  for (const role of ['anon','authenticated']) assert.equal((await pg.query("select has_table_privilege($1,'app_private.release_prescription_backup','select') as allowed",[role])).rows[0].allowed,false)
  for (const name of ['assign_program','assign_program_scheduled','save_schedule_booking','save_training_plan_batch']) assert.equal((await pg.query('select count(*)::int as n from pg_proc where proname=$1',[name])).rows[0].n,1)
  console.log('Release SQL checks passed: stale-row rejection, full rollback, exact six-row cleanup, private full-row backup, unrelated plan retained, four RPCs installed.')
} finally { await pg.close() }
