import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reconcileEffects, comparePerformances, composeWeek } from '../../src/lib/pooling/extensions.js'
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
