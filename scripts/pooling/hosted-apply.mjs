// A30 exact-target additive migration. Requires verified private recovery and
// two-pass rehearsal, and refuses a changed baseline before any hosted DDL.
import {readFileSync,writeFileSync,statSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {connection,query,fingerprintSQL,projectRef} from './hosted-backup.mjs'
import {migrationPlan} from './hosted-migration-plan.mjs'
import {localRuntime} from './hosted-local.mjs'
process.umask(0o077)
const file=resolve(process.argv[2]||'')
if(!file.startsWith(resolve('.local-test-runtime/hosted-restore-')))throw Error('private_rehearsal_required')
const rehearsal=JSON.parse(readFileSync(file,'utf8')),restore=JSON.parse(readFileSync(rehearsal.restoreResult,'utf8'))
const suite=JSON.parse(readFileSync(join(resolve(rehearsal.runtimeFile,'..'),'local-suite-'+rehearsal.database+'.json'),'utf8'))
assert.equal(rehearsal.passed,true);assert.equal(restore.passed,true);assert.equal(suite.passed,true);assert.equal(suite.checks.length,16)
const manifest=JSON.parse(readFileSync(join(restore.backup,'manifest.json'),'utf8'))
assert.equal(manifest.projectRef,projectRef)
assert.equal(createHash('sha256').update(readFileSync(join(restore.backup,'database-full.dump'))).digest('hex'),restore.dumpSha256)
assert.equal(statSync(join(restore.backup,'auth-settings-no-secrets.json')).size>0,true)
assert.equal(statSync(join(restore.backup,'function-source/supabase/functions/admin-users/index.ts')).size>0,true)
assert.equal(JSON.parse(readFileSync(join(restore.backup,'metadata.json'),'utf8')).storageObjects,0)
const plan=migrationPlan();assert.deepEqual(plan.map(({name,sha256})=>({name,sha256})),rehearsal.migrations)
const expected=JSON.parse(readFileSync(join(restore.backup,'row-fingerprints.json'),'utf8'))
const tables=Object.keys(expected).map(k=>{const [schema,table]=k.split('.');return {schema,table}})
const bin=resolve(process.env.FITNESS_HOSTED_PG_BIN||'')
assert.equal(bin,JSON.parse(readFileSync(restore.runtimeFile,'utf8')).bin)
const localOnly=process.argv[3]==='rehearse'
let env
if(localOnly){
 const rt=localRuntime(restore.runtimeFile),database='fitness_hosted_migration_'+Date.now()
 rt.run('createdb',['--template',restore.database,'--owner','postgres',database])
 rt.sql(database,"create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') execute function public.rls_auto_enable()")
 env={...rt.env,PGDATABASE:database,PGOPTIONS:'-c default_transaction_read_only=on'}
}else env=connection()
const current=JSON.parse(query(bin,env,fingerprintSQL(tables)))
const mismatches=Object.keys(expected).filter(k=>JSON.stringify(current[k])!==JSON.stringify(expected[k]))
if(mismatches.length)throw Error('baseline_changed_do_not_apply: '+mismatches.join(', '))
assert.equal(query(bin,env,"select count(*) from pg_tables where schemaname='public' and tablename like 'pooling_%'"),'0','only initial exact-target deployment supported')
const quote=v=>"'"+v.replaceAll("'","''")+"'"
const body=plan.map(item=>{
 assert.equal((item.sql.match(/^begin;\s*$/gmi)||[]).length,1)
 assert.equal((item.sql.match(/^commit;\s*$/gmi)||[]).length,1)
 return item.sql.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'')+`\ninsert into public.pooling_migration_ledger(name,sha256,backup_sha256) values(${quote(item.name)},${quote(item.sha256)},${quote(restore.dumpSha256)});`
}).join('\n')
const script=`set role postgres; set timezone='UTC';
begin isolation level repeatable read;
set local lock_timeout='10s'; set local statement_timeout='30s';
select pg_advisory_xact_lock(609082030);
lock table ${tables.filter(t=>t.schema==='public').map(t=>'public."'+t.table+'"').join(',')} in share mode;
create temporary table baseline_fingerprints as ${fingerprintSQL(tables)};
do $guard$begin if (select * from baseline_fingerprints) <> ${quote(JSON.stringify(expected))}::jsonb then raise exception 'baseline_changed';end if;end $guard$;
create table public.pooling_migration_ledger(name text primary key,sha256 text not null,backup_sha256 text not null,applied_at timestamptz not null default now());
alter table public.pooling_migration_ledger enable row level security;
revoke all on public.pooling_migration_ledger from public,anon,authenticated;
${body}
do $guard$begin if (${fingerprintSQL(tables)}) <> (select * from baseline_fingerprints) then raise exception 'baseline_changed';end if;
if exists(select 1 from public.pooling_runtime where r1 or r2 or r3) then raise exception 'flags_must_remain_off';end if;end $guard$;
notify pgrst, 'reload schema';
commit;
select jsonb_build_object('migrations',(select count(*) from public.pooling_migration_ledger),'runtime',(select to_jsonb(r) from public.pooling_runtime r));`
const transactionSha256=createHash('sha256').update(script).digest('hex')
if(!localOnly)assert.equal(JSON.parse(readFileSync(join(restore.backup,'local-transaction-rehearsal.json'),'utf8')).transactionSha256,transactionSha256,'rehearse the exact transaction first')
const sqlFile=join(restore.backup,'approved-additive-'+Date.now()+'.sql');writeFileSync(sqlFile,script,{mode:0o600,flag:'wx'})
const writable={...env,PGOPTIONS:'-c default_transaction_read_only=off -c statement_timeout=30000'}
const r=spawnSync(join(bin,'psql'),['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f',sqlFile],{env:writable,encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024})
const diagnostic=join(restore.backup,'migration-output-'+Date.now()+'.private.txt');writeFileSync(diagnostic,(r.stdout||'')+'\n'+(r.stderr||''),{mode:0o600,flag:'wx'})
if(r.status!==0)throw Error('migration_failed_or_outcome_unknown_check_ledger: '+diagnostic)
const after=JSON.parse(query(bin,env,fingerprintSQL(tables)))
assert.deepEqual(after,expected,'post-commit baseline changed; containment required')
const ledger=JSON.parse(query(bin,env,'select jsonb_agg(jsonb_build_object(\'name\',name,\'sha256\',sha256) order by name) from public.pooling_migration_ledger'))
assert.deepEqual(Object.fromEntries(ledger.map(({name,sha256})=>[name,sha256])),Object.fromEntries(plan.map(({name,sha256})=>[name,sha256])))
const result={passed:true,localOnly,transactionSha256,projectRef,backup:restore.backup,backupSha256:restore.dumpSha256,migrations:ledger,baselineTablesPreserved:tables.length,flagsOff:true,recordedAt:new Date().toISOString()}
const reportFile=join(restore.backup,localOnly?'local-transaction-rehearsal.json':'hosted-migration-result.json');writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});console.log(JSON.stringify({reportFile,...result}))
