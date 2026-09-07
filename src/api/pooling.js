import { supabase } from '../lib/supabase'
import { builderDraft, readLocalDrafts, saveLocalDraft } from '../lib/pooling/drafts'
import {canonical} from '../lib/pooling/context'
import {validateConfirmation} from '../lib/pooling/sources'
import {OPERATION_KEY,DEFINITIVE_CODES,pendingOperations,prepareOperation,settleOperation,rejectOperation} from '../lib/pooling/operations'
import {createJournalIdentity} from '../lib/pooling/journal-identity'
const journalActor=supabase?createJournalIdentity(supabase.auth):null

export class PoolingError extends Error {
  constructor(code, message, operationKey = null) { super(message); this.name = 'PoolingError'; this.code = code; this.operationKey = operationKey }
}

const known = DEFINITIVE_CODES
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
  if (supabase) return recoverable('extension',clientId,{clientId,kind,operationKey,proposal,generation},()=>rpc('pooling_request_extension',{target_client:clientId,expected_generation:generation,operation_key:operationKey,proposal}))
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
async function rpc(name, payload) {
  const client = connection()
  let result
  try { result = await client.rpc(name, payload) }
  catch { throw new PoolingError('outcome_unknown', 'The save outcome is unknown. Reconcile or retry using the same operation key.', payload.operation_key) }
  if (result.error) {
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
  return recoverable('report',clientId,request,()=>rpc('pooling_submit_report', { target_client: clientId, expected_generation: generation, operation_key: operationKey, report_field: field, report_value: value, effective_at: effectiveAt }))
}
export function savePoolingDraft({ clientId, generation, operationKey, proposal, parentId = null }) {
  return rpc('pooling_save_draft', { target_client: clientId, expected_generation: generation, operation_key: operationKey, proposal, parent_id: parentId })
}

export async function readBuilderDrafts(clientId) {
  if (supabase) return (await readPooling(clientId)).drafts
  try { return readLocalDrafts(localStorage).records.filter(record => record.clientId === clientId) }
  catch { throw new PoolingError('source_unavailable', 'Local drafts could not be read. Existing storage has not been replaced.') }
}

export async function readBuilderDraftState(clientId, date) {
  const data = supabase ? await readPooling(clientId) : { drafts: await readBuilderDrafts(clientId), context: null }
  const latest = data.drafts.filter(row => row.proposal.date === date).sort((a,b) => b.revision-a.revision)[0]
  return { expectedRevision: latest?.revision || 0, generation: data.context?.generation || 1, parentId: latest?.id || null, initialProposal: latest?.proposal || null }
}

export async function saveBuilderDraft({ clientId, operationKey, proposal, expectedRevision, generation, parentId }) {
  if (supabase) return savePoolingDraft({ clientId, operationKey, proposal, generation, parentId })
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
 const scope=await journalScope(request.clientId)
 try{const row=await journalWrite(()=>prepareOperation(localStorage,{scope,kind:'draft',request}));if(row.receipt)return row.receipt}
 catch{throw new PoolingError('failed_save','Recovery record could not be saved. No new draft request was sent.',request.operationKey)}
 let receipt
 try{receipt=await saveBuilderDraft(request)}catch(error){
   if(['draft_conflict','stale_context','idempotency_conflict','protected_field','invalid_proposal','invalid_parent','invalid_operation_key'].includes(error.code)){
     try{await journalWrite(()=>rejectOperation(localStorage,scope,request.operationKey,error.code))}catch{throw new PoolingError('outcome_unknown','Rejection receipt could not be recorded. Keep the original request for reconciliation.',request.operationKey)}
   }
   throw error
 }
 try{await journalWrite(()=>settleOperation(localStorage,scope,request.operationKey,{...receipt,status:receipt.status || 'saved'}))}
 catch{throw new PoolingError('outcome_unknown','The draft may be saved, but its local receipt could not be recorded. Retry the same operation.',request.operationKey)}
 return receipt
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
 if(supabase)return recoverable('confirmation',clientId,{clientId,generation,operationKey,observation:normalized},()=>rpc('pooling_confirm_source',{target_client:clientId,expected_generation:generation,operation_key:operationKey,observation:normalized}))
 const key='fitscribe_pooling_sources_v1',proposal={date:normalized.effectiveAt.slice(0,10),observation:normalized}
 const write=()=>{const rows=readLocalDrafts(localStorage,key).records.filter(row=>row.clientId===clientId && row.proposal.date===proposal.date);return saveLocalDraft(localStorage,{clientId,operationKey,proposal,expectedRevision:Math.max(0,...rows.map(row=>row.revision)),recordedAt:new Date().toISOString()},key)}
 return navigator.locks?navigator.locks.request(key,write):write()
}
export const readAssignments=clientId=>rpc('pooling_read_assignments',{target_client:clientId})
export const approveDraft=request=>recoverable('approve',request.clientId,request,()=>rpc('pooling_approve',{target_client:request.clientId,draft_id:request.draftId,decision_id:request.decisionId,expected_generation:request.generation,operation_key:request.operationKey}))
export const recordExecution=request=>recoverable('execution',request.clientId,request,()=>rpc('pooling_execution',{assignment_id:request.assignmentId,expected_generation:request.generation,operation_key:request.operationKey,event_kind:request.kind,event_payload:request.payload}))
export async function readPendingOperations(clientId){return pendingOperations(localStorage,await journalScope(clientId))}
async function recoverable(kind,clientId,request,send){
 if(!clientId)throw new PoolingError('invalid_request','Client context is required.')
 const scope=await journalScope(clientId)
 try{const row=await journalWrite(()=>prepareOperation(localStorage,{scope,kind,request}));if(row.receipt)return row.receipt}catch(error){throw new PoolingError(known.includes(error.message)?error.message:'failed_save','The recovery record could not be prepared. No new request was sent by this attempt; any earlier pending request is preserved.',request.operationKey)}
 let receipt
 try{receipt=await send()}catch(error){
   if(known.includes(error.code)){try{await journalWrite(()=>rejectOperation(localStorage,scope,request.operationKey,error.code))}catch{throw new PoolingError('outcome_unknown','The rejection could not be recorded locally. Reconcile the original operation before submitting another.',request.operationKey)}}
   throw error
 }
 try{await journalWrite(()=>settleOperation(localStorage,scope,request.operationKey,receipt))}catch{throw new PoolingError('outcome_unknown','Server response received, but its local receipt was not saved. Retry the same operation.',request.operationKey)}
 return receipt
}
export async function decideDraft({clientId,draftId,generation}){
 const {data,error}=await connection().functions.invoke('pooling-decision',{body:{clientId,draftId,expectedGeneration:generation}})
 if(error || !data?.receipt?.decisionId)throw new PoolingError('unavailable','Decision could not be verified. No assignment was made.')
 return data
}
export const readReviewWorkspace=clientId=>supabase?rpc('pooling_review_workspace',{target_client:clientId}):Promise.resolve({manifests:[],decisions:[],assignments:[]})
export const approveBatch=request=>recoverable('batch',request.clientId,request,()=>rpc('pooling_approve_batch',{target_client:request.clientId,expected_generation:request.generation,operation_key:request.operationKey,selection:request.selection}))
export const reviewExtension=request=>recoverable('extension_review',request.clientId,request,()=>rpc('pooling_review_extension',{target_client:request.clientId,request_id:request.requestId,expected_generation:request.generation,operation_key:request.operationKey,action:request.action,reason:request.reason,proposal_id:request.proposalId || null,amended_draft:request.amendedDraft || null}))
export async function retryPendingOperation(row){
const handlers={draft:saveRecoverableBuilderDraft,confirmation:confirmPoolingSource,report:submitPoolingReport,execution:recordExecution,approve:approveDraft,batch:approveBatch,extension:saveExtensionRequest,extension_review:reviewExtension,legacy_stop:stopLegacy,consent:recordConsent,context_review:reviewContext,weekly:generateWeek,week_approve:approveWeek,suggestion:generateSuggestion,reassessment:requestReassessment,catalogue_submission:submitCatalogue,publication:applyPublication}
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
export const submitCatalogue=request=>recoverable('catalogue_submission',request.clientId,request,()=>rpc('pooling_submit_catalogue',{target_client:request.clientId,operation_key:request.operationKey,release_document:request.document,review_note:request.note}))
export const applyPublication=request=>recoverable('publication',request.clientId,request,async()=>{
 const {operationKey:_,...body}=request
 const {data,error}=await connection().functions.invoke('pooling-publication',{body})
 if(error || !data?.receipt){
  let code
  try{const result=await error?.context?.clone().json();if(known.includes(result?.error))code=result.error}catch{/* Preserve the exact release request. */}
  throw new PoolingError(code || 'outcome_unknown',code?.replaceAll('_',' ') || 'Release action outcome unknown. Reconcile the original request.',request.operationKey)
 }
 return data.receipt
})
export const readReassessments=clientId=>rpc('pooling_read_reassessments',{target_client:clientId})
export const requestReassessment=request=>recoverable('reassessment',request.clientId,request,()=>rpc('pooling_request_reassessment',{target_client:request.clientId,operation_key:request.operationKey,review_request:request.review}))
export const generateSuggestion=request=>recoverable('suggestion',request.clientId,request,async()=>{
 const {generation,...body}=request
 const {data,error}=await connection().functions.invoke('pooling-suggestion',{body:{...body,expectedGeneration:generation}})
 if(error || !data?.receipt){
  let code
  try{const result=await error?.context?.clone().json();if(known.includes(result?.error))code=result.error}catch{/* Keep unknown operation pending. */}
  throw new PoolingError(code || 'outcome_unknown',code?.replaceAll('_',' ') || 'Suggestion outcome unknown. Reconcile the original request.',request.operationKey)
 }
 return data.receipt
})
export const approveWeek=request=>recoverable('week_approve',request.clientId,request,()=>rpc('pooling_approve_week',{target_client:request.clientId,target_week:request.weekId,expected_generation:request.generation,operation_key:request.operationKey}))
export const generateWeek=request=>recoverable('weekly',request.clientId,request,async()=>{
 const {data,error}=await connection().functions.invoke('pooling-weekly',{body:{clientId:request.clientId,expectedGeneration:request.generation,operationKey:request.operationKey,week:request.week}})
 if(error || !data?.receipt){
  let code
  try{const body=await error?.context?.clone().json();if(known.includes(body?.error))code=body.error}catch{/* Preserve unknown outcomes. */}
  throw new PoolingError(code || 'outcome_unknown',code?.replaceAll('_',' ') || 'Weekly review outcome unknown. Reconcile the original request.',request.operationKey)
 }
 return data.receipt
})
export const stopLegacy=request=>recoverable('legacy_stop',request.clientId,request,()=>rpc('pooling_stop_legacy',{target_client:request.clientId,target_workout:request.workoutId}))
export const readGovernance=clientId=>rpc('pooling_read_governance',{target_client:clientId})
export const recordConsent=request=>recoverable('consent',request.clientId,request,()=>rpc('pooling_record_consent',{target_client:request.clientId,target_document:request.documentId,decision:request.decision,operation_key:request.operationKey}))
export const reviewContext=request=>recoverable('context_review',request.clientId,request,async()=>{
 const {data,error}=await connection().functions.invoke('pooling-context-review',{body:{clientId:request.clientId,draftId:request.draftId,expectedGeneration:request.generation,operationKey:request.operationKey,reference:request.reference}})
 if(error || !data?.receipt){
  let code
  try{const body=await error?.context?.clone().json();if(known.includes(body?.error))code=body.error}catch{/* Keep unknown outcomes pending. */}
  if(code)throw new PoolingError(code,code.replaceAll('_',' '),request.operationKey)
  throw new PoolingError('outcome_unknown','Context review outcome is not confirmed. Reconcile this same request; no assignment is implied.',request.operationKey)
 }
 return data.receipt
})
