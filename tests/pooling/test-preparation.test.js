import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareFictionalScenario} from '../../src/lib/pooling/test-preparation.js'
function fixture(){
 const saved=new Map(),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)}
 let generation=1,id=0,lost=true
 const receipts=new Map(),requests=[]
 const send=async request=>{requests.push(structuredClone(request));if(receipts.has(request.operationKey))return receipts.get(request.operationKey);const receipt={id:++id,draftId:id,generation:++generation};receipts.set(request.operationKey,receipt);if(lost){lost=false;throw Error('outcome_unknown')}return receipt}
 const scenario={testOnly:true,at:'2026-09-08T00:00:00.000Z',source:{id:'test',token:'test-token'},values:{adult:true},proposal:{session:{}}}
 return {storage,saved,requests,receipts,options:{clientId:'test',count:1,scenario,storage,uuid:()=> 'fixed-operation',api:{read:async()=>({context:{generation}}),confirm:send,draft:send,review:send}}}
}
test('fictional preparation retries exact request after a lost response',async()=>{
 const f=fixture();await assert.rejects(()=>prepareFictionalScenario(f.options),/outcome_unknown/)
 const result=await prepareFictionalScenario({...f.options,scenario:{...f.options.scenario,at:'2026-09-09T00:00:00Z'}})
 assert.deepEqual(f.requests[0],f.requests[1]);assert.equal(result.drafts.length,1);assert.equal(result.sessionAt,'2026-09-08T00:00:00.000Z');assert.equal(f.saved.size,0);assert.equal(f.receipts.size,3)
})
test('fictional preparation preserves pending work when count changes',async()=>{
 const f=fixture();await assert.rejects(()=>prepareFictionalScenario(f.options),/outcome_unknown/)
 await assert.rejects(()=>prepareFictionalScenario({...f.options,count:2}),/Resume the pending/);assert.equal(f.requests.length,1)
})
test('fictional preparation refuses real client data or unavailable storage',async()=>{
 const f=fixture();await assert.rejects(()=>prepareFictionalScenario({...f.options,scenario:{...f.options.scenario,testOnly:false}}),/could not be verified/)
 await assert.rejects(()=>prepareFictionalScenario({...f.options,storage:{getItem:()=>null,setItem:()=>{throw Error('no storage')}}}),/no storage/);assert.equal(f.requests.length,0)
})
