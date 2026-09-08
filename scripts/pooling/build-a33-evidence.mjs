// Mechanical evidence/backlog reconciliation from the completed private run.
// No credentials, private rows, JWTs or raw browser events are published.
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
const root='docs/exercise-pooling/'
const marker=JSON.parse(readFileSync('.recovery/hosted-test/a33-current.json','utf8'))
assert(marker.file.startsWith(resolve('.recovery/hosted-test/run-')))
const l=JSON.parse(readFileSync(marker.file,'utf8'))
assert(l.approval==='A33'&&l.finalChecks.passed&&l.retirement.passed&&l.preservation.passed&&l.postRunRecovery?.passed)
const matrix=JSON.parse(readFileSync(root+'quality/hosted-acceptance-matrix.json','utf8'))
assert.equal(matrix.version,'A33-2026-09-08')
const evidence={version:'A33-2026-09-08',recordedAt:new Date().toISOString(),scope:'Bounded fictional engineering verification. Not full acceptance, clinical approval or Production release.',applicationCommit:l.finalChecks.applicationCommit,verification:l.finalChecks,retirement:l.retirement,preservation:l.preservation,acceptanceCounts:matrix.counts,mainUntouched:true,productionEnabled:false,offDeviceRecoveryVerified:false,managedServiceRestoreVerified:false}
if(l.postRunRecovery?.passed){const {restoreFile:_restoreFile,backup:_backup,...safe}=l.postRunRecovery;evidence.postRunRecovery=safe}
writeFileSync(root+'quality/a33-hosted-verification.json',JSON.stringify(evidence,null,2)+'\n')
const p=JSON.parse(readFileSync(root+'sprint-backlog.json','utf8'));assert.equal(p.tasks.length,82)
p.version='A33-2026-09-08';p.status='bounded-hosted-verification-contained-full-acceptance-open'
p.currentPhase='A33 engineering/hosted follow-up contained; human/domain/release gates remain open'
p.approvalsSummary.remaining='A22-A33 local build, exact existing-stack integration, bounded fictional hosted follow-ups and protected feature-branch publication approved/executed. Professional/privacy/rights acceptance, human/device/load UAT, off-device/full managed recovery and real-client/main/Production release remain pending.'
p.hostedVerificationReport='operations/A33_HOSTED_VERIFICATION.md'
p.remainingWorkReport='operations/REMAINING_WORK.md'
p.completedScope='Owner review of all six PRDs and twelve catalogue drafts; Classic checkpoint and restore; R1-R3 implementation; A30-A32 hosted evidence plus A33 copy/import/travel/kg/recovery/real-Auth follow-up, scoped migrations, containment and original-row preservation. Human/domain/release acceptance remains open.'
p.hostedVerificationSummary={version:p.version,applicationCommit:l.finalChecks.applicationCommit,unitTests:177,httpHandlerTests:6,nativeSuites:16,uiChecks:l.finalChecks.uiChecks,originalTables:l.preservation.baselineTables,originalRows:l.preservation.baselineRows,allOriginalRowsPreserved:true,counts:matrix.counts,fullAcceptance:false,productionReady:false}
p.a33Approval={artifact:'preparation/A33_HOSTED_EXTENSION_REQUEST.md',status:'approved-executed-contained',newAccounts:2,newWorkspaces:3,previewBuilds:l.previewBuilds,mainPromotionAuthorized:false,originalWindowPreserved:true}
const changed={
 'FP-504':['engineering-verified-acceptance-open','All named hosted import/copy UI variations passed; human coach/client acceptance and optional excluded provider scope remain.'],
 'FP-505':['engineering-verified-acceptance-open','Listed local storage/Web Locks and hosted response-loss, real expiry/refresh, sign-out and account-switch pending-operation checks passed. Human/device acceptance remains.'],
 'FP-506':['in-progress','Native date entry, focus, dismissal guards and browser reflow checked. Physical-device, OS-zoom, real screen-reader and participant acceptance remain.'],
 'FP-601':['in-progress','92 listed engineering invariants pass; 8 partial and 10 external-scope cases remain. Agreed performance/load targets, accepted real cases and participant/device acceptance remain.'],
 'FP-603':['in-progress','Fresh 85/86-table pre-migration restores, both additive rehearsals and the final 87-table post-retirement restore passed; all original rows preserved. Full managed-service/off-device disaster recovery needs an exact authorized target.'],
 'FP-701':['preparation-complete-owner-reviewed','All six PRDs/twelve catalogue owner reviews are already accepted. Exact executable R2 policy/rights/domain acceptance and later enablement remain separate.'],
 'FP-704':['in-progress','Exact hosted numerical-review response loss and original-key reconciliation passed. Accepted real policy/privacy, physical-device and participant criteria remain.'],
 'FP-801':['preparation-complete-owner-reviewed','All six PRDs/twelve catalogue owner reviews are already accepted. Exact executable R3 policy/rights/domain acceptance and later enablement remain separate.'],
 'FP-805':['in-progress','Hosted exact 2-to-4 kg inventory-gated progression and travel-history paths passed. Accepted real content, pilot/UAT and scoped release remain pending.'],
}
for(const task of p.tasks){
 if(changed[task.id]){
  task.previousA32RemainingWork??=task.remainingWork??[]
  const [status,remaining]=changed[task.id];task.status=status;task.remainingWork=[remaining]
  task.a33Review={report:p.hostedVerificationReport,fullAcceptanceClaimed:false,remaining}
  task.hostedEvidence=[...new Set([...(task.hostedEvidence??[]),p.hostedVerificationReport,'quality/HOSTED_ACCEPTANCE_MATRIX.md'])]
  if(['FP-701','FP-801'].includes(task.id)){task.acceptanceStatus='owner-reviewed-professional-acceptance-separate';task.progressNote=remaining}
 }
}
writeFileSync(root+'sprint-backlog.json',JSON.stringify(p,null,2)+'\n')
writeFileSync(root+'operations/A33_SPRINT_RECONCILIATION.md',['# A33 — current reconciliation of all 82 sprint tasks','','8 September 2026. No task is deleted; historical A32 evidence remains. Owner preparation review, engineering proof and human/domain/release acceptance are distinct. See [current evidence](A33_HOSTED_VERIFICATION.md) and [remaining work](REMAINING_WORK.md).','','| Task | Sprint | Task | Current state | Remaining boundary |','|---|---|---|---|---|',...p.tasks.map(t=>`| ${t.id} | ${t.sprint} | ${t.title} | ${t.status} | ${t.a33Review?.remaining||t.a32Review?.remaining||'Owner preparation review recorded; applicable task-specific external acceptance remains separate.'} |`),''].join('\n'))
console.log(JSON.stringify({published:true,tasks:p.tasks.length,counts:matrix.counts,privateRowsPublished:false}))
