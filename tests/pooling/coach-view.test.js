import test from 'node:test'
import assert from 'node:assert/strict'
import {coachDraftStatus,coachErrorMessage,coachGapText,coachLabel,coachSessionStatus,currentCoachDraft} from '../../src/lib/pooling/coach-view.js'

test('coach labels replace implementation vocabulary',()=>{
 assert.equal(coachLabel('main_accessory'),'Main exercises')
 assert.equal(coachLabel('general_fitness'),'General fitness')
})

test('completed sessions do not show stale review language',()=>{
 assert.equal(coachSessionStatus({status:'complete',stale:true},'2026-09-09').label,'Completed')
 assert.equal(coachSessionStatus({status:'assigned',stale:true},'2026-09-09').label,'Needs review')
})

test('guided draft state exposes one understandable next state',()=>{
 const draft={id:9,proposal:{selection:[{occurrenceId:'one'}]}}
 assert.equal(coachDraftStatus({draft}).step,2)
 assert.equal(coachDraftStatus({draft,decision:{result:{completeness:'ready_for_coach_review'}}}).step,3)
})

test('latest unassigned non-superseded draft is selected',()=>{
 const drafts=[{id:1,parent_id:null},{id:2,parent_id:1},{id:3,parent_id:null}]
 assert.equal(currentCoachDraft(drafts,[{draftId:3}]).id,2)
})

test('technical failures and gaps have coach-facing explanations',()=>{
 assert.match(coachErrorMessage({message:'equipment_missing'}),/equipment/i)
 assert.match(coachGapText({role:'cooldown'}),/cool-down/i)
})
