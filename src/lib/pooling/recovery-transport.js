// Bind one durable operation to one verified actor, including while waiting for
// a browser lock. Authentication changes never re-home an earlier request.
import {DEFINITIVE_CODES,prepareOperation,rejectOperation,settleOperation} from './operations.js'

export class PoolingError extends Error {
  constructor(code,message,operationKey=null){super(message);this.name='PoolingError';this.code=code;this.operationKey=operationKey}
}

export async function runRecoverableOperation({scope,kind,request,storage,lock,assertScope,send}){
  let row
  try{row=await lock(()=>prepareOperation(storage,{scope,kind,request}))}
  catch(error){throw new PoolingError(DEFINITIVE_CODES.includes(error.message)?error.message:'failed_save','The recovery record could not be prepared. No new request was sent by this attempt; any earlier pending request is preserved.',request.operationKey)}
  // Outside the prepare catch: an actor change is not a failed disk write and
  // must not reject or settle the original actor's durable pending operation.
  await assertScope()
  if(row.receipt)return row.receipt
  let receipt
  try{receipt=await send()}
  catch(error){
    await assertScope()
    if(DEFINITIVE_CODES.includes(error.code)){
      try{await lock(()=>rejectOperation(storage,scope,request.operationKey,error.code))}
      catch{throw new PoolingError('outcome_unknown','The rejection could not be recorded locally. Reconcile the original operation before submitting another.',request.operationKey)}
    }
    throw error
  }
  try{await lock(()=>settleOperation(storage,scope,request.operationKey,receipt))}
  catch{throw new PoolingError('outcome_unknown','Server response received, but its local receipt was not saved. Retry the same operation.',request.operationKey)}
  // Save the receipt for its original owner even if they signed out in flight,
  // but do not expose the old response to the newly signed-in view.
  await assertScope()
  return receipt
}

export async function actorTransport(auth,actorId){
  const {data,error}=await auth.getSession()
  if(error || !data?.session?.access_token || data.session.user?.id!==actorId)throw new PoolingError('session_mismatch','Sign in as the original account to reconcile this saved operation.')
  // The access token is only used as a request header, never journaled. The
  // server still verifies it and authorizes every operation independently.
  return {Authorization:`Bearer ${data.session.access_token}`}
}
