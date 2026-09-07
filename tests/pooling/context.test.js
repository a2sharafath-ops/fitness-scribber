import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonical, resolveContext } from '../../src/lib/pooling/context.js'
import { poolingConfig } from '../../src/lib/pooling/config.js'

const base = () => ({ clientId: 'synthetic-a', generation: 1, sessionAt: '2026-09-07T10:00:00Z',
  knowledgeCutoff: '2026-09-07T10:00:00Z', timeZone: 'Asia/Kolkata', adultConfirmed: true,
  purposePermitted: true, scope: 'adult_general_fitness', healthChange: 'no_change',
  sourceStatus: { assessment: 'loaded' }, requirements: [{ key: 'left', source: 'assessment', unit: 'boolean', protocol: 'synthetic-1', maxAgeSeconds: 100, required: true }],
  observations: [{ id: 'o1', clientId: 'synthetic-a', key: 'left', value: false, unit: 'boolean', protocol: 'synthetic-1', state: 'assessed_absent', quality: 'confirmed', confirmedBy: 'synthetic-coach', confirmedAt: '2026-09-07T10:00:00Z', effectiveAt: '2026-09-07T10:00:00Z', recordedAt: '2026-09-07T10:00:00Z' }] })
test('false is a confirmed value, not missing', () => assert.equal(resolveContext(base()).facts.left.value, false))
test('canonical object keys do not depend on insertion order', () => assert.equal(canonical({ b: 1, a: 0 }), canonical({ a: 0, b: 1 })))
test('unknown observation is never assessed absent', () => { const input = base(); input.observations[0].quality = 'legacy_ambiguous'; assert.equal(resolveContext(input).state, 'information_required') })
test('failed query is unavailable, not empty', () => { const input = base(); input.sourceStatus.assessment = 'failed'; assert.equal(resolveContext(input).state, 'unavailable') })
test('later known backdated correction excluded from replay', () => { const input = base(); input.observations.push({ ...input.observations[0], id: 'o2', supersedes: 'o1', value: true, recordedAt: '2026-09-08T10:00:00Z' }); assert.equal(resolveContext(input).facts.left.value, false) })
test('contradictory equal-time observations require review', () => { const input = base(); input.observations.push({ ...input.observations[0], id: 'o2', value: true }); assert.equal(resolveContext(input).state, 'review_required') })
test('unilateral fields cannot clear the other side', () => { const input = base(); input.observations[0].key = 'right'; assert.equal(resolveContext(input).facts.left.state, 'missing') })
test('a dated restriction does not silently expire', () => { const input = base(); input.restrictions = [{ id: 'r1', effectiveAt: '2026-01-01', recordedAt: '2026-01-01', expiresAt: '2026-02-01', state: 'active' }]; assert.equal(resolveContext(input).state, 'review_required') })
test('good optional wellness cannot clear reported health change', () => { const input = base(); input.healthChange = 'changed'; input.wellness = 7; assert.equal(resolveContext(input).state, 'held') })
test('null policy cannot set freshness', () => { const input = base(); input.requirements[0].maxAgeSeconds = null; assert.equal(resolveContext(input).facts.left.state, 'unsupported') })
test('all feature controls default off', () => assert.deepEqual(poolingConfig({}), { r1: false, r2: false, r3: false, synthetic: false }))
test('extensions cannot enable without R1', () => assert.equal(poolingConfig({ VITE_POOLING_R2: 'true' }).r2, false))
test('synthetic mode cannot coexist with hosted configuration', () => assert.equal(poolingConfig({ DEV: true, VITE_POOLING_SYNTHETIC: 'true', VITE_SUPABASE_URL: 'https://example.invalid' }).synthetic, false))
