// Every original field of every original row is compared; no table exclusion.
import {readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {connection,query} from './hosted-backup.mjs'
import {localRuntime} from './hosted-local.mjs'
import {a33Harness} from './a33-runtime.mjs'
const h=a33Harness();assert(h.ledger.retirement?.passed)
const restore=JSON.parse(readFileSync(h.ledger.restoreFile,'utf8'));assert(restore.passed)
const rt=localRuntime(restore.runtimeFile),env=connection(),names=Object.keys(JSON.parse(readFileSync(join(restore.backup,'row-fingerprints.json'),'utf8')))
const q=s=>"'"+s.replaceAll("'","''")+"'",ident=s=>'"'+s.replaceAll('"','""')+'"'
const sql=`select jsonb_object_agg(name,hashes) from (${names.map(name=>`select ${q(name)} name,coalesce(jsonb_agg(hash order by hash collate "C"),'[]') hashes from (select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') hash from ${name.split('.').map(ident).join('.')} t) x`).join(' union all ')}) hashes`
const before=JSON.parse(rt.sql(restore.database,sql)),after=JSON.parse(query(rt.bin,env,sql));let baselineRows=0,addedRows=0,addedPublicRows=0
for(const name of names){const remaining=[...after[name]];baselineRows+=before[name].length;for(const hash of before[name]){const i=remaining.indexOf(hash);assert(i>=0,'Original row changed or missing: '+name);remaining.splice(i,1)}addedRows+=remaining.length;if(name.startsWith('public.'))addedPublicRows+=remaining.length}
const guards=JSON.parse(query(rt.bin,env,`select jsonb_build_object('flags',(select to_jsonb(r) from public.pooling_runtime r),'workspaces',(select count(*) from public.pooling_test_workspaces),'storageObjects',(select count(*) from storage.objects),'publishedNonFixture',(select count(*) from public.pooling_manifests where state='published' and id not like 'fs_pool_coachtest_%'),'originalCoaches',(select cardinality(coach_ids) from public.pooling_test_config),'newSidecarRows',(select count(*) from public.pooling_engineering_slots)+(select count(*) from public.pooling_engineering_releases),'activeNewSlots',(select count(*) from public.pooling_engineering_slots where revoked_at is null),'activeNewReleases',(select count(*) from public.pooling_engineering_releases where revoked_at is null))`))
assert.deepEqual(guards.flags,{singleton:true,r1:false,r2:false,r3:false});assert.equal(guards.storageObjects,0);assert.equal(guards.publishedNonFixture,0);assert.equal(guards.originalCoaches,2);assert.equal(guards.workspaces,7);assert.equal(guards.activeNewSlots,0);assert.equal(guards.activeNewReleases,0)
addedPublicRows+=guards.newSidecarRows;addedRows+=guards.newSidecarRows;assert(addedPublicRows<=1000)
assert(h.ledger.budget.requests<=1200&&h.ledger.budget.writes<=400&&h.ledger.previewBuilds<=2)
const report={passed:true,at:new Date().toISOString(),baselineTables:names.length,baselineRows,allOriginalRowsPreserved:true,addedRows,addedPublicRows,newAuthUsers:h.ledger.users.length,previewBuilds:h.ledger.previewBuilds,budget:h.ledger.budget,...guards}
h.ledger.preservation=report;h.save();writeFileSync(join(h.directory,'preservation.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report))
