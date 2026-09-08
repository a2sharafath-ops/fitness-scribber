import test from 'node:test'
import assert from 'node:assert/strict'
import {mergeParsedBlocks} from '../../src/lib/merge-parsed-blocks.js'
test('repeated updater evaluation does not duplicate parsed exercises or mutate either input',()=>{
 const current=[{blockType:'main',exercises:[{exerciseName:'existing',sets:[{reps:1}]}]}]
 const parsed=[{blockType:'main',exercises:[{exerciseName:'fictional',sets:[{reps:2}]}]}]
 const before=structuredClone({current,parsed}),first=mergeParsedBlocks(current,parsed),second=mergeParsedBlocks(current,parsed)
 assert.deepEqual(first,second);assert.equal(first[0].exercises.length,2);assert.deepEqual({current,parsed},before)
 first[0].exercises[1].sets[0].reps=99;assert.deepEqual({current,parsed},before)
})
