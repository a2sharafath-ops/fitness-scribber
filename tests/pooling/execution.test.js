import { test } from 'node:test'
import assert from 'node:assert/strict'
import { executionAvailability, stoppedSnapshot } from '../../src/lib/pooling/execution.js'
test('new starts and approvals cannot be enabled by a browser flag',()=>{
 for(const operation of ['approve','start','resume']) assert.equal(executionAvailability({enabled:true,operation}).allowed,false)
})
test('stop and history remain possible while authority is unverified',()=>{
 for(const operation of ['stop','record_actual','read_history']) assert.equal(executionAvailability({enabled:true,operation}).allowed,true)
})
test('feature off retains Classic routing',()=>assert.equal(executionAvailability({enabled:false,operation:'start'}).path,'classic'))
test('stop snapshot retains targets and actuals without mutating source',()=>{
 const workout={id:'synthetic',status:'in_progress',main:[{target:10,actual:0}],blocks:[{sets:[{completedReps:5}]}]}
 const before=structuredClone(workout),stopped=stoppedSnapshot(workout)
 assert.deepEqual(workout,before);assert.deepEqual(stopped.main,workout.main);assert.deepEqual(stopped.blocks,workout.blocks);assert.equal(stopped.status,'stopped')
})
