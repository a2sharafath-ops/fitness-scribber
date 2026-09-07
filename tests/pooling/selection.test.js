import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectPool, resolveDose } from '../../src/lib/pooling/selection.js'

// Entirely fictional records. These are not clinical parameters or releasable content.
function approved(id, extra = {}) { return { id, revision: 1, reviewStatus: 'published', automationEligible: true, rightsStatus: 'accepted',
  approvalEvidence: ['content', 'rights', 'scope'].map(kind => ({ kind, decision: 'accepted', reviewerId: 'fictional-reviewer', reference: 'synthetic-test-only', revision: 1 })), ...extra } }
function input() {
  const exercise = approved('synthetic-ex', { scopes: ['adult_general_fitness'], settings: ['home'], levels: ['beginner'], equipment: [], demands: [], prerequisites: [], roles: ['main'], needRefs: ['synthetic-need'], doseRefs: ['synthetic-dose'] })
  const dose = approved('synthetic-dose', { sets: 2, workSeconds: 10, restSeconds: 5, setupSeconds: 3, transitionSeconds: 2, sideMultiplier: 1 })
  return { context: { version: 'synthetic', generation: 1, state: 'eligible_for_coach_review', facts: {} }, catalogue: [exercise], doses: [dose],
    manifest: { id: 'synthetic-manifest', state: 'published', releaseEvidence: 'synthetic-only', records: [{ id: exercise.id, revision: 1 }, { id: dose.id, revision: 1 }] },
    request: { roles: [{ id: 'main', required: true }], budgetSeconds: 60, scope: 'adult_general_fitness', setting: 'home', level: 'beginner', equipmentConfirmed: true, equipment: [], requiredNeeds: ['synthetic-need'] } }
}
test('complete draft is never assignment', () => { const result = selectPool(input()); assert.equal(result.completeness, 'ready_for_coach_review'); assert.equal(result.assignment, null); assert.equal(result.durationSeconds, 30) })
test('null work duration blocks composition', () => { const data = input(); data.doses[0].workSeconds = null; assert.equal(selectPool(data).blocks.length, 0) })
test('pins cannot bypass refusal', () => { const data = input(); data.request.pinnedIds = ['synthetic-ex']; data.request.refusedIds = ['synthetic-ex']; assert.equal(selectPool(data).blocks.length, 0) })
test('unpublished catalogue cannot generate exercises', () => { const data = input(); data.catalogue[0].reviewStatus = 'draft'; assert.equal(selectPool(data).blocks.length, 0) })
test('revoked manifest blocks all candidates', () => { const data = input(); data.manifest.revoked = true; assert.equal(selectPool(data).blocks.length, 0) })
test('missing equipment cannot be relaxed by budget', () => { const data = input(); data.catalogue[0].equipment = ['fictional-device']; assert.equal(selectPool(data).blocks.length, 0) })
test('hard hold cannot become an assignable generic fallback', () => { const data = input(); data.context.state = 'held'; assert.equal(selectPool(data).blocks.length, 0) })
test('duration includes unilateral work and inter-set rest', () => { const data = input(); data.doses[0].sideMultiplier = 2; assert.equal(resolveDose(data.catalogue[0], data.doses[0], data.manifest).seconds, 60) })
test('over budget produces a required gap', () => { const data = input(); data.request.budgetSeconds = 29; assert.equal(selectPool(data).completeness, 'blocked') })
test('optional role absent is an omission not a mandatory gap', () => { const data = input(); data.request.roles.push({ id: 'cooldown', required: false }); const result = selectPool(data); assert.equal(result.gaps.length, 0); assert.equal(result.omissions.length, 1) })
test('canonical replay is stable', () => assert.equal(selectPool(input()).replay, selectPool(input()).replay))
test('reviewed percentage requires exact variant and comparable load source',()=>{
 const data=input();Object.assign(data.doses[0],{mode:'repetitions',reps:3,loadMethod:'percentage',loadReferenceKey:'load',percentage:50,incrementKg:1,minimumLoadKg:1,maximumLoadKg:100,allowedReferenceKinds:['measured'],referenceMethod:'synthetic-test'})
 assert.equal(selectPool(data).completeness,'blocked')
 data.context.facts.load={state:'usable',value:{variantId:'synthetic-ex',unit:'kg',kind:'measured',method:'synthetic-test',valueKg:20}}
 assert.equal(selectPool(data).blocks[0].dose.prescription.loadKg,10)
 data.context.facts.load.value.variantId='other-lift';assert.equal(selectPool(data).completeness,'blocked')
})
test('explicit bodyweight/no-load work does not acquire a max or invented load',()=>{const data=input();data.doses[0].loadMethod='none';assert.equal(selectPool(data).blocks[0].dose.prescription.loadKg,null)})
