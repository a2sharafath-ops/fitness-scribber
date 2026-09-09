const READS = new Set([
  'pooling_client_runtime','pooling_actor_runtime','pooling_test_status','pooling_test_scenario',
  'pooling_read_extensions','pooling_read_source_review','pooling_read_assignments',
  'pooling_review_workspace','pooling_client_home','pooling_read_weeks','pooling_read_suggestions',
  'pooling_read_catalogue_admin','pooling_read_reassessments','pooling_read_governance','pooling_operation_status',
])

export const isReadOnlyPoolingRpc = name => READS.has(name)

export function poolingReadFailure(name,error) {
  if (!isReadOnlyPoolingRpc(name)) return null
  if (error?.message === 'forbidden') return {code:'forbidden',message:'This signed-in account cannot access this pooling workspace. Return to Test setup and check your own fictional workspace. No change was submitted by this read.'}
  return {code:'source_unavailable',message:'Current pooling data could not be loaded. Check your connection and test availability, then retry loading. This read did not submit a change.'}
}
