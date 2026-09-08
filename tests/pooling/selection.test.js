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
test('TC-021 CAT-012: fictional per-side timing is exactly 95 seconds',()=>{
 const d=input();Object.assign(d.doses[0],{sets:1,workSeconds:30,restSeconds:0,setupSeconds:20,transitionSeconds:15,sideMultiplier:2})
 assert.equal(resolveDose(d.catalogue[0],d.doses[0],d.manifest).seconds,95)
})
test('CAT-013: fictional repetition timing is exactly 138 seconds',()=>{
 const d=input();Object.assign(d.doses[0],{sets:2,mode:'repetitions',reps:8,workSeconds:24,restSeconds:60,setupSeconds:30,transitionSeconds:0,sideMultiplier:1})
 assert.equal(resolveDose(d.catalogue[0],d.doses[0],d.manifest).seconds,138)
})
test('TC-015: advanced experience and pinning cannot override a prohibited demand',()=>{
 const d=input();d.catalogue[0].levels=['advanced'];d.catalogue[0].demands=['fictional-restricted-demand'];d.request.level='advanced';d.request.prohibitedDemands=['fictional-restricted-demand'];d.request.pinnedIds=['synthetic-ex']
 const r=selectPool(d);assert.equal(r.blocks.length,0);assert(r.candidates[0].reasons.includes('restriction_exclusion'))
})
test('TC-011: a setting label never supplies missing equipment or prerequisites',()=>{
 const d=input();d.catalogue[0].equipment=['fictional-band'];d.catalogue[0].prerequisites=['fictional-anchor'];d.request.equipment=['fictional-band']
 assert(selectPool(d).candidates[0].reasons.includes('prerequisite_missing'))
 d.context.facts['fictional-anchor']={state:'usable',value:true};assert.equal(selectPool(d).completeness,'ready_for_coach_review')
})
