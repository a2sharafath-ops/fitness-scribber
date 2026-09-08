// A32: exact fresh-backup preservation, two local passes, then hosted application.
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {connection,query,fingerprintSQL} from './hosted-backup.mjs'
import {localRuntime} from './hosted-local.mjs'
process.umask(0o077)
const [mode,input]=process.argv.slice(2),rt=localRuntime('.local-test-runtime/hosted-restore-Zc0Yjh/runtime.json')
const hash=v=>createHash('sha256').update(v).digest('hex'),q=v=>"'"+String(typeof v==='object'?JSON.stringify(v):v).replaceAll("'","''")+"'"
if(mode==='canonical'){
 const backup=resolve(input);assert(backup.startsWith(resolve('.recovery/hosted-test/baseline-')))
 const names=Object.keys(JSON.parse(readFileSync(join(backup,'row-fingerprints.json'),'utf8')))
 const tables=names.map(k=>{const[schema,table]=k.split('.');return{schema,table}})
 writeFileSync(join(backup,'row-fingerprints-canonical.json'),query(rt.bin,connection(),fingerprintSQL(tables,true))+'\n',{mode:0o600,flag:'wx'})
 console.log(JSON.stringify({canonical:true,tables:tables.length}));process.exit(0)
}
assert(['rehearse','apply'].includes(mode))
const restoreFile=resolve(input);assert(restoreFile.startsWith(rt.directory+'/restore-result-'))
const r=JSON.parse(readFileSync(restoreFile,'utf8'));assert(r.passed&&r.portableFingerprints)
assert.equal(hash(readFileSync(join(r.backup,'database-full.dump'))),r.dumpSha256)
const expected=JSON.parse(readFileSync(join(r.backup,existsSync(join(r.backup,'row-fingerprints-canonical.json'))?'row-fingerprints-canonical.json':'row-fingerprints.json'),'utf8'))
const tables=Object.keys(expected).filter(n=>n!=='public.pooling_migration_ledger').map(k=>{const[schema,table]=k.split('.');return{schema,table}})
delete expected['public.pooling_migration_ledger']
const name='schema_pooling_verification.sql',migration=readFileSync('supabase/'+name,'utf8'),sha256=hash(migration),rowsSQL=fingerprintSQL(tables,true)
const guards=`do $g$begin if (${rowsSQL})<>${q(expected)}::jsonb then raise exception 'baseline_changed';end if;
 if exists(select 1 from public.pooling_runtime where r1 or r2 or r3) then raise exception 'global_flags_changed';end if;
 if exists(select 1 from public.pooling_migration_ledger where name=${q(name)} and sha256<>${q(sha256)}) then raise exception 'checksum_conflict';end if;end $g$;`
const script=`set role postgres;set timezone='UTC';begin isolation level repeatable read;set local lock_timeout='10s';set local statement_timeout='30s';select pg_advisory_xact_lock(6090832);
lock table ${tables.filter(t=>t.schema==='public').map(t=>'public."'+t.table+'"').join(',')},public.pooling_migration_ledger in share mode;
${guards}\n${migration.replace(/^begin;$/m,'').replace(/^commit;$/m,'')}\n${guards}
insert into public.pooling_migration_ledger(name,sha256,backup_sha256) values(${q(name)},${q(sha256)},${q(r.dumpSha256)}) on conflict(name) do nothing;notify pgrst,'reload schema';commit;`
const transactionSha256=hash(script),file=join(r.backup,'a32-transaction.sql'),localResult=join(r.backup,'a32-rehearsal.json')
writeFileSync(file,script,{mode:0o600})
let env,database
if(mode==='rehearse'){database='fitness_hosted_migration_'+Date.now();rt.run('createdb',['--template',r.database,'--owner','postgres',database]);env={...rt.env,PGDATABASE:database}}
else{const proof=JSON.parse(readFileSync(localResult,'utf8'));assert(proof.passed&&proof.passes===2);assert.equal(proof.transactionSha256,transactionSha256);env=connection()}
for(let pass=1;pass<=(mode==='rehearse'?2:1);pass++){
 assert.deepEqual(JSON.parse(query(rt.bin,env,rowsSQL)),expected)
 const run=spawnSync(join(rt.bin,'psql'),['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f',file],{env:{...env,PGOPTIONS:'-c default_transaction_read_only=off'},encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024})
 writeFileSync(join(r.backup,`a32-${mode}-${pass}.private.log`),(run.stdout||'')+'\n'+(run.stderr||''),{mode:0o600})
 assert.equal(run.status,0,'migration failed or unknown; inspect private log and ledger before retry')
 assert.deepEqual(JSON.parse(query(rt.bin,env,rowsSQL)),expected)
 console.log(JSON.stringify({pass,mode,baselinePreserved:true}))
}
const result={passed:true,passes:mode==='rehearse'?2:1,mode,restoreFile,database,backup:r.backup,backupSha256:r.dumpSha256,sha256,transactionSha256,tables:tables.length,at:new Date().toISOString()}
writeFileSync(mode==='rehearse'?localResult:join(r.backup,'a32-hosted-migration.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify(result))
