import {createDecisionService} from './pooling-decision.js'
import {evaluateWeek} from '../../../src/lib/pooling/weekly.js'
export function createWeeklyService(gateway){
 return async request=>{
  if(!request || Object.keys(request).some(k=>!['clientId','expectedGeneration','operationKey','week'].includes(k)) || typeof request.clientId!=='string' || !request.clientId || !Number.isSafeInteger(request.expectedGeneration) || request.expectedGeneration<1 || typeof request.operationKey!=='string' || request.operationKey.length<8 || request.operationKey.length>150 || !request.week || !Array.isArray(request.week.constraints?.slots) || request.week.constraints.slots.length<1 || request.week.constraints.slots.length>31)throw Error('invalid_request')
  const actor=await gateway.authenticatedActor()
  if(!actor?.id || !await gateway.ownsClient(actor.id,request.clientId))throw Error('forbidden')
  const prior=await gateway.weekReceipt(request)
  if(prior)return {receipt:prior,assignment:null}
  const selection=[]
  for(const slot of request.week.constraints.slots){
   const decision=await createDecisionService(gateway)({clientId:request.clientId,draftId:slot.draftId,expectedGeneration:request.expectedGeneration})
   selection.push({draftId:slot.draftId,decisionId:decision.receipt.decisionId})
  }
  const input=await gateway.loadWeek(request)
  const result=evaluateWeek(input)
  return {receipt:await gateway.storeWeek(request,input.weekToken,result,selection),result,assignment:null}
 }
}
