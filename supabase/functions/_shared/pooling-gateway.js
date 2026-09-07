import { buildSourceSnapshot } from '../../../src/lib/pooling/sources.js'
// Server-only adapter. Construct with a verified-user client and a service client
// inside the trusted runtime, never from browser code. SQL execution is pending.
export function createSupabaseDecisionGateway({userClient,serviceClient}) {
  let actor=null
  const loaded=new Map()
  return {
    async authenticatedActor() {
      const {data,error}=await userClient.auth.getUser()
      actor=!error && data?.user?.id ? {id:data.user.id}:null
      return actor
    },
    async ownsClient(actorId,clientId) {
      if (!actor || actor.id!==actorId) return false
      const {data,error}=await serviceClient.from('clients').select('id,coachId').eq('id',clientId).maybeSingle()
      return !error && data?.id===clientId && data.coachId===actorId
    },
    async loadSnapshot(clientId,draftId) {
      if (!actor) throw new Error('forbidden')
      const {data:bundle,error:sourceError}=await serviceClient.rpc('pooling_source_bundle',{verified_actor:actor.id,target_client:clientId,target_draft:draftId})
      if(sourceError || !bundle?.sourceBundleToken) throw new Error('source_unavailable')
      const compiled=buildSourceSnapshot(bundle)
      const {error:storeError}=await serviceClient.rpc('pooling_store_source_snapshot',{verified_actor:actor.id,target_client:clientId,target_draft:draftId,
        expected_bundle_token:bundle.sourceBundleToken,context_input:compiled.contextInput,session_request:compiled.sessionRequest})
      if(storeError) throw new Error(storeError.message==='source_changed'?'source_changed':'source_unavailable')
      const {data,error}=await serviceClient.rpc('pooling_decision_input',{verified_actor:actor.id,target_client:clientId,target_draft:draftId})
      if (error || !data?.sourceToken) throw new Error('source_unavailable')
      loaded.set(`${clientId}:${draftId}`,data.sourceToken)
      return data
    },
    async storeDecision(evidence) {
      if (!actor || evidence.actorId!==actor.id || loaded.get(`${evidence.clientId}:${evidence.draftId}`)!==evidence.expectedSourceToken) throw new Error('forbidden')
      const {data,error}=await serviceClient.rpc('pooling_record_decision',{verified_actor:actor.id,target_client:evidence.clientId,target_draft:evidence.draftId,
        expected_generation:evidence.expectedGeneration,expected_manifest:evidence.expectedManifestId,expected_source_token:evidence.expectedSourceToken,decision_result:evidence.result})
      if (error) throw new Error(['stale_context','source_changed','content_revoked'].includes(error.message)?error.message:'decision_save_unconfirmed')
      if (!data?.decisionId) throw new Error('decision_save_unconfirmed')
      return data
    },
    async loadExtension(request){
      if(!actor || !loaded.has(`${request.clientId}:${request.draftId}`))throw new Error('forbidden')
      const {data,error}=await serviceClient.rpc('pooling_extension_input',{verified_actor:actor.id,target_client:request.clientId,target_request:request.requestId,target_draft:request.draftId,baseline_assignment:request.baselineAssignmentId,target_policy:request.policyId})
      if(error || !data?.extensionToken)throw new Error(error?.message || 'source_unavailable')
      return data
    },
    async storeExtension(request,decisionId,token,result){
      if(!actor || !loaded.has(`${request.clientId}:${request.draftId}`))throw new Error('forbidden')
      const {data,error}=await serviceClient.rpc('pooling_record_extension',{verified_actor:actor.id,target_client:request.clientId,target_request:request.requestId,target_draft:request.draftId,target_decision:decisionId,baseline_assignment:request.baselineAssignmentId,target_policy:request.policyId,expected_token:token,proposal_result:result})
      if(error || !data?.id)throw new Error(error?.message || 'decision_save_unconfirmed')
      return data
    },
  }
}
