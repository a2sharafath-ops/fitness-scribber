// Read-only evidence consistency check, not a replacement for application tests.
import {readFileSync,existsSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'
const pack=resolve(dirname(fileURLToPath(import.meta.url)),'..'),repo=resolve(pack,'../..')
const read=path=>JSON.parse(readFileSync(resolve(pack,path),'utf8'))
const backlog=read('sprint-backlog.json'),report=read('quality/local-build-verification.json'),resources=read('operations/LOCAL_RESOURCE_MANIFEST.json')
assert.equal(backlog.tasks.length,82);assert.equal(new Set(backlog.tasks.map(t=>t.id)).size,82)
assert.equal(backlog.localCodeCommit,report.codeCommit);assert.equal(resources.codeCommit,report.codeCommit)
assert.equal(backlog.productionChangesAuthorized,false)
assert.equal(report.unit.tests,report.unit.passed);assert.equal(report.unit.failed,0)
assert.equal(report.edge.typecheckedEntrypoints,6);assert.equal(report.requirementEvidence.length,18)
for(let i=1;i<=18;i++)assert(report.requirementEvidence.some(row=>row.requirement===`REQ-${String(i).padStart(3,'0')}`))
for(const row of report.requirementEvidence){assert.equal(row.completeOriginalAcceptanceSuite,false);for(const file of row.evidence)assert(existsSync(resolve(repo,file)),`Missing evidence source: ${file}`)}
for(const task of backlog.tasks){
 for(const file of task.localEvidence || [])assert(existsSync(resolve(pack,file)),`Missing task evidence: ${file}`)
 if(task.localImplementationStatus==='implemented')assert.notEqual(task.status,'awaiting-scope-approval')
}
for(const id of ['FP-602','FP-603','FP-604','FP-607','FP-608','FP-702','FP-705','FP-802','FP-805'])assert.notEqual(backlog.tasks.find(t=>t.id===id).status,'done',`External task falsely completed: ${id}`)
for(const enabled of Object.values(report.release))assert.equal(enabled,false)
assert.equal(report.native.backupSha256,resources.postgres.dumpSha256)
assert.equal(report.classic.commit,resources.classic.commit)
console.log(JSON.stringify({status:'passed-evidence-consistency',tasks:82,requirements:18,applicationTestsExecuted:false,releaseAccepted:false}))
