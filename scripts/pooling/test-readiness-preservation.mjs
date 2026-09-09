// Read-only public-row preservation proof. Authentication-session changes from
// the owner's personal sign-in are outside this application-record comparison.
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
import {connection,query} from './hosted-backup.mjs'
const mode=process.argv[2]
assert(['before','after'].includes(mode))
process.umask(0o077)
const directory=resolve('.recovery/test-readiness'),file=directory+'/public-baseline.json'
const {bin}=JSON.parse(readFileSync('.local-test-runtime/hosted-restore-Zc0Yjh/runtime.json','utf8'))
const env=connection()
const tables=JSON.parse(query(bin,env,"select jsonb_agg(tablename order by tablename) from pg_tables where schemaname='public'"))
assert(tables.every(table=>/^[a-z_][a-z0-9_]*$/.test(table)))
const sql=`select jsonb_object_agg(name,hashes) from (${tables.map(table=>`select '${table}' name,coalesce(jsonb_agg(hash order by hash collate "C"),'[]') hashes from (select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') hash from public."${table}" t) h`).join(' union all ')}) fingerprints`
const hashes=JSON.parse(query(bin,env,sql))
const guards=JSON.parse(query(bin,env,"select jsonb_build_object('globalFlags',(select to_jsonb(r) from public.pooling_runtime r),'workspaceCount',(select count(*) from public.pooling_test_workspaces),'realPublishedManifests',(select count(*) from public.pooling_manifests where state='published' and id not like 'fs_pool_coachtest_%'),'storageObjects',(select count(*) from storage.objects))"))
assert.deepEqual(guards.globalFlags,{singleton:true,r1:false,r2:false,r3:false})
assert.equal(guards.realPublishedManifests,0);assert.equal(guards.storageObjects,0)
if(mode==='before'){
  assert(!existsSync(file),'Baseline already exists; never overwrite it')
  // The owner was asked only to sign in; creation happens after this snapshot.
  assert.equal(guards.workspaceCount,7,'Reinspect any newly created workspace before defining the preservation baseline')
  writeFileSync(file,JSON.stringify({at:new Date().toISOString(),hashes,guards},null,2)+'\n',{mode:0o600,flag:'wx'})
  console.log(JSON.stringify({mode,publicTables:tables.length,originalPublicRows:Object.values(hashes).reduce((sum,rows)=>sum+rows.length,0),...guards,scope:'Read-only SHA-256 row fingerprints; no authentication records or real-client values printed'}))
}else{
  const baseline=JSON.parse(readFileSync(file,'utf8')),missing=[],added={}
  for(const [table,rows]of Object.entries(baseline.hashes)){
    const current=[...(hashes[table]||[])]
    for(const hash of rows){const index=current.indexOf(hash);if(index<0)missing.push(table);else current.splice(index,1)}
    added[table]=current.length
  }
  const report={at:new Date().toISOString(),passed:missing.length===0,originalPublicRows:Object.values(baseline.hashes).reduce((sum,rows)=>sum+rows.length,0),tablesWithChangedOrMissingOriginalRows:[...new Set(missing)],addedPublicRows:Object.values(added).reduce((sum,count)=>sum+count,0),...guards,limits:'Application records only; personal sign-in/session changes are not claimed unchanged. No restore or corrective database writes were attempted.'}
  writeFileSync(directory+'/public-preservation-result.json',JSON.stringify(report,null,2)+'\n',{mode:0o600})
  console.log(JSON.stringify(report));assert(report.passed,'Original application rows changed; investigate without restoring over later data')
}
