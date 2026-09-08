import test from 'node:test'
import assert from 'node:assert/strict'
import {PoolingError,runRecoverableOperation,actorTransport} from '../../src/lib/pooling/recovery-transport.js'
import {OPERATION_KEY,pendingOperations,prepareOperation} from '../../src/lib/pooling/operations.js'

function fixture(){
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}
  let actor='a',sent=0,rows=0
  const receipts=new Map(),request={clientId:'c',operationKey:'unique-operation',kind:'actual',payload:{actual:0}}
  const options={scope:'a:c',kind:'execution',request,storage,lock:fn=>fn(),assertScope:async()=>{if(actor!=='a')throw new PoolingError('session_mismatch','Changed account')},send:async()=>{sent++;if(!receipts.has(request.operationKey))receipts.set(request.operationKey,{status:'committed',id:++rows});return receipts.get(request.operationKey)}}
  return {options,storage,request,receipts,switchActor:value=>{actor=value},counts:()=>({sent,rows})}
}
test('receipt-loss retry retains zero, original key and exactly one committed record',async()=>{
  const f=fixture(),send=f.options.send
  await assert.rejects(runRecoverableOperation({...f.options,send:async()=>{await send();throw new PoolingError('outcome_unknown','Dropped response')}}),{code:'outcome_unknown'})
  assert.equal(pendingOperations(f.storage,'a:c')[0].request.payload.actual,0)
  const receipt=await runRecoverableOperation(f.options)
  assert.equal(receipt.id,1);assert.deepEqual(f.counts(),{sent:2,rows:1})
  await runRecoverableOperation(f.options);assert.equal(f.counts().sent,2)
})
test('quota before write-ahead record sends no request',async()=>{
  const f=fixture();f.storage.setItem=()=>{throw new DOMException('Full','QuotaExceededError')}
  await assert.rejects(runRecoverableOperation(f.options),{code:'failed_save'})
  assert.deepEqual(f.counts(),{sent:0,rows:0})
})
test('quota after server commit preserves pending key for exact reconciliation',async()=>{
  const f=fixture(),write=f.storage.setItem;let count=0
  f.storage.setItem=(...args)=>{if(++count===2)throw Error('quota');write(...args)}
  await assert.rejects(runRecoverableOperation(f.options),{code:'outcome_unknown'})
  assert.equal(pendingOperations(f.storage,'a:c').length,1)
  await runRecoverableOperation(f.options);assert.deepEqual(f.counts(),{sent:2,rows:1})
})
test('actor switch while waiting for Web Lock never sends or rejects original operation',async()=>{
  const f=fixture()
  await assert.rejects(runRecoverableOperation({...f.options,lock:fn=>{const value=fn();f.switchActor('b');return value}}),{code:'session_mismatch'})
  assert.deepEqual(f.counts(),{sent:0,rows:0});assert.equal(pendingOperations(f.storage,'a:c').length,1)
})
test('same key cannot be re-homed under another actor or client',()=>{
  const f=fixture();prepareOperation(f.storage,{scope:'a:c',kind:'execution',request:f.request})
  const before=f.storage.getItem(OPERATION_KEY)
  assert.throws(()=>prepareOperation(f.storage,{scope:'b:c',kind:'execution',request:f.request}),/session_mismatch/)
  assert.equal(f.storage.getItem(OPERATION_KEY),before)
})
test('account switch in flight records original receipt but returns no old result to new account',async()=>{
  const f=fixture(),send=f.options.send
  await assert.rejects(runRecoverableOperation({...f.options,send:async()=>{const r=await send();f.switchActor('b');return r}}),{code:'session_mismatch'})
  assert.equal(pendingOperations(f.storage,'a:c').length,0)
  f.switchActor('a');assert.equal((await runRecoverableOperation(f.options)).id,1);assert.equal(f.counts().sent,1)
})
test('account switch plus forbidden response does not reject original pending evidence',async()=>{
  const f=fixture()
  await assert.rejects(runRecoverableOperation({...f.options,send:async()=>{f.switchActor('b');throw new PoolingError('forbidden','Other actor')}}),{code:'session_mismatch'})
  assert.equal(pendingOperations(f.storage,'a:c').length,1)
})
test('definitive stale rejection is retained and not retried',async()=>{
  const f=fixture();let sent=0
  const options={...f.options,send:async()=>{sent++;throw new PoolingError('stale_context','Stale')}}
  await assert.rejects(runRecoverableOperation(options),{code:'stale_context'})
  await assert.rejects(runRecoverableOperation(options),{code:'stale_context'});assert.equal(sent,1)
})
test('transport takes current token only for the verified original actor',async()=>{
  let user='a',token='refreshed-test-token'
  const auth={getSession:async()=>({data:{session:{user:{id:user},access_token:token}}})}
  assert.deepEqual(await actorTransport(auth,'a'),{Authorization:'Bearer refreshed-test-token'})
  user='b';await assert.rejects(actorTransport(auth,'a'),{code:'session_mismatch'})
  user='a';token=null;await assert.rejects(actorTransport(auth,'a'),{code:'session_mismatch'})
})
test('expired-session transport failure preserves the exact original pending request',async()=>{
  const f=fixture()
  await assert.rejects(runRecoverableOperation({...f.options,send:async()=>{throw new PoolingError('outcome_unknown','401 expired JWT')}}),{code:'outcome_unknown'})
  assert.deepEqual(pendingOperations(f.storage,'a:c')[0].request,f.request)
  await runRecoverableOperation(f.options);assert.deepEqual(f.counts(),{sent:1,rows:1})
})
