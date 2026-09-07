import { buildSourceSnapshot } from '../../../src/lib/pooling/sources.js'
import {canonical} from '../../../src/lib/pooling/context.js'
// Server-only adapter. Construct with a verified-user client and a service client
// inside the trusted runtime, never from browser code.
const sourceFailure=error=>new Error(['forbidden','feature_disabled','stale_draft','stale_context','source_changed','content_revoked','context_held'].includes(error?.message)?error.message:'source_unavailable')
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
      if(sourceError || !bundle?.sourceBundleToken) throw sourceFailure(sourceError)
      const compiled=buildSourceSnapshot(bundle)
      const {error:storeError}=await serviceClient.rpc('pooling_store_source_snapshot',{verified_actor:actor.id,target_client:clientId,target_draft:draftId,
        expected_bundle_token:bundle.sourceBundleToken,context_input:compiled.contextInput,session_request:compiled.sessionRequest})
      if(storeError) throw sourceFailure(storeError)
      const {data,error}=await serviceClient.rpc('pooling_decision_input',{verified_actor:actor.id,target_client:clientId,target_draft:draftId})
      if (error || !data?.sourceToken) throw sourceFailure(error)
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
    async contextReviewReceipt(request){
      if(!actor)throw new Error('forbidden')
      const {data,error}=await serviceClient.from('pooling_context_reviews').select('id,draft_id,parent_draft_id,context_generation,reference').eq('client_id',request.clientId).eq('actor_id',actor.id).eq('operation_key',request.operationKey).maybeSingle()
      if(error)throw new Error('source_unavailable')
      if(!data)return null
      if(data.parent_draft_id!==request.draftId || data.reference!==request.reference || data.context_generation-1!==request.expectedGeneration)throw new Error('idempotency_conflict')
      return {id:data.id,draftId:data.draft_id,generation:data.context_generation,status:'committed',assignment:null}
    },
    async loadContextReview(request){
      if(!actor)throw new Error('forbidden')
      const {data,error}=await serviceClient.rpc('pooling_source_bundle',{verified_actor:actor.id,target_client:request.clientId,target_draft:request.draftId})
      if(error || !data?.sourceBundleToken)throw new Error(error?.message || 'source_unavailable')
      return data
    },
    async weekReceipt(request){
      if(!actor)throw Error('forbidden')
      const {data,error}=await serviceClient.from('pooling_week_reviews').select('id,request,generation').eq('client_id',request.clientId).eq('actor_id',actor.id).eq('operation_key',request.operationKey).maybeSingle()
      if(error)throw Error('source_unavailable')
      if(!data)return null
      if(canonical(data.request)!==canonical(request.week) || data.generation!==request.expectedGeneration)throw Error('idempotency_conflict')
      return {id:data.id,status:'committed',assignment:null}
    },
    async suggestionReceipt(request){
      if(!actor)throw Error('forbidden')
      const {data,error}=await serviceClient.from('pooling_suggestions').select('id,draft_id,request').eq('client_id',request.clientId).eq('actor_id',actor.id).eq('operation_key',request.operationKey).maybeSingle()
      if(error)throw Error('source_unavailable')
      if(!data)return null
      if(canonical(data.request)!==canonical(request))throw Error('idempotency_conflict')
      return {id:data.id,draftId:data.draft_id,status:'committed',assignment:null}
    },
    async storeSuggestion(request,token,result){
      if(!actor)throw Error('forbidden')
      const {data,error}=await serviceClient.rpc('pooling_record_suggestion',{verified_actor:actor.id,target_client:request.clientId,suggestion_request:request,expected_token:token,suggestion_result:result})
      if(error || !data?.id)throw Error(error?.message || 'decision_save_unconfirmed')
      return data
    },
    async loadPublication(request){
      if(!actor)throw Error('forbidden')
      const {data,error}=await serviceClient.rpc('pooling_publication_input',{verified_actor:actor.id,target_client:request.clientId,target_submission:request.submissionId})
      if(error || !data?.digest)throw Error(error?.message || 'source_unavailable')
      return data
    },
    async applyPublication(request,digest){
      if(!actor)throw Error('forbidden')
      const {data,error}=await serviceClient.rpc('pooling_apply_publication',{verified_actor:actor.id,target_client:request.clientId,target_submission:request.submissionId,expected_digest:digest,acceptance_id:request.acceptanceId,action:request.action,reason:request.reason})
      if(error || !data?.manifestId)throw Error(error?.message || 'decision_save_unconfirmed')
      return data
    },
    async loadWeek(request){
      if(!actor)throw Error('forbidden')
      const {data,error}=await serviceClient.rpc('pooling_week_input',{verified_actor:actor.id,target_client:request.clientId,week_request:request.week})
      if(error || !data?.weekToken)throw Error(error?.message || 'source_unavailable')
      return data
    },
    async storeWeek(request,token,result,selection){
      if(!actor)throw Error('forbidden')
      const {data,error}=await serviceClient.rpc('pooling_record_week',{verified_actor:actor.id,target_client:request.clientId,operation_key:request.operationKey,week_request:request.week,expected_generation:request.expectedGeneration,expected_token:token,week_result:result,selection})
      if(error || !data?.id)throw Error(error?.message || 'decision_save_unconfirmed')
      return data
    },
    async storeContextReview(request,token,result){
      const {data,error}=await serviceClient.rpc('pooling_record_context_review',{verified_actor:actor.id,target_client:request.clientId,target_draft:request.draftId,expected_token:token,operation_key:request.operationKey,review_reference:request.reference,resolved_context:result})
      if(error || !data?.id)throw new Error(error?.message || 'decision_save_unconfirmed')
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
