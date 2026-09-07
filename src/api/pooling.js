import { supabase } from '../lib/supabase'
import candidateCatalogue from '../../docs/exercise-pooling/catalogues/exercises.draft.json'

export class PoolingError extends Error {
  constructor(code, message, operationKey = null) { super(message); this.name = 'PoolingError'; this.code = code; this.operationKey = operationKey }
}

const known = ['forbidden','feature_disabled','stale_context','draft_conflict','idempotency_conflict','protected_field','invalid_proposal','invalid_report','invalid_field','invalid_health_change','invalid_wellness','invalid_budget','invalid_equipment','invalid_parent','invalid_operation_key']
export async function readCatalogueDrafts() {
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
