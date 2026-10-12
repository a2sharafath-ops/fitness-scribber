import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('function permissions reject anonymous callers and preserve signed-in onboarding and RLS', async () => {
  const pg = new PGlite()
  try {
    await pg.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      create function auth.email() returns text language sql stable as $$ select current_setting('request.jwt.claim.email', true) $$;
      grant usage on schema auth, public to anon, authenticated;
      create table profiles(id uuid primary key,role text);
      create table coach_invites(email text, "redeemedAt" timestamptz);
      create table clients(id text,"userId" uuid,"inviteCode" text);
      create function rls_auto_enable() returns event_trigger language plpgsql security definer as $$ begin return; end $$;`)
    for (const [file, names] of [['supabase/schema_admin.sql',['is_admin','become_coach']],['supabase/schema_athlete.sql',['redeem_invite']]]) {
      const source = await readFile(file,'utf8')
      for (const name of names) {
        const start = source.indexOf(`create or replace function ${name}(`)
        assert.ok(start >= 0)
        await pg.exec(source.slice(start, source.indexOf('$$;',start)+3))
      }
    }
    const sql = await readFile('supabase/schema_function_permissions.sql','utf8')
    await pg.exec(sql); await pg.exec(sql)
    for (const name of ['become_coach()','redeem_invite(text)','is_admin()','rls_auto_enable()']) {
      const { rows } = await pg.query(`select has_function_privilege('anon',$1,'execute') as anon,has_function_privilege('authenticated',$1,'execute') as signed_in`,[name])
      assert.equal(rows[0].anon,false)
      assert.equal(rows[0].signed_in,name !== 'rls_auto_enable()')
    }
    await pg.exec('set role anon')
    for (const call of ['is_admin()', 'become_coach()', "redeem_invite('code')"]) await assert.rejects(pg.query(`select ${call}`), /permission denied/)
    await pg.exec(`reset role; insert into coach_invites values ('coach@test.invalid',null);
      insert into clients values ('athlete',null,'invite');
      set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; set request.jwt.claim.email='coach@test.invalid';`)
    assert.equal((await pg.query('select become_coach() as result')).rows[0].result,'ok')
    assert.equal((await pg.query('select is_admin() as result')).rows[0].result,false)
    await pg.exec("set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'")
    assert.equal((await pg.query("select redeem_invite('invite') as result")).rows[0].result,'athlete')
    assert.equal((await pg.query("select redeem_invite('invite') as result")).rows[0].result,'invalid')
  } finally { await pg.close() }
})
