import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSupabaseDecisionGateway } from '../../supabase/functions/_shared/pooling-gateway.js'
import {bundle} from './source-fixture.js'
test('gateway does not trust a cached/unverified session',async()=>{
 const gateway=createSupabaseDecisionGateway({userClient:{auth:{getUser:async()=>({data:{user:{id:'x'}},error:{message:'expired'}})}},serviceClient:{}})
 assert.equal(await gateway.authenticatedActor(),null);assert.equal(await gateway.ownsClient('x','c'),false)
 await assert.rejects(gateway.loadSnapshot('c',1),/forbidden/)
})
test('gateway passes only verified actor and loaded source token to storage',async()=>{
 const calls=[]
 const serviceClient={rpc:async(name,payload)=>{calls.push({name,payload});return name==='pooling_source_bundle'?{data:{...bundle(),sourceBundleToken:'synthetic-bundle-token'}}:name==='pooling_decision_input'?{data:{sourceToken:'synthetic-token'}}:{data:{decisionId:1}}}}
 const gateway=createSupabaseDecisionGateway({userClient:{auth:{getUser:async()=>({data:{user:{id:'coach'}}})}},serviceClient})
 await gateway.authenticatedActor();await gateway.loadSnapshot('c',1)
 await assert.rejects(gateway.storeDecision({actorId:'other',clientId:'c',draftId:1,expectedSourceToken:'synthetic-token'}),/forbidden/)
 const receipt=await gateway.storeDecision({actorId:'coach',clientId:'c',draftId:1,expectedSourceToken:'synthetic-token',expectedGeneration:1,expectedManifestId:'m',result:{}})
 assert.equal(receipt.decisionId,1);assert.equal(calls.at(-1).payload.verified_actor,'coach');assert.equal(calls.at(-1).payload.expected_source_token,'synthetic-token')
})
