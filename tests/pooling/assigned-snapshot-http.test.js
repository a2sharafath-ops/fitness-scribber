import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createPoolingHandler} from '../../supabase/functions/_shared/pooling-handler.ts'
import {DEFINITIVE_CODES} from '../../src/lib/pooling/operations.js'

test('assigned snapshot rejection reaches the client as a definitive conflict, not an unknown save',async()=>{
 const handler=createPoolingHandler(()=>async()=>{throw Error('assigned_snapshot_immutable')},()=>({}))
 const response=await handler(new Request('https://local.invalid/',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}))
 assert.equal(response.status,409)
 assert.deepEqual(await response.json(),{error:'assigned_snapshot_immutable',assignment:null})
 assert(DEFINITIVE_CODES.includes('assigned_snapshot_immutable'))
})
