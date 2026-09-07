import { resolveContext, canonical } from '../../../src/lib/pooling/context.js'
import { admission } from '../../../src/lib/pooling/selection.js'
import { evaluateDraft } from '../../../src/lib/pooling/decision.js'

// Server orchestration contract. Not an exposed Edge endpoint.
// The gateway must derive identity from verified auth, load a consistent private
// snapshot and store with an atomic generation/manifest/draft recheck. Those PG
// adapter/concurrency guarantees remain unverified until the local DB is restored.
export function createDecisionService(gateway) {
  return async function decide(request) {
    const allowed = new Set(['clientId','draftId','expectedGeneration'])
    if (!request || Object.keys(request).some(key=>!allowed.has(key)) || typeof request.clientId!=='string' || !request.clientId || !Number.isSafeInteger(request.draftId) || request.draftId<1 || !Number.isSafeInteger(request.expectedGeneration) || request.expectedGeneration<1) throw new Error('invalid_request')
    const actor = await gateway.authenticatedActor()
    if (!actor?.id) throw new Error('forbidden')
    if (!await gateway.ownsClient(actor.id,request.clientId)) throw new Error('forbidden')
    const snapshot = await gateway.loadSnapshot(request.clientId,request.draftId)
    if (!snapshot?.draft || snapshot.clientId!==request.clientId || snapshot.draft.id!==request.draftId || snapshot.draft.clientId!==request.clientId) throw new Error('source_unavailable')
    if (snapshot.generation!==request.expectedGeneration || snapshot.draft.contextGeneration!==snapshot.generation) throw new Error('stale_context')
    if (!admission(snapshot.modulePolicy || {},snapshot.manifest)) throw new Error('unsupported_policy')
    const policy=snapshot.modulePolicy
    if (!Array.isArray(policy.requiredFields) || !Array.isArray(policy.requiredRoles) ||
      snapshot.contextInput?.scope!==policy.scope || snapshot.sessionRequest?.scope!==policy.scope ||
      !policy.requiredFields.every(key=>snapshot.contextInput.requirements?.some(row=>row.key===key && row.required===true)) ||
      !policy.requiredRoles.every(id=>snapshot.sessionRequest.roles?.some(row=>row.id===id && row.required===true))) throw new Error('unsupported_policy')
    const context = resolveContext({...snapshot.contextInput,clientId:request.clientId,generation:snapshot.generation})
    if (typeof snapshot.held!=='boolean' || typeof snapshot.sourceToken!=='string') throw new Error('source_unavailable')
    if (snapshot.held) { context.state='held';context.reasons.push({code:'authoritative_context_hold'}) }
    const result = evaluateDraft({context,request:snapshot.sessionRequest,catalogue:snapshot.catalogue,doses:snapshot.doses,
      manifest:snapshot.manifest,selection:snapshot.draft.selection})
    // Do not copy private raw evidence or notes into the client projection.
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(snapshot.draft)))
    const expectedDraftDigest=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')
    const evidence = {actorId:actor.id,clientId:request.clientId,draftId:request.draftId,expectedGeneration:snapshot.generation,
      expectedManifestId:snapshot.manifest.id,expectedDraftDigest,expectedSourceToken:snapshot.sourceToken,result}
    const receipt = await gateway.storeDecision(evidence)
    return {receipt,result,assignment:null}
  }
}
