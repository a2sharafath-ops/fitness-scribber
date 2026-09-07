// Document-only integrity checker. No app imports, network, client data or file writes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
let assertions = 0;
const check = (condition, message) => { assertions++; if (!condition) errors.push(message); };
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const json = name => JSON.parse(read(name));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Implements only keywords used in our supplied draft schemas; rejects unknown keywords.
function validate(value, schema, at) {
  const supported = new Set(['type', 'const', 'enum', 'minLength', 'properties', 'required', 'additionalProperties', 'items']);
  for (const k of Object.keys(schema)) check(supported.has(k), `${at}: unsupported schema keyword ${k}`);
  if ('const' in schema) check(equal(value, schema.const), `${at}: wrong constant`);
  if (schema.enum) check(schema.enum.some(x => equal(x, value)), `${at}: value outside enum`);
  const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (schema.type) {
    const matches = schema.type === 'integer' ? Number.isInteger(value) : actual === schema.type;
    check(matches, `${at}: expected ${schema.type}, got ${actual}`);
    if (!matches) return;
  }
  if (schema.minLength !== undefined) check(typeof value === 'string' && [...value].length >= schema.minLength, `${at}: too short`);
  if (actual === 'array' && schema.items) value.forEach((v, i) => validate(v, schema.items, `${at}[${i}]`));
  if (actual === 'object' && schema.properties) {
    for (const key of schema.required || []) check(Object.hasOwn(value, key), `${at}: missing ${key}`);
    for (const [key, v] of Object.entries(value)) {
      if (schema.additionalProperties === false) check(Object.hasOwn(schema.properties, key), `${at}: extra ${key}`);
      if (schema.properties[key]) validate(v, schema.properties[key], `${at}.${key}`);
    }
  }
}

const schema = json('catalogues/catalogue.schema.json');
for (const [name, definition] of Object.entries(schema.$defs)) {
  const filename = path.normalize(path.join('catalogues', name));
  validate(json(filename), definition, filename);
}
const exerciseDoc = json('catalogues/exercises.draft.json');
const exercises = exerciseDoc.exercises;
const rules = json('catalogues/rules-and-templates.draft.json');
const { sources, reasons, vocabulary } = json('catalogues/sources-reasons-vocabulary.draft.json');
const mappings = json('catalogues/finding-mappings.draft.json').mappings;
const fixtures = json('quality/catalogue-coverage-and-cases.draft.json');
const backlog = json('sprint-backlog.json');
const manifest = json('preparation/PACKAGE_MANIFEST.json');
const collections = { exercises, protocols: rules.protocols, needs: rules.needs, mappings, policies: rules.policies, goals: rules.goals, doses: rules.doses, families: rules.families, sessions: rules.sessions, sources, reasons };
const ids = Object.fromEntries(Object.entries(collections).map(([key, rows]) => [key, new Set(rows.map(x => x.id))]));
for (const [key, rows] of Object.entries(collections)) check(ids[key].size === rows.length, `Duplicate ${key} ID`);
const ref = (id, group, owner) => check(ids[group].has(id), `${owner}: missing ${group} reference ${id}`);
for (const [group, rows] of Object.entries(collections)) for (const row of rows) {
  for (const id of row.sourceRefs || []) ref(id, 'sources', row.id);
  check((row.approvalEvidence || []).length === 0, `${row.id}: fabricated approval`);
  if (!['sources', 'reasons'].includes(group)) {
    check(row.reviewStatus === 'draft' && row.automationEligible === false, `${row.id}: must remain draft/ineligible`);
    check(Number.isInteger(row.revision) && row.revision > 0, `${row.id}: invalid revision`);
  }
}
for (const x of exercises) {
  ref(x.familyId, 'families', x.id);
  x.needRefs.forEach(id => ref(id, 'needs', x.id));
  x.doseRefs.forEach(id => ref(id, 'doses', x.id));
  x.restrictionPolicyRefs.forEach(id => ref(id, 'policies', x.id));
  x.roles.forEach(role => check(vocabulary.roles.includes(role), `${x.id}: invalid role`));
  x.equipment.forEach(item => check(vocabulary.equipment.includes(item), `${x.id}: invalid equipment`));
  x.levels.forEach(level => check(vocabulary.levels.includes(level), `${x.id}: invalid level`));
  x.settings.forEach(setting => check(vocabulary.settings.includes(setting), `${x.id}: invalid setting`));
  check(x.prerequisites.length > 0 && x.instructions.length > 0, `${x.id}: missing prerequisites/instructions`);
}
for (const n of rules.needs) ref(n.protocolRef, 'protocols', n.id);
for (const m of mappings) { ref(m.protocolRef, 'protocols', m.id); m.needRefs.forEach(id => ref(id, 'needs', m.id)); }
for (const p of rules.policies) ref(p.reasonRef, 'reasons', p.id);
for (const g of rules.goals) { g.needRefs.forEach(id => ref(id, 'needs', g.id)); g.sessionRefs.forEach(id => ref(id, 'sessions', g.id)); }
for (const f of rules.families) for (const id of f.members) {
  ref(id, 'exercises', f.id);
  check(exercises.find(x => x.id === id)?.familyId === f.id, `${f.id}: member family mismatch`);
}
for (const s of rules.sessions) for (const role of [...s.requiredRoles, ...s.optionalRoles, ...s.roleOrdering]) check(vocabulary.roles.includes(role), `${s.id}: invalid role`);
const combinations = new Set();
for (const c of fixtures.coverage) {
  ref(c.goalRef, 'goals', c.id); c.candidateRefs.forEach(id => ref(id, 'exercises', c.id));
  c.uncoveredNeedRefs.forEach(id => ref(id, 'needs', c.id));
  combinations.add(`${c.goalRef}/${c.setting}/${c.level}`);
  check(c.productionCoverage === 'none-approved', `${c.id}: false approved coverage`);
}
for (const goal of rules.goals) for (const setting of vocabulary.settings) for (const level of vocabulary.levels) check(combinations.has(`${goal.id}/${setting}/${level}`), `Missing coverage ${goal.id}/${setting}/${level}`);
check(fixtures.coverage.length === 63 && combinations.size === 63, 'Coverage count/duplicates');
for (const a of fixtures.accessCases) [...a.considerRefs, ...a.excludeRefs].forEach(id => ref(id, 'exercises', a.id));
check(new Set(fixtures.cases.map(x => x.id)).size === 24, 'CAT IDs/count');
for (const c of fixtures.cases) {
  c.candidateRefs.forEach(id => ref(id, 'exercises', c.id));
  c.expectedReasonRefs.forEach(id => ref(id, 'reasons', c.id));
  check(c.status === 'specification-not-executed' && c.reviewEvidence.length === 0, `${c.id}: false result/review`);
}
const reqText = read('prd/MASTER_PRD.md');
const reqIds = new Set([...reqText.matchAll(/REQ-\d{3}/g)].map(x => x[0]));
check(reqIds.size === 18, 'Requirement count');
for (const c of fixtures.cases) for (const id of c.requirements) check(reqIds.has(id), `${c.id}: missing requirement ${id}`);
const trace = read('quality/TRACEABILITY_AND_VERIFICATION.md');
for (const id of reqIds) check(trace.includes(`| ${id} `), `Unmapped ${id}`);
const tcIds = new Set([...read('quality/REFERENCE_CASES_AND_TEST_STRATEGY.md').matchAll(/\| (TC-\d{3}) \|/g)].map(x => x[1]));
check(tcIds.size === 46, 'TC count');
const taskIds = new Set(backlog.tasks.map(x => x.id));
const localBuild = backlog.implementationAuthorized === true && backlog.localOnlyProposal?.status === 'owner-approved-local-only';
const expectedTasks = localBuild ? 82 : 70;
check(backlog.tasks.length === expectedTasks && taskIds.size === expectedTasks, 'Task count/duplicates');
const prepTasks = backlog.tasks.filter(t => ['S1', 'S2'].includes(t.sprint));
check(prepTasks.length === 31 && prepTasks.every(t => t.preparationStatus === 'complete' && t.acceptanceStatus === 'pending' && t.status !== 'done'), 'Preparation/acceptance task status');
check((backlog.implementationAuthorized === false || localBuild) && backlog.productionChangesAuthorized === false, 'Backlog authorization');
if(localBuild)check(backlog.consolidatedPlan === 'preparation/LOCAL_COMPLETION_APPROVAL.md' && backlog.implementationAuthorizationDetail.professionalSignoffVerified === false, 'Recorded local exception without fabricated professional acceptance');
check(manifest.implementationAuthorized === false && manifest.productionEnabled === false, 'Manifest authorization');
check(manifest.artifacts.length === 40 && new Set(manifest.artifacts.map(a => a.id)).size === 40, 'Artifact count/duplicates');
for (const gate of ['G1', 'G2']) check(backlog.gateStatus[gate] === 'pending' && manifest.gateStatus[gate] === 'pending', `False ${gate} acceptance`);
check(backlog.gateStatus.A12 === (localBuild ? 'local-build-authorized-under-A23-professional-release-gates-pending' : 'not-authorized') && manifest.gateStatus.A12 === 'not-authorized', 'Current local approval and historical manifest must remain distinct');
for (const t of backlog.tasks) {
  for (const d of t.dependsOn || []) check(taskIds.has(d), `${t.id}: missing task dependency ${d}`);
  for (const f of t.outputs || []) check(fs.existsSync(path.join(root, f)), `${t.id}: missing output ${f}`);
}
const visiting = new Set(), visited = new Set();
function visit(id) {
  if (visiting.has(id)) { check(false, `Task dependency cycle at ${id}`); return; }
  if (visited.has(id)) return;
  visiting.add(id);
  for (const d of backlog.tasks.find(x => x.id === id)?.dependsOn || []) visit(d);
  visiting.delete(id); visited.add(id);
}
for (const id of taskIds) visit(id);
for (const a of manifest.artifacts) for (const f of a.files) check(fs.existsSync(path.join(root, f)), `${a.id}: missing file ${f}`);
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(x => x.isDirectory() ? walk(path.join(dir, x.name)) : [path.join(dir, x.name)]); }
const files = walk(root);
for (const f of files.filter(f => f.endsWith('.json'))) { try { JSON.parse(fs.readFileSync(f, 'utf8')); } catch { check(false, `Invalid JSON ${f}`); } }
for (const f of files.filter(f => f.endsWith('.md'))) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = m[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    check(fs.existsSync(path.resolve(path.dirname(f), decodeURIComponent(target))), `${path.relative(root, f)}: broken link ${target}`);
  }
}
const counts = { exercises: exercises.length, protocols: rules.protocols.length, needs: rules.needs.length, mappings: mappings.length, policies: rules.policies.length, goals: rules.goals.length, doses: rules.doses.length, families: rules.families.length, sessions: rules.sessions.length, reasons: reasons.length, sources: sources.length, equipmentIds: vocabulary.equipment.length, coverageRows: fixtures.coverage.length, accessScenarios: fixtures.accessCases.length, tcSpecifications: tcIds.size, catSpecifications: fixtures.cases.length, productionApprovedExercises: exercises.filter(x => x.automationEligible).length };
for (const [key, value] of Object.entries(counts)) check(manifest.draftCounts[key] === value, `Manifest count mismatch ${key}`);
console.log(JSON.stringify({ packageId: manifest.packageId, status: errors.length ? 'failed' : 'passed-document-checks', assertions, errors, counts, taskCount: taskIds.size, preparationCompleteTasks: prepTasks.length, artifactCount: manifest.artifacts.length, applicationTestsExecuted: false, professionalAcceptanceRecorded: false, implementationAuthorized: backlog.implementationAuthorized, scope: 'Document integrity only; historical draft manifests unchanged, local approval separately recorded' }, null, 2));
process.exitCode = errors.length ? 1 : 0;
