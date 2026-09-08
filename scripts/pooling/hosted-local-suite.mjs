// Actual restored schema/permissions, synthetic actors; not hosted JWT proof.
import {readFileSync,writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {join,resolve} from 'node:path'
import assert from 'node:assert/strict'
import {localRuntime} from './hosted-local.mjs'
process.umask(0o077)
const file=resolve(process.argv[2]||'');if(!file.startsWith(resolve('.local-test-runtime/hosted-restore-')))throw Error('private_rehearsal_required')
const report=JSON.parse(readFileSync(file,'utf8'));assert.equal(report.passed,true)
const rt=localRuntime(report.runtimeFile),db=report.database,sql=q=>rt.sql(db,q)
assert.equal(sql("select count(*) from auth.users where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003')"),'0')
sql("insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003')")
sql(readFileSync('tests/pooling/native-fixtures.sql','utf8'))
const checks=[]
for(const name of ['database.sql','authority.sql','gateway.sql','sources.sql','legacy-boundary.sql']){sql(readFileSync('tests/pooling/'+name,'utf8'));checks.push({name,passed:true});console.log(JSON.stringify(checks.at(-1)))}
const env={...process.env,FITNESS_POOLING_RESTORED_RUNTIME:report.runtimeFile,FITNESS_POOLING_PG_DATABASE:db}
for(const name of ['native-flow.mjs','native-extensions.mjs','native-concurrency.mjs','native-catalogue.mjs','native-runner.mjs','native-context.mjs','native-weekly.mjs','native-progression.mjs','native-suggestions.mjs','native-reassessment.mjs','native-catalogue-admin.mjs']){
 const r=spawnSync(process.execPath,['tests/pooling/'+name],{env,encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024})
 if(r.status!==0){const diagnostic=join(rt.directory,'suite-error-'+Date.now()+'.private.txt');writeFileSync(diagnostic,r.stderr||'',{mode:0o600,flag:'wx'});throw Error(name+' failed: '+diagnostic)}
 checks.push({name,passed:true});console.log(JSON.stringify(checks.at(-1)))
}
sql('update public.pooling_runtime set r1=false,r2=false,r3=false where singleton')
const result={passed:true,database:db,runtimeFile:report.runtimeFile,checks,flagsOff:true,authScope:'Restored actual schema/grants with local fictional actors, not hosted JWT validation',recordedAt:new Date().toISOString()}
const output=join(rt.directory,'local-suite-'+db+'.json');writeFileSync(output,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});console.log(JSON.stringify({reportFile:output,...result}))
