import {createDecisionService} from './pooling-decision.js'
import {numericalProposal} from '../../../src/lib/pooling/numerical-proposals.js'

export function createNumericalService(gateway){
 return async request=>{
  if(!request || Object.keys(request).some(key=>!['clientId','draftId','expectedGeneration','requestId','baselineAssignmentId','policyId'].includes(key)) || !['draftId','expectedGeneration','requestId','baselineAssignmentId'].every(key=>Number.isSafeInteger(request[key]) && request[key]>0) || typeof request.policyId!=='string' || !request.policyId)throw new Error('invalid_request')
  const decision=await createDecisionService(gateway)({clientId:request.clientId,draftId:request.draftId,expectedGeneration:request.expectedGeneration})
  const input=await gateway.loadExtension(request)
  const result=numericalProposal(input)
  // Unsupported policies still yield an explainable review result, never a dose.
  const normalized={...result,policyId:input.policy.id,policyRevision:input.policy.revision}
  const receipt=await gateway.storeExtension(request,decision.receipt.decisionId,input.extensionToken,normalized)
  return {receipt,result:normalized,assignment:null}
 }
}
