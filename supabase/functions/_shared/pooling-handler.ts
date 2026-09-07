import {cors,json} from './cors.ts'
import {readPoolingRequest} from './pooling-request.ts'
// A testable HTTP boundary. Tests inject gateways explicitly; production entrypoints
// construct verified-auth/service clients inside the trusted Edge runtime.
export function createPoolingHandler(service: (gateway: any)=>((request: any)=>Promise<unknown>),makeGateway:(req:Request)=>unknown){
 return async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'method_not_allowed'},405)
  try{const request=await readPoolingRequest(req);return json(await service(makeGateway(req))(request))}
  catch(error){
   const code=error instanceof Error?error.message:'unavailable'
   const status:Record<string,number>={invalid_request:400,forbidden:403,feature_disabled:409,unsupported_policy:409,stale_context:409,source_changed:409,content_revoked:409,context_held:409,idempotency_conflict:409,session_mismatch:409,baseline_review_required:409,draft_conflict:409,source_unavailable:503,decision_save_unconfirmed:503}
   Object.assign(status,{invalid_week:400,stale_draft:409,required_gap:409,invalid_release:400,acceptance_required:409,acceptance_mismatch:409,record_not_admitted:409,immutable_release:409})
   return json({error:code in status?code:'unavailable',assignment:null},status[code] || 503)
  }
 }
}
