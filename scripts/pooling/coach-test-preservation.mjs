// Read-only subset preservation: original records may not change or disappear.
// Newly created A31 evidence is counted separately and never printed as bodies.
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import assert from 'node:assert/strict'
import {connection,query} from './hosted-backup.mjs'
import {localRuntime} from './hosted-local.mjs'
import {harness} from './hosted-test-runtime.mjs'
process.umask(0o077)
const restore=JSON.parse(readFileSync('.local-test-runtime/hosted-restore-Zc0Yjh/coach-test-restore-result.json','utf8'))
assert.equal(restore.passed,true)
const rt=localRuntime(restore.runtimeFile),env=connection(),h=harness('.recovery/hosted-test/run-pINCGI/ledger.json')
const names=Object.keys(JSON.parse(readFileSync(join(restore.backup,restore.fingerprintFile),'utf8')))
const q=s=>"'"+s.replaceAll("'","''")+"'",ident=s=>'"'+s.replaceAll('"','""')+'"'
const rowHashSQL=`select jsonb_object_agg(name,hashes) from (${names.map(name=>`select ${q(name)} name,coalesce(jsonb_agg(hash order by hash collate "C"),'[]') hashes from (select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') hash from ${name.split('.').map(ident).join('.')} t) x`).join(' union all ')}) hashes`
const old=JSON.parse(rt.sql(restore.database,rowHashSQL)),current=JSON.parse(query(rt.bin,env,rowHashSQL))
let added=0,baselineRows=0
for(const name of names){
 const remaining=[...current[name]];baselineRows+=old[name].length
 for(const hash of old[name]){const index=remaining.indexOf(hash);assert(index>=0,'Baseline row changed or missing in '+name);remaining.splice(index,1)}
 added+=remaining.length
}
const guards=JSON.parse(query(rt.bin,env,`select jsonb_build_object(
 'flags',(select to_jsonb(r) from public.pooling_runtime r),
 'workspaces',(select count(*) from public.pooling_test_workspaces),
 'workspaceWrites',(select coalesce(sum(writes),0) from public.pooling_test_workspaces),
 'enabled',(select enabled from public.pooling_test_config where singleton),
 'endsAt',(select ends_at from public.pooling_test_config where singleton),
 'storageObjects',(select count(*) from storage.objects),
 'realCandidatesPublished',(select count(*) from public.pooling_manifests where state='published' and id not like 'fs_pool_coachtest_%'))`))
assert.deepEqual(guards.flags,{singleton:true,r1:false,r2:false,r3:false});assert.equal(guards.storageObjects,0);assert.equal(guards.realCandidatesPublished,0)
assert(guards.workspaces<=3&&guards.workspaceWrites<=480)
assert.equal(h.ledger.users.length,6);assert(h.ledger.previewBuilds<=10)
const report={passed:true,baselineTables:names.length,baselineRows,allBaselineRowsPreserved:true,addedRowsInBaselineTables:added,newInfrastructureRows:guards.workspaces+1,
 conservativeRunOwnedApplicationBound:440+3*160+20,authUsersCreated:6,previewBuildsReserved:h.ledger.previewBuilds,...guards,recordedAt:new Date().toISOString()}
assert(report.conservativeRunOwnedApplicationBound<1000)
h.ledger.a31.preservation=report;h.save()
writeFileSync(resolve('.recovery/hosted-test/run-pINCGI/a31-preservation.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify(report))
