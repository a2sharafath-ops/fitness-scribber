import {buildSourceSnapshot} from '../../../src/lib/pooling/sources.js'
import {resolveContext} from '../../../src/lib/pooling/context.js'
export function createContextReviewService(gateway){
 return async request=>{
  if(!request || Object.keys(request).some(key=>!['clientId','draftId','expectedGeneration','operationKey','reference'].includes(key)) || typeof request.clientId!=='string' || !request.clientId || !Number.isSafeInteger(request.draftId) || request.draftId<1 || !Number.isSafeInteger(request.expectedGeneration) || request.expectedGeneration<1 || typeof request.operationKey!=='string' || request.operationKey.length<8 || request.operationKey.length>150 || typeof request.reference!=='string' || !request.reference.trim() || request.reference.length>4000)throw new Error('invalid_request')
  const actor=await gateway.authenticatedActor()
  if(!actor?.id || !await gateway.ownsClient(actor.id,request.clientId))throw new Error('forbidden')
  const prior=await gateway.contextReviewReceipt(request)
  if(prior)return {receipt:prior,assignment:null}
  const bundle=await gateway.loadContextReview(request)
  if(bundle.generation!==request.expectedGeneration)throw new Error('stale_context')
  const context=resolveContext(buildSourceSnapshot(bundle).contextInput)
  if(context.state!=='eligible_for_coach_review')throw new Error('context_held')
  const receipt=await gateway.storeContextReview(request,bundle.sourceBundleToken,context)
  return {receipt,assignment:null}
 }
}
