// Creates fresh named synthetic databases; never drops existing databases.
import {execFileSync} from 'node:child_process'
import {mkdtempSync,readFileSync,statfsSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {runtime} from './native-connection.mjs'
const stat=statfsSync(resolve('.local-test-runtime'))
if(stat.bavail*stat.bsize<1.25*1024**3)throw Error('Keep the approved 1 GiB guard plus room for the bounded synthetic rehearsal; no cleanup authorized')
const serial=Date.now(),source=`fitness_pooling_rehearsal_${serial}`,restored=`fitness_pooling_restored_${serial}`
const dir=mkdtempSync(resolve('.local-test-runtime/recovery-')),dump=join(dir,'synthetic-post-build.dump')
const connect=['-h',runtime.socket,'-p','55439']
function run(command,args){return execFileSync(join(runtime.bin,command),args,{env:runtime.env,encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim()}
function query(db,sql){return run('psql',['-X','-q','-A','-t',...connect,'-d',db,'-v','ON_ERROR_STOP=1','-c',sql])}
function file(db,path){run('psql',['-X','-q',...connect,'-d',db,'-v','ON_ERROR_STOP=1','-f',path])}
run('createdb',[...connect,source])
for(const path of ['tests/pooling/native-bootstrap.sql','supabase/schema.sql','supabase/schema_athlete.sql','supabase/schema_workouts.sql','supabase/schema_screenings.sql','supabase/schema_assessments.sql','supabase/schema_program.sql','tests/pooling/native-fixtures.sql'])file(source,path)
const schemas=['schema_pooling.sql','schema_pooling_authority.sql','schema_pooling_decision_gateway.sql','schema_pooling_sources.sql','schema_pooling_projections.sql','schema_pooling_legacy_boundary.sql','schema_pooling_batches.sql','schema_pooling_review.sql','schema_pooling_extensions.sql','schema_pooling_extension_gateway.sql','schema_pooling_catalogue.sql','schema_pooling_client_home.sql','schema_pooling_governance.sql','schema_pooling_context_review.sql','schema_pooling_weekly.sql','schema_pooling_suggestions.sql','schema_pooling_reassessment.sql','schema_pooling_catalogue_admin.sql']
for(const name of schemas)file(source,`supabase/${name}`)
for(const name of ['database.sql','authority.sql','gateway.sql','sources.sql','legacy-boundary.sql'])file(source,`tests/pooling/${name}`)
const testEnv={...runtime.env,FITNESS_POOLING_PG_DATABASE:source}
for(const path of ['native-flow.mjs','native-extensions.mjs','native-concurrency.mjs','native-catalogue.mjs','native-runner.mjs','native-context.mjs','native-weekly.mjs','native-progression.mjs','native-suggestions.mjs','native-reassessment.mjs','native-catalogue-admin.mjs']){
 try{const output=execFileSync(process.execPath,[`tests/pooling/${path}`],{env:testEnv,encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});console.log(output.trim())}
 catch(error){console.error(JSON.stringify({failedTest:path,database:source}));console.error(error.stderr?.toString().slice(0,5000));throw error}
}
// Stable relational fingerprint includes all old and new public table rows.
const fingerprintSQL=`do $$declare t record; v text;begin
 create temporary table row_fingerprints(name text,value text);
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
 execute format('select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text from public.%I x',t.tablename) into v;
 insert into row_fingerprints values(t.tablename,encode(sha256(convert_to(v,'UTF8')),'hex'));
 end loop;end $$;select jsonb_object_agg(name,value order by name) from row_fingerprints;`
const before=query(source,fingerprintSQL)
run('pg_dump',[...connect,'-d',source,'-Fc','-f',dump])
const hash=createHash('sha256').update(readFileSync(dump)).digest('hex')
run('createdb',[...connect,restored])
run('pg_restore',[...connect,'-d',restored,'--exit-on-error',dump])
assert.equal(query(restored,fingerprintSQL),before,'every legacy and pooling row survived restore')
const actuals=query(restored,"select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') from public.pooling_execution_events e")
query(restored,'update public.pooling_runtime set r1=false,r2=false,r3=false where singleton')
query(restored,`begin;set local role authenticated;set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';do $$begin if not exists(select 1 from public.clients where id='recovery-client-a') then raise exception 'Classic client read not restored';end if;end $$;commit;`)
assert.equal(query(restored,"select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') from public.pooling_execution_events e"),actuals,'turning pooling off preserved every actual/event')
console.log(JSON.stringify({test:'fresh additive core schemas, native authority suite, backup/restore and Classic feature-off read',passed:true,source,restored,dump,sha256:hash,limits:'Synthetic core relational schemas only; not hosted auth/storage or a live restore certificate'}))
