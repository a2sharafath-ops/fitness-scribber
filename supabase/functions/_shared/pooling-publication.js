import {validateRelease} from '../../../src/lib/pooling/catalogue.js'
export function createPublicationService(gateway){return async request=>{
 if(!request || Object.keys(request).some(k=>!['clientId','submissionId','acceptanceId','action','reason'].includes(k)) || typeof request.clientId!=='string' || !request.clientId || !Number.isSafeInteger(request.submissionId) || request.submissionId<1 || typeof request.acceptanceId!=='string' || !request.acceptanceId || !['publish','revoke'].includes(request.action) || typeof request.reason!=='string' || !request.reason.trim())throw Error('invalid_request')
 const actor=await gateway.authenticatedActor()
 if(!actor?.id || !await gateway.ownsClient(actor.id,request.clientId))throw Error('forbidden')
 const input=await gateway.loadPublication(request)
 if(request.action==='publish' && !validateRelease(input.document).valid)throw Error('invalid_release')
 return {receipt:await gateway.applyPublication(request,input.digest),assignment:null}
}}
