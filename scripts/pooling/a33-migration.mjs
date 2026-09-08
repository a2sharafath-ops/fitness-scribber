// Exact A33 backup, immutable row guard, two local passes before hosted DDL.
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {connection,query,fingerprintSQL} from './hosted-backup.mjs'
import {localRuntime} from './hosted-local.mjs'
process.umask(0o077)
const [mode,input,variant='slots']=process.argv.slice(2);assert(['rehearse','apply'].includes(mode));assert(['slots','release'].includes(variant))
const rt=localRuntime('.local-test-runtime/hosted-restore-Zc0Yjh/runtime.json'),restoreFile=resolve(input)
assert(restoreFile.startsWith(rt.directory+'/restore-result-'))
const r=JSON.parse(readFileSync(restoreFile,'utf8'));assert(r.passed&&r.portableFingerprints)
const hash=v=>createHash('sha256').update(v).digest('hex'),q=v=>"'"+String(typeof v==='object'?JSON.stringify(v):v).replaceAll("'","''")+"'"
assert.equal(hash(readFileSync(join(r.backup,'database-full.dump'))),r.dumpSha256)
const expected=JSON.parse(readFileSync(join(r.backup,'row-fingerprints.json'),'utf8'))
// New ledger entry is expected; every pre-existing entry is checked separately.
delete expected['public.pooling_migration_ledger']
const tables=Object.keys(expected).map(k=>{const[schema,table]=k.split('.');return{schema,table}})
const name=variant==='slots'?'schema_pooling_a33_test_slots.sql':'schema_pooling_a33_fixture_release.sql',migration=readFileSync('supabase/'+name,'utf8'),sha256=hash(migration),rowsSQL=fingerprintSQL(tables,true)
const guards=`do $g$begin if (${rowsSQL})<>${q(expected)}::jsonb then raise exception 'baseline_changed';end if;
 if exists(select 1 from public.pooling_runtime where r1 or r2 or r3) then raise exception 'global_flags_changed';end if;
 if not exists(select 1 from public.pooling_test_config where enabled and ends_at='2026-09-15T10:37:56.492Z' and cardinality(coach_ids)=${variant==='slots'?2:4}) then raise exception 'window_changed';end if;
 if (select count(*) from public.pooling_test_workspaces)<>${variant==='slots'?4:7} then raise exception 'reservations_changed';end if;
 if exists(select 1 from public.pooling_migration_ledger where name=${q(name)} and sha256<>${q(sha256)}) then raise exception 'checksum_conflict';end if;end $g$;`
const script=`set role postgres;set timezone='UTC';begin isolation level repeatable read;set local lock_timeout='10s';set local statement_timeout='30s';select pg_advisory_xact_lock(6090833);
lock table ${tables.filter(t=>t.schema==='public').map(t=>'public."'+t.table+'"').join(',')},public.pooling_migration_ledger in share mode;
${guards}\n${migration.replace(/^begin;$/m,'').replace(/^commit;$/m,'')}\n${guards}
insert into public.pooling_migration_ledger(name,sha256,backup_sha256) values(${q(name)},${q(sha256)},${q(r.dumpSha256)}) on conflict(name) do nothing;notify pgrst,'reload schema';commit;`
const transactionSha256=hash(script),file=join(r.backup,'a33-transaction.sql'),localResult=join(r.backup,'a33-rehearsal.json')
writeFileSync(file,script,{mode:0o600})
let env,database
if(mode==='rehearse'){database='fitness_hosted_migration_'+Date.now();rt.run('createdb',['--template',r.database,'--owner','postgres',database]);env={...rt.env,PGDATABASE:database}}
else{const proof=JSON.parse(readFileSync(localResult,'utf8'));assert(proof.passed&&proof.passes===2&&proof.slotTests);assert.equal(proof.transactionSha256,transactionSha256);env=connection()}
for(let pass=1;pass<=(mode==='rehearse'?2:1);pass++){
 assert.deepEqual(JSON.parse(query(rt.bin,env,rowsSQL)),expected)
 const result=spawnSync(join(rt.bin,'psql'),['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f',file],{env:{...env,PGOPTIONS:'-c default_transaction_read_only=off'},encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024})
 writeFileSync(join(r.backup,`a33-${mode}-${pass}.private.log`),(result.stdout||'')+'\n'+(result.stderr||''),{mode:0o600})
 assert.equal(result.status,0,'migration failed or unknown; inspect private log and ledger before retry')
 assert.deepEqual(JSON.parse(query(rt.bin,env,rowsSQL)),expected)
 if(mode==='rehearse')rt.sql(database,readFileSync(`tests/pooling/a33-${variant}.sql`,'utf8'))
 console.log(JSON.stringify({pass,mode,baselinePreserved:true,slotTests:mode==='rehearse'}))
}
const result={passed:true,passes:mode==='rehearse'?2:1,slotTests:mode==='rehearse',mode,variant,restoreFile,database,backup:r.backup,backupSha256:r.dumpSha256,sha256,transactionSha256,tables:tables.length,at:new Date().toISOString()}
writeFileSync(mode==='rehearse'?localResult:join(r.backup,'a33-hosted-migration.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify(result))
