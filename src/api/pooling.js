import { supabase } from '../lib/supabase'
import { readLocalDrafts, saveLocalDraft } from '../lib/pooling/drafts'

export class PoolingError extends Error {
  constructor(code, message, operationKey = null) { super(message); this.name = 'PoolingError'; this.code = code; this.operationKey = operationKey }
}

const known = ['forbidden','feature_disabled','stale_context','draft_conflict','idempotency_conflict','protected_field','invalid_proposal','invalid_report','invalid_field','invalid_health_change','invalid_wellness','invalid_budget','invalid_equipment','invalid_parent','invalid_operation_key']
export async function readCatalogueDrafts() {
  const { default: candidateCatalogue } = await import('../../docs/exercise-pooling/catalogues/exercises.draft.json')
  return structuredClone(candidateCatalogue.exercises)
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
  return rpc('pooling_submit_report', { target_client: clientId, expected_generation: generation, operation_key: operationKey, report_field: field, report_value: value, effective_at: effectiveAt })
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
