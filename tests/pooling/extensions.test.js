import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reconcileEffects, comparePerformances, composeWeek, proposeProgression, reassessmentRequests } from '../../src/lib/pooling/extensions.js'
function fixture() {
  const policy = { id: 'synthetic-policy', revision: 1, reviewStatus: 'published', rightsStatus: 'accepted', automationEligible: true,
    approvalEvidence: ['content','rights','scope'].map(kind => ({ kind, decision: 'accepted', reviewerId: 'fictional', reference: 'test-only', revision: 1 })),
    fields: { load: { min: 0, max: 20, increment: 1, maxChange: 2 } } }
  return { context: { state: 'eligible_for_coach_review' }, baseline: [{ occurrenceId: 'test', revision: 1, load: 10 }],
    signals: [{ id: 'signal1', occurrenceId: 'test', field: 'load', quality: 'confirmed', lineageId: 'event1', delta: 1 }], policy,
    manifest: { state: 'published', releaseEvidence: 'test-only', records: [{ id: policy.id, revision: 1 }] } }
}
test('effect calculated from original baseline once', () => { const input = fixture(); input.signals.push({ ...input.signals[0], id: 'mirror' }); const out = reconcileEffects(input); assert.equal(out.effects.length, 1); assert.equal(out.effects[0].to, 11); assert.equal(input.baseline[0].load, 10) })
test('independent conflicting signals require review, not compounding', () => { const input = fixture(); input.signals.push({ ...input.signals[0], id: 'other', lineageId: 'event2', delta: -1 }); assert.equal(reconcileEffects(input).state, 'review_required') })
test('held context cannot produce lighter-dose escape', () => { const input = fixture(); input.context.state = 'held'; assert.equal(reconcileEffects(input).effects.length, 0) })
test('null parameter remains unsupported', () => { const input = fixture(); input.policy.fields.load.increment = null; assert.equal(reconcileEffects(input).effects.length, 0) })
test('rounding cannot exceed accepted bounds', () => { const input = fixture(); input.signals[0].delta = 20; assert.equal(reconcileEffects(input).state, 'review_required') })
test('completed actual scope is never rewritten', () => { const input = fixture(); input.completedOccurrences = ['test']; assert.equal(reconcileEffects(input).effects.length, 0) })
test('draft policy cannot drive numerical change', () => { const input = fixture(); input.policy.reviewStatus = 'draft'; assert.equal(reconcileEffects(input).state, 'unsupported_policy') })
test('comparison requires explicit parameters', () => assert.equal(comparePerformances({ policy: {}, performances: [], sessionAt: '2026-09-07', knowledgeCutoff: '2026-09-07' }).state, 'unsupported_policy'))
test('weekly planning cannot invent a schedule', () => assert.equal(composeWeek({ slots: [] }).state, 'information_required'))

function progressionFixture() {
  const input=fixture()
  input.policy={...input.policy,windowSeconds:86400,minimumPerformances:1,operator:'gte',comparisonThreshold:10,field:'load',progressionDelta:1}
  input.sessionAt='2026-09-07T12:00:00Z'
  input.knowledgeCutoff=input.sessionAt
  input.reference={occurrenceId:'test',variantId:'synthetic-variant',variantRevision:1,side:'left',range:'synthetic-range',equipment:[],unit:'synthetic-unit',method:'synthetic-method',assistance:'none',loadBasis:'no_external_load'}
  input.performances=[{...input.reference,id:'performance1',actual:10,quality:'confirmed',complete:true,effortConfirmed:true,lineageId:'event1',effectiveAt:input.sessionAt,recordedAt:input.sessionAt}]
  return input
}
test('progression uses explicit fictional policy, never rewrites baseline', () => { const input=progressionFixture(); const result=proposeProgression(input); assert.equal(result.state,'proposal'); assert.equal(result.effects[0].to,11); assert.equal(input.baseline[0].load,10); assert.equal(result.assignment,null) })
test('different side cannot support progression', () => { const input=progressionFixture(); input.performances[0].side='right'; assert.equal(proposeProgression(input).state,'insufficient_evidence') })
test('missing actual is not replaced with the target', () => { const input=progressionFixture(); input.performances[0].actual=null; assert.equal(proposeProgression(input).state,'insufficient_evidence') })
test('conflicting mirrors are both excluded rather than selecting one', () => { const input=progressionFixture(); input.performances.push({...input.performances[0],id:'mirror',actual:20}); const result=comparePerformances(input); assert.equal(result.included.length,0); assert(result.excluded.every(row=>row.reasons.includes('conflicting_lineage'))) })
test('later recorded performance is excluded from historical knowledge', () => { const input=progressionFixture(); input.performances[0].recordedAt='2026-09-08T12:00:00Z'; assert.equal(proposeProgression(input).state,'insufficient_evidence') })
test('progression cannot remove a health hold', () => { const input=progressionFixture(); input.context.state='held'; assert.equal(proposeProgression(input).state,'hold') })
test('reassessment retains exact side field and grants no resolution', () => { const result=reassessmentRequests({facts:{'left.balance':{state:'stale',refs:['left-source']},'right.balance':{state:'usable',refs:['right-source']}}}); assert.equal(result.length,1); assert.equal(result[0].field,'left.balance'); assert.equal(result[0].resolvesRestriction,false) })
