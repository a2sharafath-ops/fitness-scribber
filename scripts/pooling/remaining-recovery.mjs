// Post-fix same-device recovery rehearsal. Retains both source and restored DBs.
import {readFileSync,writeFileSync,statfsSync,mkdtempSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {localRuntime} from './hosted-local.mjs'
import {fingerprintSQL} from './hosted-backup.mjs'
const state=JSON.parse(readFileSync('.recovery/remaining-verification/native-runtime.json','utf8'));assert(state.passed)
const rt=localRuntime(state.runtimeFile),disk=statfsSync('.')
assert(disk.bavail*disk.bsize>1.5*1024**3)
const flags=JSON.parse(rt.sql(state.database,'select to_jsonb(r) from public.pooling_runtime r'));assert(!flags.r1&&!flags.r2&&!flags.r3)
const tables=JSON.parse(rt.sql(state.database,"select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename) order by schemaname,tablename) from pg_tables where schemaname in ('public','auth','storage')"))
const before=JSON.parse(rt.sql(state.database,fingerprintSQL(tables,true)))
const directory=mkdtempSync(resolve('.recovery/remaining-verification/restore-')),dump=join(directory,'local-post-fix.dump')
rt.run('pg_dump',['--format=custom','--file',dump,'--dbname',state.database])
const restored='fitness_hosted_migration_'+Date.now()
rt.run('createdb',['--owner','postgres',restored]);rt.run('pg_restore',['--exit-on-error','--dbname',restored,dump])
assert.deepEqual(JSON.parse(rt.sql(restored,fingerprintSQL(tables,true))),before)
const result={passed:true,recordedAt:new Date().toISOString(),tables:tables.length,allRowFingerprintsMatch:true,sha256:createHash('sha256').update(readFileSync(dump)).digest('hex'),bytes:readFileSync(dump).length,originalDatabasePreserved:true,restoredDatabasePreserved:true,source:state.database,restored,offDevice:false,managedServiceRestore:false}
writeFileSync('.recovery/remaining-verification/recovery.json',JSON.stringify(result,null,2)+'\n',{mode:0o600,flush:true})
// This run started this exact retained private cluster. No other process is stopped.
if(state.started)rt.run('pg_ctl',['-D',rt.data,'stop','-m','fast','-w','-t','15'])
console.log(JSON.stringify({...result,taskClusterStopped:state.started}))
