import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDecisionService } from '../../supabase/functions/_shared/pooling-decision.js'
import { evaluateDraft } from '../../src/lib/pooling/decision.js'

test('legacy/manual draft is blocked until canonical identity and dose review',()=>{
  const result=evaluateDraft({context:{state:'eligible_for_coach_review'},selection:undefined})
  assert.equal(result.completeness,'blocked');assert.equal(result.assignment,null)
})
test('unauthorized actor cannot cause private snapshot read',async()=>{
  let reads=0
  const decide=createDecisionService({authenticatedActor:async()=>({id:'other'}),ownsClient:async()=>false,loadSnapshot:async()=>{reads++}})
  await assert.rejects(decide({clientId:'synthetic',draftId:1,expectedGeneration:1}),/forbidden/);assert.equal(reads,0)
})
test('client-posted catalogue/context cannot replace trusted source input',async()=>{
  const decide=createDecisionService({})
  await assert.rejects(decide({clientId:'synthetic',draftId:1,expectedGeneration:1,context:{held:false}}),/invalid_request/)
})
test('stale snapshot cannot produce decision evidence',async()=>{
  const decide=createDecisionService({authenticatedActor:async()=>({id:'coach'}),ownsClient:async()=>true,loadSnapshot:async()=>({clientId:'synthetic',generation:2,draft:{id:1,clientId:'synthetic',contextGeneration:1}})})
  await assert.rejects(decide({clientId:'synthetic',draftId:1,expectedGeneration:1}),/stale_context/)
})
test('unpublished module policy cannot grant decision readiness',async()=>{
  const decide=createDecisionService({authenticatedActor:async()=>({id:'coach'}),ownsClient:async()=>true,loadSnapshot:async()=>({clientId:'synthetic',generation:1,draft:{id:1,clientId:'synthetic',contextGeneration:1},modulePolicy:{reviewStatus:'draft'}})})
  await assert.rejects(decide({clientId:'synthetic',draftId:1,expectedGeneration:1}),/unsupported_policy/)
})

function fixture() {
 const record=(id,extra={})=>({id,revision:1,reviewStatus:'published',automationEligible:true,rightsStatus:'accepted',approvalEvidence:['content','rights','scope'].map(kind=>({kind,decision:'accepted',reviewerId:'fictional',reference:'synthetic-only',revision:1})),...extra})
 const exercise=record('synthetic-ex',{scopes:['adult_general_fitness'],settings:['home'],levels:['beginner'],equipment:[],prerequisites:[],demands:[],roles:['main'],doseRefs:['synthetic-dose']})
 const dose=record('synthetic-dose',{sets:1,workSeconds:1,restSeconds:0,setupSeconds:0,transitionSeconds:0,sideMultiplier:1})
 const modulePolicy=record('synthetic-policy',{requiredFields:[],requiredRoles:['main'],scope:'adult_general_fitness'})
 return {clientId:'synthetic',generation:1,held:false,sourceToken:'synthetic-only-source-token',modulePolicy,manifest:{id:'synthetic-manifest',state:'published',releaseEvidence:'synthetic-only',records:[exercise,dose,modulePolicy].map(({id,revision})=>({id,revision}))},
  draft:{id:1,clientId:'synthetic',contextGeneration:1,notes:'private-test-note',selection:[{occurrenceId:'occ1',exerciseId:exercise.id,exerciseRevision:1,role:'main',doseId:dose.id,doseRevision:1}]},
  contextInput:{sessionAt:'2026-09-07T12:00:00Z',knowledgeCutoff:'2026-09-07T12:00:00Z',timeZone:'UTC',healthChange:'no_change',adultConfirmed:true,purposePermitted:true,scope:'adult_general_fitness',requirements:[]},
  sessionRequest:{scope:'adult_general_fitness',setting:'home',level:'beginner',equipmentConfirmed:true,equipment:[],roles:[{id:'main',required:true}],budgetSeconds:10},catalogue:[exercise],doses:[dose]}
}
test('trusted orchestration evaluates exact selection and sends hashed revision check',async()=>{
 const snapshot=fixture();let stored
 const decide=createDecisionService({authenticatedActor:async()=>({id:'coach'}),ownsClient:async()=>true,loadSnapshot:async()=>snapshot,storeDecision:async value=>{stored=value;return {id:'synthetic-receipt'}}})
 const result=await decide({clientId:'synthetic',draftId:1,expectedGeneration:1})
 assert.equal(result.result.completeness,'ready_for_coach_review');assert.equal(result.assignment,null)
 assert.equal(stored.expectedGeneration,1);assert.match(stored.expectedDraftDigest,/^[a-f0-9]{64}$/);assert(!JSON.stringify(stored).includes('private-test-note'))
})
test('storage race rejection is propagated, not reported as success',async()=>{
 const decide=createDecisionService({authenticatedActor:async()=>({id:'coach'}),ownsClient:async()=>true,loadSnapshot:async()=>fixture(),storeDecision:async()=>{throw new Error('stale_context')}})
 await assert.rejects(decide({clientId:'synthetic',draftId:1,expectedGeneration:1}),/stale_context/)
})
test('approved module requirements cannot be removed from the snapshot request',async()=>{
 const snapshot=fixture();snapshot.modulePolicy.requiredRoles.push('required-extra')
 const decide=createDecisionService({authenticatedActor:async()=>({id:'coach'}),ownsClient:async()=>true,loadSnapshot:async()=>snapshot})
 await assert.rejects(decide({clientId:'synthetic',draftId:1,expectedGeneration:1}),/unsupported_policy/)
})
test('unknown proposed variant is not silently replaced with an eligible alternative',async()=>{
 const snapshot=fixture();snapshot.draft.selection[0].exerciseId='not-in-catalogue'
 const decide=createDecisionService({authenticatedActor:async()=>({id:'coach'}),ownsClient:async()=>true,loadSnapshot:async()=>snapshot,storeDecision:async()=>({id:'synthetic'})})
 const result=await decide({clientId:'synthetic',draftId:1,expectedGeneration:1});assert.equal(result.result.completeness,'blocked');assert.equal(result.result.blocks.length,0)
})
test('authoritative held state wins over otherwise eligible normalized inputs',async()=>{
 const snapshot=fixture();snapshot.held=true
 const decide=createDecisionService({authenticatedActor:async()=>({id:'coach'}),ownsClient:async()=>true,loadSnapshot:async()=>snapshot,storeDecision:async()=>({id:'synthetic'})})
 const result=await decide({clientId:'synthetic',draftId:1,expectedGeneration:1});assert.equal(result.result.completeness,'blocked');assert.equal(result.result.sessionState,'held')
})
