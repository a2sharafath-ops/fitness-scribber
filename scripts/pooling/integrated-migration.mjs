import {readFileSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {localRuntime} from './hosted-local.mjs'
import {connection,query,fingerprintSQL,projectRef} from './hosted-backup.mjs'
import {developmentRelease} from './development-release.mjs'
process.umask(0o077)
const [mode,restorePath]=process.argv.slice(2)
assert(['rehearse','apply'].includes(mode))
const restoreFile=resolve(restorePath||'');assert(restoreFile.startsWith(resolve('.local-test-runtime/hosted-restore-')+'/')||restoreFile.startsWith(resolve('.local-test-runtime/hosted-restore-')))
const restore=JSON.parse(readFileSync(restoreFile)),rt=localRuntime(restore.runtimeFile)
assert(restore.passed&&restore.allRowFingerprintsMatch&&restore.projectRef===projectRef)
const hash=v=>createHash('sha256').update(v).digest('hex'),name='schema_pooling_integrated.sql',migration=readFileSync('supabase/'+name,'utf8'),release=developmentRelease()
const sha256=hash(migration+JSON.stringify(release)),q=v=>"'"+String(typeof v==='object'?JSON.stringify(v):v).replaceAll("'","''")+"'"
const reportPath=join(restore.backup,'a35-'+(mode==='rehearse'?'local':'hosted')+'-migration.json')
const coaches=['aca78a32-d373-4959-a0f3-d020fc15188d','471c6b81-8b95-4c12-b885-fdc3e65eec99']
let database,run
if(mode==='rehearse') {
 database='fitness_hosted_migration_'+Date.now();rt.run('createdb',['--template',restore.database,'--owner','postgres',database])
 run=sql=>rt.sql(database,'set role postgres;'+sql)
} else {
 const rehearsal=JSON.parse(readFileSync(join(restore.backup,'a35-local-migration.json')))
 assert(rehearsal.passed&&rehearsal.sha256===sha256&&rehearsal.nativePassed,'exact rehearsal and native tests required')
 const env={...connection(),PGOPTIONS:'-c default_transaction_read_only=off -c statement_timeout=45000 -c lock_timeout=10000'}
 run=sql=>query(rt.bin,env,sql)
}
const tables=JSON.parse(run("select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename) order by tablename) from pg_tables where schemaname='public' and tablename not in ('pooling_migration_ledger','pooling_manifests','pooling_development_coaches','pooling_development_operations')"))
const rows=JSON.parse(run(fingerprintSQL(tables,true))),oldManifests=JSON.parse(run("select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.pooling_manifests m where id<>'fitness-scribber-development-v1'"))
const prior=JSON.parse(run(`select coalesce((select to_jsonb(l) from public.pooling_migration_ledger l where name=${q(name)}),'null')`))
if(prior)assert.equal(prior.sha256,sha256,'do not modify an applied migration')
else {
 const sql=`begin;select pg_advisory_xact_lock(6090935);
 do $guard$ begin
 if exists(select 1 from public.pooling_runtime where r1 or r2 or r3) then raise exception 'global_flags_changed';end if;
 if (select count(*) from public.profiles where id=any(array[${coaches.map(q).join(',')}]::uuid[]) and role='coach')<>2 then raise exception 'tester_identity_changed';end if;
 if exists(select 1 from public.pooling_migration_ledger where name=${q(name)}) then raise exception 'concurrent_migration';end if;
 end $guard$;
 ${migration.replace(/^begin;$/m,'').replace(/^commit;$/m,'')}
 insert into public.pooling_manifests(id,state,document) values(${q(release.manifest.id)},'published',${q(release)});
 insert into public.pooling_development_coaches(coach_id,authorization_reference) select v::uuid,${q('Owner approval, 2026-09-09: existing and new development clients; no production release')} from unnest(array[${coaches.map(q).join(',')}]) v;
 insert into public.pooling_migration_ledger(name,sha256,backup_sha256) values(${q(name)},${q(sha256)},${q(restore.dumpSha256)});
 commit;`
 writeFileSync(join(restore.backup,'a35-transaction.sql'),sql,{mode:0o600})
 run(sql)
}
assert.deepEqual(JSON.parse(run(fingerprintSQL(tables,true))),rows,'existing public records changed')
assert.deepEqual(JSON.parse(run("select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.pooling_manifests m where id<>'fitness-scribber-development-v1'")),oldManifests)
const flags=JSON.parse(run('select to_jsonb(r) from public.pooling_runtime r'));assert(!flags.r1&&!flags.r2&&!flags.r3)
const result={passed:true,mode,projectRef,database,runtimeFile:restore.runtimeFile,restoreFile,backup:restore.backup,sha256,backupSha256:restore.dumpSha256,existingTablesPreserved:tables.length,oldManifestsPreserved:true,globalFlagsOff:true,coaches,nativePassed:false,recordedAt:new Date().toISOString()}
writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({...result,reportPath}))
