// Read-only, exact existing-stack verification. No raw baseline rows are logged.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve,dirname,join} from 'node:path'
import {connection,query} from './hosted-backup.mjs'
import {localRuntime} from './hosted-local.mjs'
import {harness} from './hosted-test-runtime.mjs'
const h=harness(process.argv[2]),restoreFile=resolve(process.argv[3]||'')
if(!restoreFile.startsWith(resolve('.local-test-runtime/hosted-restore-')))throw Error('exact_restored_baseline_required')
const restore=JSON.parse(readFileSync(restoreFile,'utf8'));assert.equal(restore.passed,true)
const rt=localRuntime(restore.runtimeFile),env=connection(),expected=JSON.parse(readFileSync(join(restore.backup,'row-fingerprints.json'),'utf8'))
const ident=s=>'"'+s.replaceAll('"','""')+'"',lit=s=>"'"+s.replaceAll("'","''")+"'"
const tables=Object.keys(expected).map(name=>({name,parts:name.split('.')}))
const rowHashes=tables.map(({name,parts})=>`select ${lit(name)} name,coalesce(jsonb_agg(hash order by hash),'[]') hashes from (select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') hash from ${parts.map(ident).join('.')} t) x`).join(' union all ')
const sql=`select jsonb_object_agg(name,hashes) from (${rowHashes}) h`
const baseline=JSON.parse(rt.sql(restore.database,sql)),current=JSON.parse(query(rt.bin,env,sql)),changes=[]
let addedBaselineRows=0
for(const {name} of tables){
 const currentHashes=[...current[name]]
 for(const hash of baseline[name]){const index=currentHashes.indexOf(hash);if(index<0)changes.push(name);else currentHashes.splice(index,1)}
 addedBaselineRows+=currentHashes.length
}
// Only metadata and identity keys enter the private manifest, never record bodies.
const ledgerSQL=`select jsonb_object_agg(name,rows) from (
 ${tables.map(({name,parts})=>`select ${lit(name)} name,coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(t)->'id','user_id',to_jsonb(t)->'user_id','actor_id',to_jsonb(t)->'actor_id')),'[]') rows from ${parts.map(ident).join('.')} t where encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') not in (select jsonb_array_elements_text(${lit(JSON.stringify(baseline[name]))}::jsonb))`).join(' union all ')}
 ) x`
const newIdentities=JSON.parse(query(rt.bin,env,ledgerSQL))
const poolingTables=JSON.parse(query(rt.bin,env,"select jsonb_agg(tablename order by tablename) from pg_tables where schemaname='public' and tablename like 'pooling_%' and tablename not in ('pooling_runtime','pooling_migration_ledger')"))
const rowsSQL=`select jsonb_object_agg(name,rows) from (${poolingTables.map(name=>`select ${lit(name)} name,coalesce(jsonb_agg(jsonb_build_object('id',to_jsonb(t)->'id','client_id',to_jsonb(t)->'client_id','actor_id',to_jsonb(t)->'actor_id','assignment_id',to_jsonb(t)->'assignment_id','draft_id',to_jsonb(t)->'draft_id','week_id',to_jsonb(t)->'week_id')),'[]') rows from public.${ident(name)} t`).join(' union all ')}) p`
const poolingIdentities=JSON.parse(query(rt.bin,env,rowsSQL)),poolingRows=Object.values(poolingIdentities).reduce((n,r)=>n+r.length,0)
const report={checkedAt:new Date().toISOString(),baselineTables:tables.length,baselineRows:Object.values(baseline).reduce((n,r)=>n+r.length,0),missingOrChangedBaselineTables:[...new Set(changes)],baselinePreserved:changes.length===0,addedBaselineRows,poolingRows,totalCreatedRows:addedBaselineRows+poolingRows,withinApproved1000:addedBaselineRows+poolingRows<=1000,storageObjects:Number(query(rt.bin,env,'select count(*) from storage.objects')),limits:'Infrastructure singleton and 18 migration-ledger rows excluded; identity inventory is private. No row deletions performed.'}
writeFileSync(join(dirname(h.file),'resource-inventory.json'),JSON.stringify({report,newIdentities,poolingIdentities},null,2)+'\n',{mode:0o600})
h.ledger.state.preservation=report;h.save();console.log(JSON.stringify(report))
assert.equal(report.baselinePreserved,true);assert.equal(report.withinApproved1000,true);assert.equal(report.storageObjects,0)
