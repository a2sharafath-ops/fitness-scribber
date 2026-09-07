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
  }
}
