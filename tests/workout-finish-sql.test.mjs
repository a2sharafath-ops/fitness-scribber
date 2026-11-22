import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const pg = new PGlite()
after(() => pg.close())
const owner = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
await pg.exec(`create schema auth; create role authenticated; create role anon;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  insert into auth.users values ('${owner}'), ('${other}');
  grant usage on schema auth, public to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;`)
for (const path of ['schema.sql', 'schema_program.sql', 'schema_assessments.sql', 'schema_workouts.sql',
  'migrations/20261119090000_live_training_session.sql']) {
  if (path === 'schema_assessments.sql') await pg.exec('alter table clients add column "userId" uuid')
  await pg.exec(await readFile('supabase/' + path, 'utf8'))
}
await pg.exec(`alter table workouts add column "bookingId" text;
  grant select, insert, update, delete on all tables in schema public to authenticated;
  set role authenticated; set request.jwt.claim.sub = '${owner}';
  insert into clients (id,name) values ('qa','Fictional client');
  insert into workouts (id,"clientId",date,status,"bookingId",main,"liveState")
  values ('qa-workout','qa','2026-11-22','in_progress','qa-booking',
    '[{"id":"bench","setRows":[{"id":"set-1","done":true,"reps":7,"load":44}]}]',
    '{"original":{"main":[]},"version":1}');
  reset role;`)
const readWorkout = async () => (await pg.query(
  `select to_jsonb(w)-'coachId' as workout from workouts w where id='qa-workout'`)).rows[0].workout
const migration = await readFile('supabase/migrations/20261122160000_atomic_workout_finish.sql', 'utf8')
const original = await readWorkout()
await pg.exec(migration)
await pg.exec(migration)
assert.deepEqual(await readWorkout(), original)

const completed = { ...original, status: 'completed', durationSec: 1680,
  liveState: { ...original.liveState, completionId: 'qa-attempt' } }
const effort = { id: 'finish-effort', clientId: 'qa', date: original.date, sessionId: 'qa-booking',
  rpe: 7, duration: 28, tl: 196, source: 'Workout completion' }
const max = { id: 'finish-strength', clientId: 'qa', date: original.date, kind: 'e1rm',
  valueKg: 54.3, exercise: 'Bench press', source: 'auto', sourceWorkoutId: original.id }
const assessment = { id: 'finish-assessment', clientId: 'qa', date: original.date, type: 'fitness', phase: 'progress',
  data: { sourceMaxId: max.id, sourceWorkoutId: original.id } }
const progress = { srpe: [effort], maxes: [max], assessments: [assessment] }
const finish = async (workout = completed, expected = original, records = progress) => (await pg.query(
  'select public.finish_live_workout($1::jsonb, $2::jsonb, $3::jsonb) as receipt',
  [JSON.stringify(workout), JSON.stringify(expected), JSON.stringify(records)])).rows[0].receipt

test('finish is atomic, preserves recorded sets, and replays safely after a lost response', async () => {
  await pg.exec(`set role authenticated; set request.jwt.claim.sub = '${other}';`)
  await assert.rejects(finish(), /no longer available/)
  await pg.exec(`set request.jwt.claim.sub = '${owner}';`)
  const changedSet = structuredClone(completed)
  changedSet.main[0].setRows[0].reps = 11
  await assert.rejects(finish(changedSet), /cannot change a recorded set/)
  await assert.rejects(finish(completed, { ...original, note: 'stale' }), /another window or device/)
  await assert.rejects(finish(completed, original, { ...progress, srpe: [{ ...effort, sessionId: 'other-booking' }] }), /Invalid effort/)

  // An error after the workout, effort and estimate writes rolls back all three.
  await pg.query(`insert into assessments (id,"clientId",date,type) values ($1,'qa',$2,'fitness')`, [assessment.id, original.date])
  await assert.rejects(finish(), /duplicate key/)
  assert.deepEqual(await readWorkout(), original)
  assert.equal((await pg.query('select id from srpe')).rows.length, 0)
  assert.equal((await pg.query('select id from maxes')).rows.length, 0)
  await pg.query('delete from assessments where id=$1', [assessment.id])

  const receipt = await finish()
  assert.deepEqual(receipt.workout, completed)
  assert.deepEqual(receipt.progress.srpe, [effort])
  assert.deepEqual(receipt.progress.maxes, [max])
  assert.equal(receipt.progress.assessments[0].id, assessment.id)
  assert.deepEqual(await finish(), receipt)
  await assert.rejects(finish({ ...completed, liveState: { ...completed.liveState, completionId: 'other-tab' } }), /another window or device/)
  assert.deepEqual((await pg.query('select id from srpe')).rows, [{ id: effort.id }])
  assert.deepEqual((await pg.query('select id from maxes')).rows, [{ id: max.id }])
  assert.deepEqual((await pg.query('select id from assessments')).rows, [{ id: assessment.id }])

  // Replaying a confirmation must respect a later correction or deletion.
  await pg.query('delete from srpe where id=$1', [effort.id])
  assert.deepEqual((await finish()).progress.srpe, [])
  await pg.exec('set role anon')
  await assert.rejects(finish(), /permission denied/)
})
