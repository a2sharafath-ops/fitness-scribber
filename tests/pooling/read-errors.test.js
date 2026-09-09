import {test} from 'node:test'
import assert from 'node:assert/strict'
import {isReadOnlyPoolingRpc,poolingReadFailure} from '../../src/lib/pooling/read-errors.js'
test('read failures explain unavailable data, never an uncertain save',()=>{
  for(const name of ['pooling_test_status','pooling_client_runtime','pooling_review_workspace','pooling_read_extensions']){
    assert.equal(isReadOnlyPoolingRpc(name),true)
    const failure=poolingReadFailure(name)
    assert.equal(failure.code,'source_unavailable')
    assert.match(failure.message,/retry loading/)
    assert(!failure.message.includes('save outcome'))
  }
})
test('read access denial explains the correct workspace without printing backend internals',()=>{
  const failure=poolingReadFailure('pooling_read_assignments',{message:'forbidden',details:'sensitive internal data'})
  assert.equal(failure.code,'forbidden')
  assert.match(failure.message,/record owned by your sign-in/)
  assert(!failure.message.includes('sensitive'))
})
test('uncertain write and unknown RPC outcomes are not incorrectly reclassified as harmless reads',()=>{
  for(const name of ['pooling_approve','pooling_save_draft','pooling_execution','pooling_create_test_workspace','pooling_read_new_unreviewed_function']){
    assert.equal(isReadOnlyPoolingRpc(name),false)
    assert.equal(poolingReadFailure(name,{message:'timeout'}),null)
  }
})
