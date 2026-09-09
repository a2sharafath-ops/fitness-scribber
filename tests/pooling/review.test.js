import test from 'node:test'
import assert from 'node:assert/strict'
import {canonicalProposal,selectionDiff,currentUnassignedDrafts,independentReviewProposal,draftReviewDecision} from '../../src/lib/pooling/review.js'
const input=()=>({date:'2026-09-07',sessionAt:'2026-09-07T10:00:00+05:30',timeZone:'Asia/Kolkata',manifestId:'fictional',request:{setting:'home',level:'beginner',budgetSeconds:300,roles:[{id:'main',required:true}]},selection:[{occurrenceId:'one',role:'main',exerciseId:'fictional-exercise',exerciseRevision:1,doseId:'fictional-dose',doseRevision:1}]})
test('unassigned summary excludes assigned and superseded drafts without removing history',()=>{
 const drafts=[{id:1},{id:2,parent_id:1},{id:3},{operationKey:'local'}]
 assert.deepEqual(currentUnassignedDrafts(drafts,[{draftId:2}]),[drafts[2],drafts[3]])
 assert.equal(drafts.length,4)
})
test('canonical editor retains exact revisions and never claims approval',()=>{
 const value=canonicalProposal(input());assert.equal(value.selection[0].doseRevision,1);assert.equal(value.session.sessionAt,'2026-09-07T04:30:00.000Z');assert.equal(value.assignment,undefined)
})
test('assigned history uses the pinned decision, never a later validation',()=>{
 const decisions=[{id:46,draftId:80},{id:45,draftId:80}]
 const assignments=[{id:23,draftId:80,decisionId:45}]
 assert.equal(draftReviewDecision(80,decisions,assignments),decisions[1])
 assert.equal(draftReviewDecision(80,decisions),decisions[0])
 assert.equal(draftReviewDecision(80,[decisions[0]],assignments),undefined)
 assert.equal(draftReviewDecision(80,[{id:45,draftId:81}],assignments),undefined)
})
test('independent review copy retains comparable inputs but never approval, results or superseding lineage',()=>{
 const original={...canonicalProposal(input()),assignmentId:23,actuals:[{actual:1}],parentId:80,source:'daily_review_proposal'}
 const copy=independentReviewProposal(original)
 assert.deepEqual(copy.selection,original.selection)
 assert.deepEqual(copy.session,original.session)
 assert.equal(copy.assignmentId,undefined);assert.equal(copy.actuals,undefined);assert.equal(copy.parentId,undefined)
 copy.selection[0].doseRevision=2
 assert.equal(original.selection[0].doseRevision,1)
})
test('timezone date mismatch is not silently moved to another day',()=>{
 const value=input();value.sessionAt='2026-09-07T23:00:00Z';assert.throws(()=>canonicalProposal(value),/must agree/)
})
test('missing dose and duplicate occurrences cannot form canonical proposals',()=>{
 const value=input();value.selection[0].doseRevision=null;assert.throws(()=>canonicalProposal(value),/exact variant/)
 const duplicate=input();duplicate.selection.push({...duplicate.selection[0]});assert.throws(()=>canonicalProposal(duplicate),/distinct exercise/)
})
test('revision changes are visible even when exercise names are unchanged',()=>{
 const before=input().selection,after=structuredClone(before);after[0].doseRevision=2
 assert.equal(selectionDiff(before,after)[0].kind,'changed');assert.deepEqual(selectionDiff(before,structuredClone(before)),[])
})
