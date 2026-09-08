// Record the final fresh relational restore and stop only this task's cluster.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {a33Harness} from './a33-runtime.mjs'
import {localRuntime} from './hosted-local.mjs'
const file=resolve(process.argv[2]||'');assert(file.startsWith(resolve('.local-test-runtime/hosted-restore-')))
const r=JSON.parse(readFileSync(file,'utf8'));assert(r.passed&&r.allRowFingerprintsMatch&&r.verifiedTables===87)
assert.equal(r.projectRef,'haxxetirrcrwzwdzsdui')
assert(r.backup.startsWith(resolve('.recovery/hosted-test/baseline-')))
const m=JSON.parse(readFileSync(join(r.backup,'manifest.json'),'utf8'));assert.equal(m.dumpSha256,r.dumpSha256)
const h=a33Harness();assert(h.ledger.retirement.passed&&h.ledger.preservation.passed)
assert(Date.parse(m.createdAt)>=Date.parse(h.ledger.retirement.at),'Post-retirement backup required')
const rt=localRuntime(r.runtimeFile)
rt.run('pg_ctl',['-D',rt.data,'stop','-m','fast','-w','-t','15'])
h.ledger.postRunRecovery={passed:true,at:r.recordedAt,verifiedTables:r.verifiedTables,allRowFingerprintsMatch:true,bytes:m.dumpBytes,sha256:r.dumpSha256,taskClusterStopped:true,offDevice:false,managedServiceRestore:false,restoreFile:file,backup:r.backup}
h.save();console.log(JSON.stringify(h.ledger.postRunRecovery))
