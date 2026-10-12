import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Uses captured function bodies and minimal fictional tables, never production data.
const coach = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const athlete = '33333333-3333-4333-8333-333333333333'
const predicates = ['pooling_enabled()', 'pooling_development_enabled(text)',
  'pooling_governed_client_a34(text)', 'pooling_module_enabled(text,text)',
  'pooling_module_enabled_a34(text,text)', 'pooling_manifest_allowed(text,text)',
  'pooling_manifest_allowed_a34(text,text)']

async function fixture() {
  const pg = new PGlite()
  await pg.exec(`
    create role authenticated; create role anon; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon;
    create table clients(id text primary key,"coachId" uuid,"userId" uuid);
    create table pooling_runtime(singleton boolean,r1 boolean,r2 boolean,r3 boolean);
    create table pooling_development_coaches(coach_id uuid,enabled boolean);
    create table pooling_test_workspaces(client_id text,coach_id uuid,manifest_id text,
      revoked_at timestamptz,expires_at timestamptz);
    create table pooling_test_config(singleton boolean,enabled boolean,ends_at timestamptz,coach_ids uuid[]);
    create table pooling_manifests(id text,document jsonb);
    create table pooling_engineering_releases(client_id text,manifest_id text,revoked_at timestamptz);
    create table pooling_engineering_slots(coach_id uuid,revoked_at timestamptz,expires_at timestamptz);
    create table pooling_release_operators(actor_id uuid,revoked_at timestamptz,
      valid_until timestamptz,evidence_reference text);
    create table pooling_catalogue_submissions(id bigint generated always as identity,
      client_id text,actor_id uuid,operation_key text,document jsonb,digest text,note text);
    create table pooling_catalogue_events(id bigint,manifest_id text,action text,evidence_id text,reason text);
    insert into clients values ('owned','${coach}','${athlete}'),('other','${other}',null);
    insert into pooling_runtime values (true,false,false,false);
    insert into pooling_development_coaches values ('${coach}',false);
    insert into pooling_catalogue_events values (1,'unrelated-release','revoked','private-evidence','Fictional private audit note');
    alter table clients enable row level security;
    grant select on clients to authenticated;
  `)
  // SQL-language bodies refer to helpers created later in the captured list.
  await pg.exec('set check_function_bodies=off')
  await pg.exec(await readFile('tests/helpers/pooling-security-before.sql','utf8'))
  await pg.exec(`set check_function_bodies=on;
    revoke execute on all functions in schema public from public,anon;
    grant execute on all functions in schema public to authenticated;
    create policy athlete_read on clients to authenticated using (
      pooling_linked(id) and not pooling_governed_client(id));`)
  return pg
}
async function signIn(pg,id) {
  await pg.exec(`reset role; set request.jwt.claim.sub='${id}'; set role authenticated`)
}
async function applyPatch(pg) {
  await pg.exec('reset role')
  await pg.exec(await readFile('supabase/schema_pooling_security.sql','utf8'))
}
async function catalogue(pg) {
  return (await pg.query("select pooling_read_catalogue_admin('owned') as value")).rows[0].value
}

test('catalogue audit evidence cannot be obtained by submitting an unrelated manifest ID', async () => {
  const pg = await fixture()
  try {
    await signIn(pg,coach)
    await pg.query(`select pooling_submit_catalogue('owned','test-operation',
      '{"manifest":{"id":"unrelated-release"}}'::jsonb,'Fictional submission')`)
    const before = await catalogue(pg)
    assert.equal(before.canRelease,false)
    assert.equal(before.events[0].reason,'Fictional private audit note', 'reproduce current production function behavior')
    await applyPatch(pg)
    await applyPatch(pg) // Repeatable without broadening privileges.
    await signIn(pg,coach)
    const after = await catalogue(pg)
    assert.deepEqual(after.events,[])
    assert.equal(after.submissions.length,1)
    await signIn(pg,other)
    await assert.rejects(catalogue(pg),/forbidden/)
    await signIn(pg,athlete)
    await assert.rejects(catalogue(pg),/forbidden/)
    await signIn(pg,'')
    await assert.rejects(catalogue(pg),/forbidden/)
    await pg.exec('reset role; set role anon')
    await assert.rejects(catalogue(pg),/permission denied/)
    await pg.exec(`reset role; insert into pooling_release_operators values
      ('${coach}',null,now()+interval '1 day','Fictional operator authorization')`)
    await signIn(pg,coach)
    assert.equal((await catalogue(pg)).events.length,1)
    for (const change of ["revoked_at=now()", "revoked_at=null,valid_until=now()-interval '1 day'",
      "valid_until=now()+interval '1 day',evidence_reference=' '"]) {
      await pg.exec(`reset role; update pooling_release_operators set ${change}`)
      await signIn(pg,coach)
      assert.deepEqual((await catalogue(pg)).events,[])
    }
  } finally { await pg.close() }
})

test('private predicate grants preserve real nested SECURITY DEFINER calls and athlete RLS', async () => {
  const pg = await fixture()
  try {
    await applyPatch(pg)
    for (const signature of predicates) {
      const { rows } = await pg.query(`select has_function_privilege('anon',$1,'execute') as anon,
        has_function_privilege('authenticated',$1,'execute') as authenticated`,[signature])
      assert.deepEqual(rows[0],{anon:false,authenticated:false})
    }
    await signIn(pg,athlete)
    for (const call of ['pooling_enabled()',"pooling_development_enabled('owned')",
      "pooling_governed_client_a34('owned')","pooling_module_enabled('owned','r1')",
      "pooling_module_enabled_a34('owned','r1')","pooling_manifest_allowed('owned','x')",
      "pooling_manifest_allowed_a34('owned','x')"]) {
      await assert.rejects(pg.query(`select ${call}`),/permission denied/)
    }
    assert.deepEqual((await pg.query('select id from clients')).rows,[{id:'owned'}])
    await pg.exec('reset role; update pooling_development_coaches set enabled=true')
    await signIn(pg,athlete)
    assert.deepEqual((await pg.query('select id from clients')).rows,[])
    assert.equal((await pg.query("select pooling_governed_client('owned') as governed")).rows[0].governed,true)
  } finally { await pg.close() }
})
