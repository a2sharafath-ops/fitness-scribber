import {resolveContext} from '../../../src/lib/pooling/context.js'
import {suggestSelection} from '../../../src/lib/pooling/suggestions.js'
export function createSuggestionService(gateway){return async request=>{
 if(!request || Object.keys(request).some(k=>!['clientId','draftId','expectedGeneration','operationKey','mode','occurrenceId','exerciseId'].includes(k)) || !request.clientId || typeof request.clientId!=='string' || !Number.isSafeInteger(request.draftId) || request.draftId<1 || !Number.isSafeInteger(request.expectedGeneration) || request.expectedGeneration<1 || typeof request.operationKey!=='string' || request.operationKey.length<8 || request.operationKey.length>150 || !['generate','swap'].includes(request.mode) || (request.mode==='swap' && (!request.occurrenceId || !request.exerciseId)))throw Error('invalid_request')
 const actor=await gateway.authenticatedActor()
 if(!actor?.id || !await gateway.ownsClient(actor.id,request.clientId))throw Error('forbidden')
 const prior=await gateway.suggestionReceipt(request)
 if(prior)return {receipt:prior,assignment:null}
 const snapshot=await gateway.loadSnapshot(request.clientId,request.draftId)
 if(snapshot.generation!==request.expectedGeneration || snapshot.draft.contextGeneration!==snapshot.generation)throw Error('stale_context')
 const context=resolveContext(snapshot.contextInput);if(snapshot.held!==false)context.state='held'
 const result=suggestSelection({context,request:snapshot.sessionRequest,catalogue:snapshot.catalogue,doses:snapshot.doses,manifest:snapshot.manifest,selection:snapshot.draft.selection || []},request)
 return {receipt:await gateway.storeSuggestion(request,snapshot.sourceToken,result),result,assignment:null}
}}
