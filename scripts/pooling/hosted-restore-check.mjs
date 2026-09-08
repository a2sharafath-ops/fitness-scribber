// Rehearse the exported application/auth/storage database on a fresh local DB.
// Managed Supabase services/vault are not recreated by this native restore.
import {readFileSync,writeFileSync,statSync,statfsSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {fingerprintSQL} from './hosted-backup.mjs'
process.umask(0o077)
const backup=resolve(process.argv[2]||''),runtimeFile=resolve(process.argv[3]||'')
if(!backup.startsWith(resolve('.recovery/hosted-test/baseline-')) || !runtimeFile.startsWith(resolve('.local-test-runtime/hosted-restore-')))throw Error('exact_task_owned_paths_required')
const manifest=JSON.parse(readFileSync(join(backup,'manifest.json'),'utf8'))
const rt=JSON.parse(readFileSync(runtimeFile,'utf8'))
assert.equal(manifest.projectRef,'haxxetirrcrwzwdzsdui')
assert.equal(rt.port,55440);assert.equal(rt.user,'fitness_recovery_admin')
assert.match(rt.socket,/^\/private\/tmp\/fitness-hosted-pg-[A-Za-z0-9]+$/)
assert.equal(rt.bin,resolve('.local-test-runtime/pg17.YbRhJl/mounted/Postgres.app/Contents/Versions/17/bin'))
assert.equal(rt.passfile,join(rt.directory,'password.local'))
assert.equal(statSync(rt.directory).mode&0o077,0)
const fs=statfsSync(rt.directory);assert(fs.bavail*fs.bsize>1.25*1024**3,'retain 1 GiB guard plus bounded restore headroom')
const dump=join(backup,'database-full.dump')
assert.equal(createHash('sha256').update(readFileSync(dump)).digest('hex'),manifest.dumpSha256)
const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('PG'))),PGHOST:rt.socket,PGPORT:String(rt.port),PGUSER:rt.user,PGPASSWORD:readFileSync(rt.passfile,'utf8').trim()}
function run(cmd,args){
 const r=spawnSync(join(rt.bin,cmd),args,{env,encoding:'utf8',timeout:45000,maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']})
 if(r.status!==0){const file=join(rt.directory,`${cmd}-restore-error-${Date.now()}.private.txt`);writeFileSync(file,r.stderr||'',{mode:0o600,flag:'wx'});throw Error('local_'+cmd+'_failed; private diagnostic: '+file)}
 return r.stdout.trim()
}
function sql(database,query){return run('psql',['-X','-q','-A','-t','-d',database,'-v','ON_ERROR_STOP=1','-c',"set timezone='UTC'; "+query])}
const q=v=>'"'+v.replaceAll('"','""')+'"'
const roles=JSON.parse(readFileSync(join(backup,'roles-without-passwords.json'),'utf8'))
const current=JSON.parse(sql('postgres','select jsonb_agg(rolname) from pg_roles'))
for(const r of roles){
 if(current.includes(r.rolname)||r.rolname.startsWith('pg_'))continue
 sql('postgres',`create role ${q(r.rolname)} nologin ${r.rolsuper?'superuser':'nosuperuser'} ${r.rolinherit?'inherit':'noinherit'} ${r.rolbypassrls?'bypassrls':'nobypassrls'} ${r.rolcreaterole?'createrole':'nocreaterole'} ${r.rolcreatedb?'createdb':'nocreatedb'}`)
}
const metadata=JSON.parse(readFileSync(join(backup,'metadata.json'),'utf8'))
for(const r of metadata.roles)sql('postgres',`grant ${q(r.role)} to ${q(r.member)}${r.admin?' with admin option':''}`)
const database='fitness_hosted_restore_'+Date.now()
run('createdb',[database])
sql(database,`alter database ${q(database)} owner to postgres; create schema extensions authorization postgres; create extension "uuid-ossp" with schema extensions; create extension pgcrypto with schema extensions;`)
// pg_restore --schema selects objects *inside* a namespace, but not the
// namespace entries (their archive namespace is "-") or their schema ACLs.
const prelude=readFileSync(join(backup,'archive.list'),'utf8').split('\n').filter(line=>
 /; \d+ \d+ SCHEMA - (auth|storage) /.test(line) ||
 /; \d+ \d+ ACL - SCHEMA (public|auth|storage|extensions) /.test(line)
).join('\n')+'\n'
const preludeFile=join(rt.directory,'restore-schema-prelude-'+database+'.list')
writeFileSync(preludeFile,prelude,{mode:0o600,flag:'wx'})
run('pg_restore',['--exit-on-error','--use-list',preludeFile,'--dbname',database,dump])
run('pg_restore',['--exit-on-error','--schema=public','--schema=auth','--schema=storage','--dbname',database,dump])
const tables=JSON.parse(sql(database,"select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename) order by schemaname,tablename) from pg_tables where schemaname in ('public','auth','storage')"))
const actual=JSON.parse(sql(database,fingerprintSQL(tables)))
const expected=JSON.parse(readFileSync(join(backup,'row-fingerprints.json'),'utf8'))
const mismatches=Object.keys({...expected,...actual}).filter(k=>JSON.stringify(actual[k])!==JSON.stringify(expected[k]))
if(mismatches.length)throw Error('baseline_fingerprint_mismatch: '+mismatches.join(', '))
const result={passed:true,projectRef:manifest.projectRef,backup,dumpSha256:manifest.dumpSha256,database,runtimeFile,verifiedTables:tables.length,verifiedPublicTables:tables.filter(t=>t.schema==='public').length,allRowFingerprintsMatch:true,rolesRestoredWithoutPasswords:true,limits:'Native public/auth/storage relational restore only; provider Auth/REST/Edge services, internal realtime/vault and provider credentials are not recreated',recordedAt:new Date().toISOString()}
writeFileSync(join(rt.directory,'restore-result-'+database+'.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'})
console.log(JSON.stringify(result))
