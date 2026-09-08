// Exact archive preservation proof with portable row ordering. Keep the initial
// locale-dependent evidence; never edit either source or restored application rows.
import {readFileSync,writeFileSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {connection,query,fingerprintSQL,projectRef} from './hosted-backup.mjs'
import {localRuntime} from './hosted-local.mjs'
process.umask(0o077)
const backup=resolve('.recovery/hosted-test/baseline-bucN7d')
const runtimeFile=resolve('.local-test-runtime/hosted-restore-Zc0Yjh/runtime.json'),database='fitness_hosted_restore_1788863105199'
const rt=localRuntime(runtimeFile),manifest=JSON.parse(readFileSync(join(backup,'manifest.json'),'utf8'))
assert.equal(manifest.projectRef,projectRef)
assert.equal(createHash('sha256').update(readFileSync(join(backup,'database-full.dump'))).digest('hex'),manifest.dumpSha256)
const tables=Object.keys(JSON.parse(readFileSync(join(backup,'row-fingerprints.json'),'utf8'))).map(k=>{const [schema,table]=k.split('.');return {schema,table}})
const source=JSON.parse(query(rt.bin,connection(),fingerprintSQL(tables,true)))
const restored=JSON.parse(rt.sql(database,fingerprintSQL(tables,true)))
assert.deepEqual(source,restored,'Portable current-source versus restored-archive row fingerprints must all match')
writeFileSync(join(backup,'row-fingerprints-canonical.json'),JSON.stringify(source,null,2)+'\n',{mode:0o600,flag:'wx'})
const result={passed:true,projectRef,backup,dumpSha256:manifest.dumpSha256,database,runtimeFile,verifiedTables:tables.length,allRowFingerprintsMatch:true,fingerprintFile:'row-fingerprints-canonical.json',portableFingerprints:true,
 scope:'Native public/auth/storage relational restore; hosted Auth/REST/Edge/provider recovery not recreated',
 diagnostic:'Initial ledger-only mismatch was ordering: source en_US.UTF-8 versus restored C locale. Explicit COLLATE C matches every row fingerprint without changing data.',recordedAt:new Date().toISOString()}
const file=join(rt.directory,'coach-test-restore-result.json')
writeFileSync(file,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'})
console.log(JSON.stringify({...result,resultFile:file}))
