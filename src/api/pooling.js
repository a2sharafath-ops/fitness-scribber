import { supabase } from '../lib/supabase'
import { builderDraft, builderDraftState, readLocalDrafts, saveLocalDraft } from '../lib/pooling/drafts'
import {canonical} from '../lib/pooling/context'
import {validateConfirmation} from '../lib/pooling/sources'
import {OPERATION_KEY,DEFINITIVE_CODES,pendingOperations} from '../lib/pooling/operations'
import {createJournalIdentity} from '../lib/pooling/journal-identity'
import {PoolingError,runRecoverableOperation,actorTransport} from '../lib/pooling/recovery-transport'
import {poolingReadFailure} from '../lib/pooling/read-errors'
const journalActor=supabase?createJournalIdentity(supabase.auth):null
export {PoolingError}

const known = DEFINITIVE_CODES
export const readClientRuntime=clientId=>rpc('pooling_client_runtime',{target_client:clientId})
export const readDevelopmentContext=clientId=>rpc('pooling_development_context',{target_client:clientId})
export const readCoachSessions=()=>rpc('pooling_coach_sessions',{})
export const prepareClient=request=>recoverable('preparation',request.clientId,request,headers=>rpc('pooling_prepare_client',{target_client:request.clientId,expected_generation:request.generation,operation_key:request.operationKey,proposal:request.proposal,observations:request.observations},headers))
export const setDevelopment=request=>recoverable('development_mode',request.clientId,request,headers=>rpc('pooling_set_development',{target_client:request.clientId,enabled:request.enabled,operation_key:request.operationKey},headers))
export const readActorRuntime=()=>rpc('pooling_actor_runtime',{})
export const readTestStatus=()=>rpc('pooling_test_status',{})
export const createTestWorkspace=acknowledged=>rpc('pooling_create_test_workspace',{acknowledged})
export const revokeTestWorkspace=clientId=>rpc('pooling_revoke_test_workspace',{target_client:clientId})
export const readTestScenario=clientId=>rpc('pooling_test_scenario',{target_client:clientId})
export async function readCatalogueDrafts() {
  const { default: candidateCatalogue } = await import('../../docs/exercise-pooling/catalogues/exercises.draft.json')
  return structuredClone(candidateCatalogue.exercises)
}
export async function readExtensionPolicies() {
  const [{default:daily},{default:progression}]=await Promise.all([
    import('../../docs/exercise-pooling/catalogues/daily-adjustment.draft.json'),
    import('../../docs/exercise-pooling/catalogues/progression-planning.draft.json'),
  ])
  return structuredClone({daily,progression})
}
const extensionKey = kind => {
  if (!['daily','progression'].includes(kind)) throw new PoolingError('invalid_request','Unknown review request kind.')
  return `fitscribe_pooling_${kind}_v1`
}
export async function readExtensionRequests(clientId,kind) {
  if (supabase) return rpc('pooling_read_extensions',{target_client:clientId,request_kind:kind})
  try { return readLocalDrafts(localStorage,extensionKey(kind)).records.filter(row=>row.clientId===clientId) }
  catch { throw new PoolingError('source_unavailable','Local review requests could not be read; existing data is preserved.') }
}
export async function saveExtensionRequest({clientId,kind,operationKey,proposal,generation}) {
  if (supabase) return recoverable('extension',clientId,{clientId,kind,operationKey,proposal,generation},headers=>rpc('pooling_request_extension',{target_client:clientId,expected_generation:generation,operation_key:operationKey,proposal},headers))
  const key=extensionKey(kind)
  if (!proposal || Object.keys(proposal).some(key=>!['kind','date','requestedChange','blocks','authority','state'].includes(key)) || proposal.kind!==kind || typeof proposal.requestedChange!=='string' || !proposal.requestedChange.trim() || proposal.requestedChange.length>4000 || !Array.isArray(proposal.blocks) || proposal.blocks.length || proposal.authority!=='none' || proposal.state!=='review_requested') throw new PoolingError('invalid_request','Review requests cannot contain assignments or invalid fields.')
  builderDraft({date:proposal.date,blocks:[]})
  const write=()=>{
    const records=readLocalDrafts(localStorage,key).records.filter(row=>row.clientId===clientId && row.proposal.date===proposal.date)
    const expectedRevision=Math.max(0,...records.map(row=>row.revision))
    try { return saveLocalDraft(localStorage,{clientId,operationKey,proposal,expectedRevision,recordedAt:new Date().toISOString()},key) }
    catch { throw new PoolingError('failed_save','Review request was not confirmed saved. Retry keeps the original operation key.',operationKey) }
  }
  return navigator.locks ? navigator.locks.request(key,write) : write()
}
function connection() {
  if (!supabase || (typeof navigator !== 'undefined' && navigator.onLine === false)) throw new PoolingError('unavailable', 'An online backend connection is required. No approval or assignment was made.')
  return supabase
}
async function rpc(name, payload, headers) {
  const client = connection()
  let result
  try {
    const query=client.rpc(name,payload)
    if(headers)for(const [key,value]of Object.entries(headers))query.setHeader(key,value)
    result=await query
  }
  catch {
    const failure=poolingReadFailure(name)
    if(failure)throw new PoolingError(failure.code,failure.message)
    throw new PoolingError('outcome_unknown', 'The save outcome is unknown. Reconcile or retry using the same operation key.', payload.operation_key)
  }
  if (result.error) {
    const failure=poolingReadFailure(name,result.error)
    if(failure)throw new PoolingError(failure.code,failure.message)
    const code = known.find(value => result.error.message === value)
    if (code) throw new PoolingError(code, code.replaceAll('_',' '), payload.operation_key)
    throw new PoolingError('outcome_unknown', 'The backend could not confirm this operation. Keep the same operation key when checking or retrying.', payload.operation_key)
  }
  return result.data
}
export async function readPooling(clientId) {
  const backend = connection()
  const queries = await Promise.all([
    backend.from('pooling_contexts').select('client_id,generation,held,updated_at').eq('client_id',clientId).maybeSingle(),
    backend.from('pooling_reports').select('id,field,value,effective_at,recorded_at,reporter_kind,generation').eq('client_id',clientId).order('recorded_at',{ ascending:false }),
    backend.from('pooling_drafts').select('id,revision,context_generation,parent_id,proposal,state,created_at').eq('client_id',clientId).order('id',{ ascending:false }),
  ])
  if (queries.some(query => query.error)) throw new PoolingError('source_unavailable', 'Pooling data could not be loaded. Missing data is not a normal assessment result.')
  return { context: queries[0].data, reports: queries[1].data, drafts: queries[2].data }
}
export function submitPoolingReport({ clientId, generation, operationKey, field, value, effectiveAt }) {
  const request={clientId,generation,operationKey,field,value,effectiveAt}
  return recoverable('report',clientId,request,headers=>rpc('pooling_submit_report', { target_client: clientId, expected_generation: generation, operation_key: operationKey, report_field: field, report_value: value, effective_at: effectiveAt },headers))
}
export function savePoolingDraft({ clientId, generation, operationKey, proposal, parentId = null },headers) {
  return rpc('pooling_save_draft', { target_client: clientId, expected_generation: generation, operation_key: operationKey, proposal, parent_id: parentId },headers)
}

export async function readBuilderDrafts(clientId) {
  if (supabase) return (await readPooling(clientId)).drafts
  try { return readLocalDrafts(localStorage).records.filter(record => record.clientId === clientId) }
  catch { throw new PoolingError('source_unavailable', 'Local drafts could not be read. Existing storage has not been replaced.') }
}

export async function readBuilderDraftState(clientId, date) {
  const data = supabase ? await readPooling(clientId) : { drafts: await readBuilderDrafts(clientId), context: null }
  return builderDraftState({...data,date})
}

export async function saveBuilderDraft({ clientId, operationKey, proposal, expectedRevision, generation, parentId },headers) {
  if (supabase) return savePoolingDraft({ clientId, operationKey, proposal, generation, parentId },headers)
  const write = () => {
    try { return saveLocalDraft(localStorage, { clientId, operationKey, proposal, expectedRevision, recordedAt: new Date().toISOString() }) }
    catch (error) {
      const code = ['draft_conflict','idempotency_conflict','outcome_unknown'].includes(error.message) ? error.message : 'failed_save'
      throw new PoolingError(code, code === 'failed_save' ? 'Draft was not durably saved. Keep this window open and check local storage availability.' : error.message.replaceAll('_',' '), operationKey)
    }
  }
  return navigator.locks ? navigator.locks.request('fitscribe-pooling-drafts', write) : write()
}

async function journalScope(clientId){
 if(!supabase)return `local:${clientId}`
 try{return `${await journalActor()}:${clientId}`}catch{throw new PoolingError('forbidden','Sign in again before reconciling the operation.')}
}
const journalWrite=write=>typeof navigator!=='undefined' && navigator.locks?navigator.locks.request(OPERATION_KEY,write):Promise.reject(new PoolingError('unavailable','Durable operation recovery requires a browser with Web Locks on a secure origin. No new request was sent.'))
export async function readPendingBuilderOperations(clientId){
 try{return pendingOperations(localStorage,await journalScope(clientId)).filter(row=>row.kind==='draft')}
 catch(error){throw new PoolingError('source_unavailable',error.message)}
}
export async function saveRecoverableBuilderDraft(request){
 return recoverable('draft',request.clientId,request,async headers=>{
   const receipt=await saveBuilderDraft(request,headers)
   return {...receipt,status:receipt.status || 'saved'}
 })
}

export async function readSourceReview(db,clientId){
 if(supabase)return rpc('pooling_read_source_review',{target_client:clientId})
 const sources=[]
 for(const source of ['clients','assessments','screenings','wellness','wearable','concerns','maxes','workouts']){
   for(const row of (db[source] || []).filter(row=>source==='clients'?row.id===clientId:row.clientId===clientId)){
     const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(row)))
     sources.push({source,id:row.id,status:'loaded',token:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')})
   }
 }
 return {sources,confirmations:readLocalDrafts(localStorage,'fitscribe_pooling_sources_v1').records.filter(row=>row.clientId===clientId)}
}
export async function confirmPoolingSource({clientId,generation,operationKey,observation}){
 const normalized=validateConfirmation(observation)
 if(supabase)return recoverable('confirmation',clientId,{clientId,generation,operationKey,observation:normalized},headers=>rpc('pooling_confirm_source',{target_client:clientId,expected_generation:generation,operation_key:operationKey,observation:normalized},headers))
 const key='fitscribe_pooling_sources_v1',proposal={date:normalized.effectiveAt.slice(0,10),observation:normalized}
 const write=()=>{const rows=readLocalDrafts(localStorage,key).records.filter(row=>row.clientId===clientId && row.proposal.date===proposal.date);return saveLocalDraft(localStorage,{clientId,operationKey,proposal,expectedRevision:Math.max(0,...rows.map(row=>row.revision)),recordedAt:new Date().toISOString()},key)}
 return navigator.locks?navigator.locks.request(key,write):write()
}
export const readAssignments=clientId=>rpc('pooling_read_assignments',{target_client:clientId})
export const approveDraft=request=>recoverable('approve',request.clientId,request,headers=>rpc('pooling_approve',{target_client:request.clientId,draft_id:request.draftId,decision_id:request.decisionId,expected_generation:request.generation,operation_key:request.operationKey},headers))
export const recordExecution=request=>recoverable('execution',request.clientId,request,headers=>rpc('pooling_execution',{assignment_id:request.assignmentId,expected_generation:request.generation,operation_key:request.operationKey,event_kind:request.kind,event_payload:request.payload},headers))
export async function readPendingOperations(clientId){return pendingOperations(localStorage,await journalScope(clientId))}
async function recoverable(kind,clientId,request,send){
 if(!clientId)throw new PoolingError('invalid_request','Client context is required.')
 const scope=await journalScope(clientId)
 const assertScope=async()=>{if(await journalScope(clientId)!==scope)throw new PoolingError('session_mismatch','Sign in as the original account to reconcile this saved operation.',request.operationKey)}
 return runRecoverableOperation({scope,kind,request,storage:localStorage,lock:journalWrite,assertScope,send:async()=>{
   const headers=supabase?await actorTransport(supabase.auth,scope.slice(0,-String(clientId).length-1)):undefined
   await assertScope()
   return send(headers)
 }})
}
export async function decideDraft({clientId,draftId,generation}){
 const {data,error}=await connection().functions.invoke('pooling-decision',{body:{clientId,draftId,expectedGeneration:generation}})
 if(error || !data?.receipt?.decisionId)throw new PoolingError('unavailable','Decision could not be verified. No assignment was made.')
 return data
}
export const readReviewWorkspace=clientId=>supabase?rpc('pooling_review_workspace',{target_client:clientId}):Promise.resolve({manifests:[],decisions:[],assignments:[]})
export const approveBatch=request=>recoverable('batch',request.clientId,request,headers=>rpc('pooling_approve_batch',{target_client:request.clientId,expected_generation:request.generation,operation_key:request.operationKey,selection:request.selection},headers))
export const reviewExtension=request=>recoverable('extension_review',request.clientId,request,headers=>rpc('pooling_review_extension',{target_client:request.clientId,request_id:request.requestId,expected_generation:request.generation,operation_key:request.operationKey,action:request.action,reason:request.reason,proposal_id:request.proposalId || null,amended_draft:request.amendedDraft || null},headers))
export async function retryPendingOperation(row){
 if(!row?.request?.clientId || row.scope!==await journalScope(row.request.clientId))throw new PoolingError('session_mismatch','This pending operation belongs to a different account or client. Its saved request is preserved.')
const handlers={preparation:prepareClient,development_mode:setDevelopment,draft:saveRecoverableBuilderDraft,confirmation:confirmPoolingSource,report:submitPoolingReport,execution:recordExecution,approve:approveDraft,batch:approveBatch,extension:saveExtensionRequest,extension_review:reviewExtension,legacy_stop:stopLegacy,consent:recordConsent,context_review:reviewContext,weekly:generateWeek,week_approve:approveWeek,suggestion:generateSuggestion,reassessment:requestReassessment,catalogue_submission:submitCatalogue,publication:applyPublication}
 if(!handlers[row.kind])throw new PoolingError('unavailable','This operation requires a supported recovery handler. Its saved request is preserved.')
 return handlers[row.kind](row.request)
}
export async function generateExtension(request){
 const {data,error}=await connection().functions.invoke('pooling-extension',{body:request})
 if(error || !data?.receipt?.id)throw new PoolingError('unavailable','Numerical proposal could not be verified. No assignment or target change was made.')
 return data
}
export const readClientHome=clientId=>rpc('pooling_client_home',{target_client:clientId})
export const readWeeks=clientId=>rpc('pooling_read_weeks',{target_client:clientId})
export const readSuggestions=clientId=>rpc('pooling_read_suggestions',{target_client:clientId})
export const readCatalogueAdmin=clientId=>rpc('pooling_read_catalogue_admin',{target_client:clientId})
export const submitCatalogue=request=>recoverable('catalogue_submission',request.clientId,request,headers=>rpc('pooling_submit_catalogue',{target_client:request.clientId,operation_key:request.operationKey,release_document:request.document,review_note:request.note},headers))
export const applyPublication=request=>recoverable('publication',request.clientId,request,async headers=>{
 const {operationKey:_,...body}=request
 const {data,error}=await connection().functions.invoke('pooling-publication',{body,headers})
 if(error || !data?.receipt){
  let code
  try{const result=await error?.context?.clone().json();if(known.includes(result?.error))code=result.error}catch{/* Preserve the exact release request. */}
  throw new PoolingError(code || 'outcome_unknown',code?.replaceAll('_',' ') || 'Release action outcome unknown. Reconcile the original request.',request.operationKey)
 }
 return data.receipt
})
export const readReassessments=clientId=>rpc('pooling_read_reassessments',{target_client:clientId})
export const requestReassessment=request=>recoverable('reassessment',request.clientId,request,headers=>rpc('pooling_request_reassessment',{target_client:request.clientId,operation_key:request.operationKey,review_request:request.review},headers))
export const generateSuggestion=request=>recoverable('suggestion',request.clientId,request,async headers=>{
 const {generation,...body}=request
 const {data,error}=await connection().functions.invoke('pooling-suggestion',{body:{...body,expectedGeneration:generation},headers})
 if(error || !data?.receipt){
  let code
  try{const result=await error?.context?.clone().json();if(known.includes(result?.error))code=result.error}catch{/* Keep unknown operation pending. */}
  throw new PoolingError(code || 'outcome_unknown',code?.replaceAll('_',' ') || 'Suggestion outcome unknown. Reconcile the original request.',request.operationKey)
 }
 return data.receipt
})
export const approveWeek=request=>recoverable('week_approve',request.clientId,request,headers=>rpc('pooling_approve_week',{target_client:request.clientId,target_week:request.weekId,expected_generation:request.generation,operation_key:request.operationKey},headers))
export const generateWeek=request=>recoverable('weekly',request.clientId,request,async headers=>{
 const {data,error}=await connection().functions.invoke('pooling-weekly',{body:{clientId:request.clientId,expectedGeneration:request.generation,operationKey:request.operationKey,week:request.week},headers})
 if(error || !data?.receipt){
  let code
  try{const body=await error?.context?.clone().json();if(known.includes(body?.error))code=body.error}catch{/* Preserve unknown outcomes. */}
  throw new PoolingError(code || 'outcome_unknown',code?.replaceAll('_',' ') || 'Weekly review outcome unknown. Reconcile the original request.',request.operationKey)
 }
 return data.receipt
})
export const stopLegacy=request=>recoverable('legacy_stop',request.clientId,request,headers=>rpc('pooling_stop_legacy',{target_client:request.clientId,target_workout:request.workoutId},headers))
export const readGovernance=clientId=>rpc('pooling_read_governance',{target_client:clientId})
export const recordConsent=request=>recoverable('consent',request.clientId,request,headers=>rpc('pooling_record_consent',{target_client:request.clientId,target_document:request.documentId,decision:request.decision,operation_key:request.operationKey},headers))
export const reviewContext=request=>recoverable('context_review',request.clientId,request,async headers=>{
 const {data,error}=await connection().functions.invoke('pooling-context-review',{body:{clientId:request.clientId,draftId:request.draftId,expectedGeneration:request.generation,operationKey:request.operationKey,reference:request.reference},headers})
 if(error || !data?.receipt){
  let code
  try{const body=await error?.context?.clone().json();if(known.includes(body?.error))code=body.error}catch{/* Keep unknown outcomes pending. */}
  if(code)throw new PoolingError(code,code.replaceAll('_',' '),request.operationKey)
  throw new PoolingError('outcome_unknown','Context review outcome is not confirmed. Reconcile this same request; no assignment is implied.',request.operationKey)
 }
 return data.receipt
})
