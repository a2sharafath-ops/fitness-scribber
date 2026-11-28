import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { FOLLOWUP_CONDITIONS, GENERAL_QUESTIONS, parqOutcome } from '../src/lib/parq.js'

const pg = new PGlite()
after(() => pg.close())
const actors = Object.fromEntries(['coach', 'otherCoach', 'athlete', 'otherAthlete', 'admin']
  .map((name, i) => [name, `00000000-0000-4000-8000-00000000000${i + 1}`]))
const { coach, otherCoach, athlete, otherAthlete, admin } = actors
const as = id => pg.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}'`)
const omitPrivate = row => {
  for (const key of ['coachId', 'outcome', 'programStatus', 'clearance', 'rescreenLog']) assert.equal(Object.hasOwn(row, key), false, key)
}
const load = async id => (await pg.query('select public.athlete_screenings($1) as result', [id])).rows[0].result
const save = async (id, row, submit = false) => (await pg.query(
  'select public.save_athlete_screening($1, $2::jsonb, $3) as result', [id, JSON.stringify(row), submit],
)).rows[0].result
const draft = (id, overrides) => ({ id, step: 'parq', consent: {}, parq: {}, hhq: {}, goals: {}, acknowledgements: null, ...overrides })

await pg.exec(`
  create role anon; create role authenticated;
  create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  insert into auth.users values ${Object.values(actors).map(id => `('${id}')`).join(',')};
  grant usage on schema auth, public to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  create table public.profiles(id uuid primary key, role text);
  insert into public.profiles values
    ('${coach}','coach'), ('${otherCoach}','coach'), ('${athlete}','athlete'),
    ('${otherAthlete}','athlete'), ('${admin}','admin');
  create table public.clients(id text primary key, "coachId" uuid, "userId" uuid);
  insert into public.clients values ('mine', '${coach}', '${athlete}'), ('other', '${otherCoach}', '${otherAthlete}');
`)
await pg.exec(await readFile('supabase/schema_screenings.sql', 'utf8'))
await pg.exec(`
  grant select, insert, update, delete on all tables in schema public to authenticated;
  create policy athlete_reads_screenings on public.screenings for select to authenticated using (true);
  create policy athlete_inserts_screenings on public.screenings for insert to authenticated with check (true);
  create policy athlete_updates_screenings on public.screenings for update to authenticated using (true);
  create policy admin_reads on public.screenings for select to authenticated using (true);
  insert into public.screenings(id, "clientId", "coachId", status, "completedOn", "validUntil", parq, outcome, "programStatus", clearance)
  values ('history', 'mine', '${coach}', 'complete', '2025-10-14', '2026-10-14', '{"general":{"G1":true}}',
    'C', 'ready', '{"status":"received","notes":"PRIVATE"}'),
  ('other-history','other','${otherCoach}','complete','2026-10-14','2027-10-14','{}','A','ready','{}');
`)
const migration = await readFile('supabase/migrations/20261128100000_screening_drafts_and_athlete_access.sql', 'utf8')
await pg.exec(migration)
await pg.exec(migration)

test('athletes see only their answers and cannot read or write the full screening rows', async () => {
  await as(athlete)
  const [history] = await load('mine')
  assert.deepEqual(history.parq, { general: { G1: true } })
  omitPrivate(history)
  assert.deepEqual(await load('other'), [])
  assert.deepEqual((await pg.query('select * from public.screenings')).rows, [])
  assert.equal((await pg.query("update public.screenings set clearance='{}'")).affectedRows, 0)
  await assert.rejects(pg.query(`insert into public.screenings(id,"clientId") values ('direct','mine')`), /row-level security/)
  await assert.rejects(save('other', draft('fake')), /unavailable/)
  await assert.rejects(save('mine', draft('other-history')), /changed/)
})

test('athlete re-screening resumes, preserves history and prevents stale overwrites', async () => {
  await as(athlete)
  const first = await save('mine', draft('rescreen', { outcome: 'A', clearance: { status: 'received' } }))
  omitPrivate(first)
  const next = await save('mine', { ...first, step: 'declaration', parq: { general: { G1: false } } })
  const retry = await save('mine', { ...first, step: 'declaration', parq: { general: { G1: false } } })
  assert.deepEqual(retry, next)
  await assert.rejects(save('mine', { ...first, step: 'personal' }), /changed/)
  const [restored, history] = await load('mine')
  assert.deepEqual(restored, next)
  assert.equal(history.id, 'history')
  await as(coach)
  const { rows: [trainerDraft] } = await pg.query("select * from public.screenings where id='rescreen'")
  assert.equal(trainerDraft.rescreenLog[0].reason, 'expired')
  assert.equal(trainerDraft.outcome, null)
  assert.equal(trainerDraft.clearance, null)
  assert.deepEqual((await pg.query("select clearance from public.screenings where id='history'")).rows[0].clearance, { status: 'received', notes: 'PRIVATE' })
})

test('athlete submit derives the private result on the server and keeps completed answers read-only', async () => {
  const general = Object.fromEntries(GENERAL_QUESTIONS.map(({ id }) => [id, false]))
  await as(athlete)
  const [active] = await load('mine')
  await assert.rejects(save('mine', active, true), /required screening answers/)
  const payload = { ...active, consent: { collect: 'confirmed', share: 'confirmed' },
    parq: { general, declaration: { name: 'Test', signature: 'Test' } },
    hhq: { symptoms: { chest_pain: true } },
    acknowledgements: { accurate: true, share: true, notMedicalAdvice: true, reportChanges: true },
    outcome: 'C', clearance: { status: 'received' },
  }
  const submitted = await save('mine', payload, true)
  assert.equal(submitted.status, 'complete')
  omitPrivate(submitted)
  await assert.rejects(save('mine', { ...submitted, goals: { primary: 'Changed' } }), /changed/)
  await as(coach)
  const [result] = (await pg.query(`select outcome, clearance, "programStatus" from public.screenings where id='rescreen'`)).rows
  assert.equal(result.outcome, 'A')
  assert.equal(result.programStatus, 'gated')
  assert.equal(result.clearance.status, 'not_started')
  assert.equal((await pg.query("update public.screenings set clearance='{\"status\":\"received\"}' where id='rescreen'")).affectedRows, 1)
  assert.deepEqual((await pg.query("select * from public.screenings where id='other-history'")).rows, [])
  await as(athlete)
  const [beforeRetry] = await load('mine')
  const { updatedAt: _updatedAfterClearance, ...answers } = beforeRetry
  const { updatedAt: _updatedAtSubmit, ...submittedAnswers } = submitted
  assert.deepEqual(answers, submittedAnswers)
  assert.deepEqual(await save('mine', payload, true), beforeRetry)
  await as(coach)
  assert.equal((await pg.query("select clearance->>'status' as status from public.screenings where id='rescreen'")).rows[0].status, 'received')
})

test('database outcome matches Orbit across all follow-up branches', async () => {
  await pg.exec('reset role')
  const general = Object.fromEntries(GENERAL_QUESTIONS.map(({ id }) => [id, false]))
  const followup = Object.fromEntries(FOLLOWUP_CONDITIONS.map(({ id }) => [id, false]))
  const check = async parq => {
    const [{ outcome }] = (await pg.query('select public.screening_parq_outcome($1::jsonb) as outcome', [JSON.stringify(parq)])).rows
    assert.equal(outcome, parqOutcome(parq))
  }
  await check({ general })
  await check({ general: { ...general, G7: true }, followup })
  await check({ general: { ...general, G7: true }, followup: {} })
  for (const { id, sub } of FOLLOWUP_CONDITIONS) {
    const branch = { ...followup, [id]: true, ...Object.fromEntries(sub.map(({ id: key }) => [key, false])) }
    await check({ general: { ...general, G1: true }, followup: branch })
    for (const { id: key } of sub) await check({ general: { ...general, G1: true }, followup: { ...branch, [key]: true } })
  }
})

test('admin, unlinked coach, and anonymous sessions have no direct access to athlete screening outcomes', async () => {
  await as(admin)
  assert.deepEqual((await pg.query('select * from public.screenings')).rows, [])
  assert.deepEqual(await load('mine'), [])
  await as(otherCoach)
  assert.deepEqual((await pg.query("select * from public.screenings where id='rescreen'")).rows, [])
  await as(otherAthlete)
  assert.deepEqual(await load('mine'), [])
  await assert.rejects(pg.query("select public.screening_athlete_answers(null::public.screenings)"), /permission denied/)
  await pg.exec('set role anon')
  await assert.rejects(load('mine'), /permission denied/)
  await assert.rejects(save('mine', draft('anon')), /permission denied/)
})
