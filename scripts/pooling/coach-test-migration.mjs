// A31 only: same checksummed additive transaction, first twice locally then
// once on the exact approved hosted target. No enrollment/config activation.
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {connection,query,fingerprintSQL,projectRef} from './hosted-backup.mjs'
import {localRuntime} from './hosted-local.mjs'
process.umask(0o077)
const localOnly=process.argv[2]==='rehearse'
if(!localOnly&&process.argv[2]!=='apply')throw Error('use_rehearse_or_apply')
const restoreFile=resolve('.local-test-runtime/hosted-restore-Zc0Yjh/coach-test-restore-result.json')
const restore=JSON.parse(readFileSync(restoreFile,'utf8')),rt=localRuntime(restore.runtimeFile)
assert.equal(restore.passed,true);assert.equal(restore.portableFingerprints,true);assert.equal(restore.projectRef,projectRef)
const hash=text=>createHash('sha256').update(text).digest('hex')
assert.equal(hash(readFileSync(join(restore.backup,'database-full.dump'))),restore.dumpSha256)
const expected=JSON.parse(readFileSync(join(restore.backup,restore.fingerprintFile),'utf8'))
const tables=Object.keys(expected).map(k=>{const [schema,table]=k.split('.');return {schema,table}}).filter(t=>t.table!=='pooling_migration_ledger')
const existingExpected=Object.fromEntries(Object.entries(expected).filter(([k])=>k!=='public.pooling_migration_ledger'))
const name='schema_pooling_coach_test.sql',migration=readFileSync('supabase/'+name,'utf8'),sha256=hash(migration)
assert.equal((migration.match(/^begin;$/gm)||[]).length,1);assert.equal((migration.match(/^commit;$/gm)||[]).length,1)
const q=v=>"'"+String(typeof v==='object'?JSON.stringify(v):v).replaceAll("'","''")+"'"
const ledgerSQL=`select coalesce(jsonb_agg(to_jsonb(l) order by name collate "C"),'[]') from public.pooling_migration_ledger l where name<>${q(name)}`
const expectedLedger=JSON.parse(rt.sql(restore.database,ledgerSQL))
assert.equal(expectedLedger.length,18)
const rowsSQL=fingerprintSQL(tables,true)
const guard=`do $guard$begin
 if (${rowsSQL})<>${q(existingExpected)}::jsonb then raise exception 'baseline_changed';end if;
 if (${ledgerSQL})<>${q(expectedLedger)}::jsonb then raise exception 'migration_history_changed';end if;
 if exists(select 1 from public.pooling_migration_ledger where name=${q(name)} and (sha256<>${q(sha256)} or backup_sha256<>${q(restore.dumpSha256)})) then raise exception 'migration_checksum_conflict';end if;
 if exists(select 1 from public.pooling_runtime where r1 or r2 or r3) then raise exception 'global_flags_changed';end if;
end $guard$;`
const script=`set role postgres;set timezone='UTC';
begin isolation level repeatable read;
set local lock_timeout='10s';set local statement_timeout='30s';
select pg_advisory_xact_lock(6090831);
lock table ${tables.filter(t=>t.schema==='public').map(t=>'public."'+t.table+'"').join(',')},public.pooling_migration_ledger in share mode;
${guard}
${migration.replace(/^begin;$/m,'').replace(/^commit;$/m,'')}
${guard}
insert into public.pooling_migration_ledger(name,sha256,backup_sha256) values(${q(name)},${q(sha256)},${q(restore.dumpSha256)}) on conflict(name) do nothing;
commit;`
const transactionSha256=hash(script),file=join(restore.backup,'a31-approved-transaction-'+transactionSha256+'.sql')
writeFileSync(file,script,{mode:0o600})
let env,database
if(localOnly){
 database='fitness_hosted_migration_'+Date.now();rt.run('createdb',['--template',restore.database,'--owner','postgres',database])
 rt.sql(database,"create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') execute function public.rls_auto_enable()")
 env={...rt.env,PGDATABASE:database,PGOPTIONS:'-c default_transaction_read_only=on'}
}else{
 const prior=JSON.parse(readFileSync(join(restore.backup,'a31-local-migration-result.json'),'utf8'))
 assert.equal(prior.passed,true);assert.equal(prior.transactionSha256,transactionSha256);assert.equal(prior.nativeChecks.length,12)
 env=connection()
}
assert.deepEqual(JSON.parse(query(rt.bin,env,rowsSQL)),existingExpected)
assert.deepEqual(JSON.parse(query(rt.bin,env,ledgerSQL)),expectedLedger)
for(let pass=1;pass<=(localOnly?2:1);pass++){
 const r=spawnSync(join(rt.bin,'psql'),['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f',file],{env:{...env,PGOPTIONS:'-c default_transaction_read_only=off -c statement_timeout=30000'},encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024})
 const diagnostic=join(restore.backup,'a31-'+(localOnly?'local':'hosted')+'-migration-'+Date.now()+'.private.log')
 writeFileSync(diagnostic,(r.stdout||'')+'\n'+(r.stderr||''),{mode:0o600,flag:'wx'})
 if(r.status!==0)throw Error('migration_failed_or_unknown_check_ledger: '+diagnostic)
 assert.deepEqual(JSON.parse(query(rt.bin,env,rowsSQL)),existingExpected)
 assert.deepEqual(JSON.parse(query(rt.bin,env,ledgerSQL)),expectedLedger)
 console.log(JSON.stringify({localOnly,pass,baselinePreserved:true,globalFlagsOff:true}))
}
let nativeChecks
if(localOnly){
 const test=spawnSync(process.execPath,['tests/pooling/native-coach-test.mjs'],{env:{...process.env,FITNESS_POOLING_RESTORED_RUNTIME:restore.runtimeFile,FITNESS_POOLING_PG_DATABASE:database},encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024})
 process.stdout.write(test.stdout||'');process.stderr.write(test.stderr||'');assert.equal(test.status,0)
 nativeChecks=JSON.parse(test.stdout.trim().split('\n').at(-1)).checks
}
const result={passed:true,localOnly,projectRef,backup:restore.backup,backupSha256:restore.dumpSha256,database,sha256,transactionSha256,baselineTables:83,oldMigrationsPreserved:18,nativeChecks,globalFlagsOff:true,recordedAt:new Date().toISOString()}
const output=join(restore.backup,localOnly?'a31-local-migration-result.json':'a31-hosted-migration-result.json')
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'})
console.log(JSON.stringify({...result,resultFile:output}))
