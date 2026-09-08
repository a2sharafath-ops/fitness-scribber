// Local-only preflight on a copy of the restored A30 schema. This is NOT the
// fresh target-backup gate and never authorizes a hosted migration by itself.
import {readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {localRuntime} from './hosted-local.mjs'
import {fingerprintSQL} from './hosted-backup.mjs'
const rt=localRuntime('.local-test-runtime/hosted-restore-Zc0Yjh/runtime.json')
const database='fitness_hosted_migration_'+Date.now()
rt.run('createdb',['--template','fitness_hosted_migration_1788846456696','--owner','postgres',database])
const sql=q=>rt.sql(database,q)
const tables=JSON.parse(sql("select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename) order by schemaname,tablename) from pg_tables where schemaname in ('public','auth','storage')"))
const baseline=JSON.parse(sql(fingerprintSQL(tables)))
for(let pass=1;pass<=2;pass++){
 sql('set role postgres; '+readFileSync('supabase/schema_pooling_coach_test.sql','utf8'))
 assert.deepEqual(JSON.parse(sql(fingerprintSQL(tables))),baseline)
 console.log(JSON.stringify({pass,baselinePreserved:true}))
}
const result={database,runtimeFile:join(rt.directory,'runtime.json'),localOnly:true}
writeFileSync(join(rt.directory,'coach-test-preflight.json'),JSON.stringify(result),{mode:0o600})
console.log(JSON.stringify(result))
const test=spawnSync(process.execPath,['tests/pooling/native-coach-test.mjs'],{env:{...process.env,FITNESS_POOLING_RESTORED_RUNTIME:result.runtimeFile,FITNESS_POOLING_PG_DATABASE:database},encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024})
process.stdout.write(test.stdout||'');process.stderr.write(test.stderr||'')
assert.equal(test.status,0,'Native A31 preflight failed')
writeFileSync(join(rt.directory,'coach-test-native-result.json'),test.stdout.trim().split('\n').at(-1),{mode:0o600})
