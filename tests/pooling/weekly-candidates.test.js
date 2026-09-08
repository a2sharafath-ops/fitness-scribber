import test from 'node:test'
import assert from 'node:assert/strict'
import {currentWeeklyCandidates} from '../../src/lib/pooling/weekly-candidates.js'
const draft = (id, extra = {}) => ({id, context_generation: 4, proposal: {manifestId: 'fictional', selection: [{occurrenceId: 'test'}]}, ...extra})

test('weekly choices exclude stale, assigned, superseded and different-release drafts without mutation', () => {
 const drafts = [draft(1), draft(2, {context_generation: 3}), draft(3), draft(4), draft(5, {parent_id: 4}), draft(6, {proposal: {manifestId: 'other', selection: [{}]}})]
 const before = structuredClone(drafts)
 assert.deepEqual(currentWeeklyCandidates(drafts, [{draftId: 3}], 4, 'fictional').map(d => d.id), [1, 5])
 assert.deepEqual(drafts, before)
})

test('weekly choices wait for a known generation and selected release', () => {
 assert.deepEqual(currentWeeklyCandidates([draft(1)], [], undefined, 'fictional'), [])
 assert.deepEqual(currentWeeklyCandidates([draft(1)], [], 4, ''), [])
 assert.deepEqual(currentWeeklyCandidates([draft(1, {proposal: {manifestId: 'fictional', selection: []}})], [], 4, 'fictional'), [])
})
