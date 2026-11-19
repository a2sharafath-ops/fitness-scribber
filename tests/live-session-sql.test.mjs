import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const pg = new PGlite()
after(() => pg.close())
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222'
const migration = await readFile('supabase/migrations/20261119090000_live_training_session.sql', 'utf8')
await pg.exec(`create schema auth; create role authenticated; create role anon;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  insert into auth.users values ('${owner}'),('${other}');
  grant usage on schema auth, public to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;`)
await pg.exec(await readFile('supabase/schema.sql', 'utf8'))
await pg.exec('alter table clients add column "userId" uuid;')
await pg.exec(await readFile('supabase/schema_workouts.sql', 'utf8'))
await pg.exec('grant select, insert, update, delete on all tables in schema public to authenticated;')
await pg.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';
  insert into clients(id,name) values ('synthetic','Synthetic client');
  insert into workouts(id,"clientId",date,status,main) values ('legacy','synthetic','2026-11-19','in_progress','[{"id":"bench","name":"Bench press","setRows":[{"id":"one","done":true,"reps":8,"load":45}]}]'); reset role;`)
const read = async () => (await pg.query("select to_jsonb(w)-'coachId' as workout from workouts w where id='legacy'")).rows[0].workout
const before = await read()
await pg.exec(migration)
await pg.exec(migration)
assert.deepEqual(await read(), { ...before, liveState: null })
await pg.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'`)
const rpc = (workout, expected) => pg.query('select public.save_live_workout($1::jsonb,$2::jsonb)', [JSON.stringify(workout), expected && JSON.stringify(expected)])

test('conditional workout saves preserve data and reject stale, inaccessible, and destructive updates', async () => {
  const original = await read()
  const updated = { ...original, liveState: { version: 1, original: { main: original.main }, blocks: [] }, note: 'First save' }
  await rpc(updated, original)
  assert.deepEqual(await read(), updated)
  await rpc(updated, original) // same request after a response was lost
  const stale = { ...updated, note: 'Stale overwrite' }
  await assert.rejects(rpc(stale, original), /another window or device/)
  assert.equal((await read()).note, 'First save')
  const changedSnapshot = structuredClone(updated)
  changedSnapshot.liveState.original.main = []
  await assert.rejects(rpc(changedSnapshot, updated), /original workout/)
  await assert.rejects(rpc({ ...updated, main: [] }, updated), /recorded set/)
  await assert.rejects(pg.query('update workouts set "liveState"=null where id=\'legacy\''), /snapshot must be preserved/)
  await pg.exec(`set request.jwt.claim.sub='${other}'`)
  await assert.rejects(rpc({ ...updated, note: 'Another coach' }, updated), /no longer accessible/)
  await pg.exec(`set request.jwt.claim.sub='${owner}'`)
  assert.deepEqual(await read(), updated)
  await pg.exec('set role anon')
  await assert.rejects(rpc(updated, updated), /permission denied/)
})
