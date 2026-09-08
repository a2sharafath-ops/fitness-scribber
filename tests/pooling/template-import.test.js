import test from 'node:test'
import assert from 'node:assert/strict'
import {templateReviewBlocks} from '../../src/lib/pooling/template-import.js'
test('template block import removes actuals, approval and private notes and gives fresh IDs',()=>{
 const input={blocks:[{blockId:'old',blockType:'Main Lifts',notes:'private',exercises:[{exerciseId:'old-ex',exerciseDbRef:'known',exerciseName:'Fictional',approved:true,sets:[{setId:'old-set',prescribedReps:0,prescribedLoadKg:0,completedReps:9,status:'Completed'}]}]}]}
 const before=structuredClone(input),output=templateReviewBlocks(input)
 assert.deepEqual(input,before);assert.notEqual(output[0].blockId,'old');assert.equal(output[0].notes,undefined)
 assert.equal(output[0].exercises[0].approved,undefined);assert.equal(output[0].exercises[0].sets[0].completedReps,null)
 assert.equal(output[0].exercises[0].sets[0].prescribedLoadKg,0)
})
test('legacy template uses explicit count, reps and rest, not automatic defaults',()=>{
 const result=templateReviewBlocks({items:[{exId:'fixture',sets:2,reps:0,rest:'0s'}]},[{id:'fixture',name:'Fictional'}])
 const exercise=result[0].exercises[0];assert.equal(exercise.unmapped,false);assert.equal(exercise.sets.length,2)
 assert.equal(exercise.sets[0].prescribedReps,0);assert.equal(exercise.sets[0].prescribedRestSeconds,0);assert.equal(exercise.sets[0].prescribedLoadKg,null)
})
test('missing count or ambiguous timed legacy dose cannot become invented repetition defaults',()=>{
 assert.throws(()=>templateReviewBlocks({items:[{name:'Fixture',reps:5}]}),/counts/)
 assert.throws(()=>templateReviewBlocks({items:[{name:'Fixture',sets:1,reps:'5 min'}]}),/timed/)
 const result=templateReviewBlocks({items:[{name:'Fixture',sets:1,reps:null}]})
 assert.equal(result[0].exercises[0].unmapped,true);assert.equal(result[0].exercises[0].sets[0].prescribedReps,null)
})
test('template preserves superset grouping using new group identity',()=>{
 const blocks=templateReviewBlocks({blocks:[{exercises:[{supersetLinkId:'old-group',sets:[]},{supersetLinkId:'old-group',sets:[]},{sets:[]}]}]})
 assert.notEqual(blocks[0].exercises[0].supersetLinkId,'old-group')
 assert.equal(blocks[0].exercises[0].supersetLinkId,blocks[0].exercises[1].supersetLinkId)
 assert.equal(blocks[0].exercises[2].supersetLinkId,null)
})
