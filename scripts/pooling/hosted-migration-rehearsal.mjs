// Two applications against a fresh restored-baseline clone, no hosted writes.
import {readFileSync,writeFileSync} from 'node:fs'
import {join,resolve} from 'node:path'
import assert from 'node:assert/strict'
import {localRuntime} from './hosted-local.mjs'
import {migrationPlan} from './hosted-migration-plan.mjs'
import {fingerprintSQL} from './hosted-backup.mjs'
process.umask(0o077)
const resultFile=resolve(process.argv[2]||'')
if(!resultFile.startsWith(resolve('.local-test-runtime/hosted-restore-')))throw Error('restore_result_required')
const restore=JSON.parse(readFileSync(resultFile,'utf8'))
assert.equal(restore.passed,true);assert.equal(restore.allRowFingerprintsMatch,true)
const rt=localRuntime(restore.runtimeFile),database='fitness_hosted_migration_'+Date.now()
rt.run('createdb',['--template',restore.database,'--owner','postgres',database])
const sql=q=>rt.sql(database,q),tables=JSON.parse(sql("select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename) order by schemaname,tablename) from pg_tables where schemaname in ('public','auth','storage')"))
const baseline=JSON.parse(sql(fingerprintSQL(tables)))
const expected=JSON.parse(readFileSync(join(restore.backup,'row-fingerprints.json'),'utf8'))
assert.deepEqual(baseline,expected)
// Match the target's automatic RLS event trigger for public tables. Managed
// service notification hooks are not emulated in this relational rehearsal.
sql("create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') execute function public.rls_auto_enable()")
const plan=migrationPlan(),passes=[]
for(let pass=1;pass<=2;pass++){
 for(const item of plan){sql('set role postgres; '+item.sql);console.log(JSON.stringify({pass,migration:item.name,applied:true}))}
 assert.deepEqual(JSON.parse(sql(fingerprintSQL(tables))),baseline,'baseline records changed by migration')
 assert.deepEqual(JSON.parse(sql('select to_jsonb(r) from public.pooling_runtime r')),{singleton:true,r1:false,r2:false,r3:false})
 passes.push({pass,migrations:plan.length,baselinePreserved:true,flagsOff:true})
}
const grants=JSON.parse(sql(`select jsonb_build_object('selfRoleUpdate',has_column_privilege('authenticated','public.profiles','role','UPDATE'),'selfRoleInsert',has_column_privilege('authenticated','public.profiles','role','INSERT'),'serviceDecision',has_function_privilege('service_role','public.pooling_decision_input(uuid,text,bigint)','EXECUTE'),'clientDecision',has_function_privilege('authenticated','public.pooling_decision_input(uuid,text,bigint)','EXECUTE'),'anonDecision',has_function_privilege('anon','public.pooling_decision_input(uuid,text,bigint)','EXECUTE'),'clientRuntimeWrite',has_table_privilege('authenticated','public.pooling_runtime','UPDATE'))`))
assert.deepEqual(grants,{selfRoleUpdate:false,selfRoleInsert:false,serviceDecision:true,clientDecision:false,anonDecision:false,clientRuntimeWrite:false})
const report={passed:true,database,runtimeFile:restore.runtimeFile,restoreResult:resultFile,passes,grants,baselineTables:tables.length,migrations:plan.map(({name,sha256})=>({name,sha256})),recordedAt:new Date().toISOString()}
const output=join(rt.directory,'migration-rehearsal-'+database+'.json');writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'})
console.log(JSON.stringify({...report,reportFile:output}))
