import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const pg = new PGlite()
after(() => pg.close())
const owner = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const date = '2099-03-12'
const file = async path => pg.exec(await readFile(path, 'utf8'))

test('per-booking workouts preserve earlier rows and enforce one independently saved workout per booking', async () => {
  await pg.exec(`create schema auth; create role authenticated; create role anon;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    insert into auth.users values ('${owner}'),('${other}');
    grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`)
  await file('supabase/schema.sql')
  await file('supabase/schema_program.sql')
  await file('supabase/schema_session_name.sql')
  await pg.exec('alter table clients add column "userId" uuid')
  await file('supabase/schema_workouts.sql')
  await file('supabase/schema_program_library.sql')
  await file('supabase/migrations/20261011102502_protected_schedule.sql')
  await file('supabase/migrations/20261119090000_live_training_session.sql')
  await pg.exec(`grant select,insert,update,delete on all tables in schema public to authenticated;
    set role authenticated; set request.jwt.claim.sub='${owner}';
    insert into clients(id,name) values ('booking-test','Booking Test Client'),('other-client','Other Test Client');
    insert into prescriptions(id,"clientId",date,name,items) values ('day-plan','booking-test','${date}','Original prescription','[{"reps":8}]');
    insert into workouts(id,"clientId",date,title,status,main) values
    ('legacy','booking-test','${date}','Earlier workout','completed','[{"setRows":[{"id":"kept","done":true,"load":45,"reps":8}]}]');`)

  const read = async (table, id) => (await pg.query(`select to_jsonb(t)-'coachId' as row from public.${table} t where id=$1`, [id])).rows[0]?.row
  const oldPlan = await read('prescriptions', 'day-plan')
  const oldWorkout = await read('workouts', 'legacy')
  await pg.exec('reset role')
  const migration = 'supabase/migrations/20261121090000_booking_workouts.sql'
  await file(migration)
  await file(migration)
  await pg.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'`)
  const book = (next, original = null) => pg.query('select public.save_schedule_booking($1::jsonb)', [JSON.stringify({ original, next, plan: null, assignments: [] })])
  const save = (workout, expected = null) => pg.query('select public.save_live_workout($1::jsonb,$2::jsonb)', [JSON.stringify(workout), expected && JSON.stringify(expected)])
  const first = { id: 'morning', clientId: 'booking-test', date, time: '09:00', type: '1-on-1 Training', dur: 60, status: 'Confirmed' }
  const second = { ...first, id: 'afternoon', time: '15:00' }
  await book(first)
  const running = (bookingId, title, reps) => ({
    id: `booking:${bookingId}`, bookingId, clientId: first.clientId, date, title, status: 'in_progress',
    warmup: [], cooldown: [], main: [],
    liveState: { original: [{ sets: [{ reps }] }] },
  })
  const morning = running(first.id, 'Strength', 8)
  const afternoon = running(second.id, 'Technique', 12)
  await save(morning)
  await save(morning)
  await assert.rejects(save({ ...morning, title: 'Conflicting workout' }), /another window or device/)
  await assert.rejects(save({ ...morning, id: 'duplicate' }), /workouts_booking_uidx/)
  const morningSaved = await read('workouts', morning.id)
  const morningDone = { ...morningSaved, status: 'completed', main: [{ setRows: [{ id: 'morning-set', done: true, reps: 7, load: 40 }] }] }
  await save(morningDone, morningSaved)
  await book({ ...first, status: 'Completed' }, first)
  await book(second)
  await assert.rejects(book({ ...second, id: 'overlap', time: '15:30' }), /Coach time already occupied/)
  await assert.rejects(save({ ...afternoon, clientId: 'other-client' }), /booking is unavailable/)
  await assert.rejects(save({ ...afternoon, date: '2099-03-13' }), /booking is unavailable/)
  await save(afternoon)
  const afternoonSaved = await read('workouts', afternoon.id)
  const afternoonDone = { ...afternoonSaved, status: 'completed', main: [{ setRows: [{ id: 'afternoon-set', done: true, reps: 11, load: 30 }] }] }
  await save(afternoonDone, afternoonSaved)
  await assert.rejects(save({ ...afternoonDone, bookingId: first.id }, afternoonDone), /booking cannot change/)
  await assert.rejects(save({ ...afternoonDone, main: [] }, afternoonDone), /recorded set/)
  await assert.rejects(pg.exec("update public.sessions set time='16:00' where id='afternoon'"), /workout is linked/)
  await assert.rejects(pg.exec("delete from public.sessions where id='afternoon'"), /foreign key/)
  await pg.exec(`set request.jwt.claim.sub='${other}'`)
  assert.equal(await read('workouts', afternoon.id), undefined)
  await assert.rejects(save({ ...afternoonDone, note: 'Other coach' }, afternoonDone), /no longer accessible/)
  await pg.exec(`set request.jwt.claim.sub='${owner}'`)
  assert.deepEqual(await read('prescriptions', 'day-plan'), oldPlan)
  assert.deepEqual(await read('workouts', 'legacy'), { ...oldWorkout, bookingId: null })
  assert.deepEqual(await read('workouts', morning.id), morningDone)
  assert.deepEqual(await read('workouts', afternoon.id), afternoonDone)
})
