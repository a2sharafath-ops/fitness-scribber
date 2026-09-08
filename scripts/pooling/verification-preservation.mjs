// Compare every pre-A32 row against the verified restored baseline. Only new
// rows may exist; never weaken a mismatch to a whole-table exclusion.
import {readFileSync,writeFileSync} from 'node:fs'
import {join,dirname} from 'node:path'
import assert from 'node:assert/strict'
import {connection,query} from './hosted-backup.mjs'
import {localRuntime} from './hosted-local.mjs'
import {verificationHarness} from './verification-runtime.mjs'
const h=verificationHarness();assert(h.ledger.retirement?.passed)
const restore=JSON.parse(readFileSync('.local-test-runtime/hosted-restore-Zc0Yjh/restore-result-fitness_hosted_restore_1788873788910.json','utf8'));assert(restore.passed)
const rt=localRuntime(restore.runtimeFile),env=connection(),names=Object.keys(JSON.parse(readFileSync(join(restore.backup,'row-fingerprints.json'),'utf8')))
const q=s=>"'"+s.replaceAll("'","''")+"'",ident=s=>'"'+s.replaceAll('"','""')+'"'
const sql=`select jsonb_object_agg(name,hashes) from (${names.map(name=>`select ${q(name)} name,coalesce(jsonb_agg(hash order by hash collate "C"),'[]') hashes from (select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') hash from ${name.split('.').map(ident).join('.')} t) x`).join(' union all ')}) hashes`
const old=JSON.parse(rt.sql(restore.database,sql)),current=JSON.parse(query(rt.bin,env,sql));let baselineRows=0,addedRows=0,addedPublicRows=0
for(const name of names){const remaining=[...current[name]];baselineRows+=old[name].length;for(const hash of old[name]){const i=remaining.indexOf(hash);assert(i>=0,'Original row changed or missing: '+name);remaining.splice(i,1)}addedRows+=remaining.length;if(name.startsWith('public.'))addedPublicRows+=remaining.length}
const guards=JSON.parse(query(rt.bin,env,`select jsonb_build_object('flags',(select to_jsonb(r) from public.pooling_runtime r),'workspaces',(select count(*) from public.pooling_test_workspaces),'writes',(select sum(writes) from public.pooling_test_workspaces),'storageObjects',(select count(*) from storage.objects),'realPublished',(select count(*) from public.pooling_manifests where state='published' and id not like 'fs_pool_coachtest_%'),'originalCoaches',(select cardinality(coach_ids) from public.pooling_test_config))`))
assert.deepEqual(guards.flags,{singleton:true,r1:false,r2:false,r3:false});assert.equal(guards.storageObjects,0);assert.equal(guards.realPublished,0);assert.equal(guards.originalCoaches,2);assert(guards.workspaces<=6);assert(addedPublicRows<1000)
const report={passed:true,recordedAt:new Date().toISOString(),baselineTables:names.length,baselineRows,allBaselineRowsPreserved:true,addedRows,addedPublicRows,authUsersCreated:h.ledger.users.length,previewBuildsReserved:h.ledger.previewBuilds,...guards}
h.ledger.preservation=report;h.save();writeFileSync(join(dirname(h.file),'preservation.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report))
