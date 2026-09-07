import {createPoolingHandler} from '../../supabase/functions/_shared/pooling-handler.ts'
import {createDecisionService} from '../../supabase/functions/_shared/pooling-decision.js'
import {createNumericalService} from '../../supabase/functions/_shared/pooling-numerical.js'
import {createContextReviewService} from '../../supabase/functions/_shared/pooling-context-review.js'
import {createWeeklyService} from '../../supabase/functions/_shared/pooling-weekly.js'
import {createSuggestionService} from '../../supabase/functions/_shared/pooling-suggestion.js'
import {createPublicationService} from '../../supabase/functions/_shared/pooling-publication.js'
const assert=(value:unknown)=>{if(!value)throw new Error('assertion_failed')}
const request=(body:unknown)=>new Request('http://127.0.0.1/pooling',{method:'POST',body:JSON.stringify(body)})
Deno.test('HTTP method checks do not access identity or private sources',async()=>{
 const handler=createPoolingHandler(createDecisionService,()=>{throw new Error('must not construct gateway')})
 assert((await handler(new Request('http://127.0.0.1/pooling'))).status===405)
 assert((await handler(new Request('http://127.0.0.1/pooling',{method:'OPTIONS'}))).status===200)
})
Deno.test('malformed and oversized bodies fail without private reads',async()=>{
 let read=false
 const handler=createPoolingHandler(createDecisionService,()=>({authenticatedActor:()=>{read=true;throw new Error('must not read')}}))
 assert((await handler(new Request('http://127.0.0.1/pooling',{method:'POST',body:'{broken'}))).status===400)
 assert((await handler(request({tooLarge:'x'.repeat(17000)}))).status===400)
 assert(!read)
})
const base={clientId:'fictional',draftId:1,expectedGeneration:1}
const services=[
 [createDecisionService,base],
 [createNumericalService,{...base,requestId:1,baselineAssignmentId:1,policyId:'fictional'}],
 [createContextReviewService,{...base,operationKey:'fictional-operation',reference:'fictional review'}],
 [createWeeklyService,{clientId:'fictional',expectedGeneration:1,operationKey:'fictional-operation',week:{constraints:{slots:[{draftId:1}]}}}],
 [createSuggestionService,{...base,operationKey:'fictional-operation',mode:'generate'}],
 [createPublicationService,{clientId:'fictional',submissionId:1,acceptanceId:'fictional',action:'publish',reason:'fictional only'}],
] as const
Deno.test('all six services reject unverified actors before private reads',async()=>{
 for(const [service,body] of services){
  let read=false
  const gateway={authenticatedActor:async()=>null,ownsClient:async()=>{read=true;return true}}
  const response=await createPoolingHandler(service,()=>gateway)(request(body))
  assert(response.status===403);assert(!read)
 }
})
Deno.test('all six services reject another client owner before private reads',async()=>{
 for(const [service,body] of services){
  const gateway={authenticatedActor:async()=>({id:'wrong-owner'}),ownsClient:async()=>false}
  assert((await createPoolingHandler(service,()=>gateway)(request(body))).status===403)
 }
})
Deno.test('posted authority, sources and catalogue cannot override server-owned inputs',async()=>{
 for(const [service,body] of services)for(const field of ['actor','context','catalogue','sourceToken','held','assignment']){
  const checked=await createPoolingHandler(service,()=>({authenticatedActor:()=>{throw Error('must not access identity')}}))(request({...body,[field]:{forged:true}}))
  assert(checked.status===400)
 }
})
Deno.test('internal errors do not expose source notes or credentials',async()=>{
 const handler=createPoolingHandler(()=>async()=>{throw Error('PRIVATE_DETAILS')},()=>({}))
 const response=await handler(request({})),body=await response.json()
 assert(response.status===503);assert(body.error==='unavailable');assert(body.assignment===null)
})
