// Read-only validation of preparation artifacts, never application behavior.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const errors = [];
let checks = 0;
const check = (ok, message) => { checks++; if (!ok) errors.push(message); };
const sources = new Set(json('catalogues/sources-reasons-vocabulary.draft.json').sources.map(s => s.id));
const rules = new Map();
const parameterCounts = {};
for (const [file, release, artifact, prefix] of [['daily-adjustment.draft.json','R2','C09','DA'],['progression-planning.draft.json','R3','C10','PG']]) {
  const doc = json('catalogues/' + file);
  check(doc.release === release && doc.artifact === artifact, `${file}: identity`);
  check(doc.productionEnabled === false && doc.implementationAuthorized === false && doc.reviewStatus === 'draft' && doc.approvalEvidence.length === 0, `${file}: authority`);
  const params = new Set(doc.parameters.map(p => p.name));
  parameterCounts[artifact] = params.size;
  check(params.size === doc.parameters.length, `${file}: duplicate parameters`);
  for (const p of doc.parameters) check(p.value === null && p.status === 'professional/product-review-required', `${file}: invented accepted parameter ${p.name}`);
  check(doc.rules.length === 14, `${file}: rule count`);
  for (const r of doc.rules) {
    check(!rules.has(r.id) && new RegExp(`^${prefix}-\\d{2}$`).test(r.id), `${file}: duplicate/invalid rule ${r.id}`);
    rules.set(r.id, r);
    check(r.revision === 1 && r.reviewStatus === 'draft' && r.automationEligible === false && r.approvalEvidence.length === 0, `${r.id}: draft authority`);
    for (const field of ['name','when','result','action','scope','precedence']) check(typeof r[field] === 'string' && r[field].length > 0, `${r.id}: missing ${field}`);
    for (const p of r.parameterRefs) check(params.has(p), `${r.id}: missing parameter ${p}`);
    for (const s of r.sourceRefs) check(sources.has(s), `${r.id}: missing source ${s}`);
  }
}
const cases = read('quality/EXTENSION_TEST_SPECIFICATIONS.md');
const caseIds = [...cases.matchAll(/\| (R[23]-T\d{2}) \|/g)].map(m => m[1]);
check(caseIds.length === 40 && new Set(caseIds).size === 40, 'Extension case count/duplicates');
for (const release of ['R2','R3']) {
  const prd = read(release === 'R2' ? 'prd/DAILY_ADJUSTMENT_PRD.md' : 'prd/PROGRESSION_PLANNING_PRD.md');
  for (let i = 1; i <= 12; i++) check(prd.includes(`${release}-${String(i).padStart(3,'0')}`), `${release}: missing requirement ${i}`);
  for (let i = 1; i <= 20; i++) check(caseIds.includes(`${release}-T${String(i).padStart(2,'0')}`), `${release}: missing case ${i}`);
}
for (const m of cases.matchAll(/\b(?:DA|PG)-\d{2}\b/g)) check(rules.has(m[0]), `Case references missing rule ${m[0]}`);
const manifest = json('preparation/FULL_PREPARATION_MANIFEST.json');
check(manifest.artifacts.length === 40 && new Set(manifest.artifacts.map(a=>a.id)).size === 40, 'Artifact count/duplicates');
for (const a of manifest.artifacts) {
  check(a.files.length > 0 && a.acceptanceStatus === 'pending', `${a.id}: coverage/acceptance`);
  for (const f of a.files) check(fs.existsSync(path.join(root,f)), `${a.id}: missing ${f}`);
}
check(manifest.implementationAuthorized === false && manifest.productionEnabled === false, 'Manifest authority');
const b = json('sprint-backlog.json');
const localBuild=b.implementationAuthorized===true && b.localOnlyProposal?.status==='owner-approved-local-only';
check(b.tasks.length === (localBuild?82:70) && (b.implementationAuthorized === false || localBuild) && b.productionChangesAuthorized === false, 'Backlog scope');
if(localBuild)check(b.consolidatedPlan==='preparation/LOCAL_COMPLETION_APPROVAL.md' && b.implementationAuthorizationDetail.professionalSignoffVerified===false, 'Local approval is not professional acceptance');
for (const t of b.tasks) for (const f of t.preparationOutputs || []) check(fs.existsSync(path.join(root,f)), `${t.id}: missing preparation ${f}`);
for (const id of ['FP-605','FP-701','FP-801']) {
  const t = b.tasks.find(t=>t.id===id);
  check(t?.preparationStatus === 'complete' && t?.acceptanceStatus === 'pending' && t?.status !== 'done', `${id}: false completion/acceptance`);
}
check(b.extendedPreparationApproval.A20_preparation && b.extendedPreparationApproval.A21_preparation && b.extendedPreparationApproval.A20_build===localBuild && b.extendedPreparationApproval.A21_build===localBuild, 'Extension authorization');
console.log(JSON.stringify({packageId:manifest.packageId,status:errors.length?'failed':'passed-document-checks',checks,errors,prdDrafts:6,catalogueArtifacts:12,extensionRules:rules.size,extensionCases:caseIds.length,totalTestSpecifications:110,parameterCounts,artifactCount:manifest.artifacts.length,completePreparationTaskPortions:b.tasks.filter(t=>t.preparationStatus==='complete').length,applicationTestsExecuted:false,professionalAcceptanceRecorded:false,implementationAuthorized:b.implementationAuthorized,scope:'Document integrity only; accepted local build exception does not publish draft content'},null,2));
process.exitCode = errors.length ? 1 : 0;
