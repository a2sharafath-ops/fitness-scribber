import test from 'node:test'
import assert from 'node:assert/strict'
import { legacyCoachingNotice } from '../../src/lib/pooling/legacy-coaching.js'
test('unknown readiness cannot produce legacy progression encouragement', () => {
  for (const readinessScore of [null, undefined, NaN, Infinity]) {
    const notice = legacyCoachingNotice({ readinessScore })
    assert.equal(notice.t, 'info')
    assert.equal(notice.h, 'Readiness not established')
  }
  assert.equal(legacyCoachingNotice({ readinessScore: 0 }), null)
})
test('pooling mode replaces legacy numerical and AI advice regardless of readiness', () => {
  for (const readinessScore of [null, 0, 80, 100]) assert.equal(legacyCoachingNotice({ poolingEnabled: true, readinessScore }).h, 'Coach-reviewed recommendations')
})
