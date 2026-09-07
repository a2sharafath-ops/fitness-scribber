// Local implementation only. No hosted deployment or real-content publication.
import {admin,userFromRequest} from '../_shared/supa.ts'
import {cors,json} from '../_shared/cors.ts'
import {readPoolingRequest} from '../_shared/pooling-request.ts'
import {createSupabaseDecisionGateway} from '../_shared/pooling-gateway.js'
import {createNumericalService} from '../_shared/pooling-numerical.js'
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return json({error:'method_not_allowed'},405)
 try{
  const request=await readPoolingRequest(req)
  const gateway=createSupabaseDecisionGateway({userClient:{auth:{getUser:async()=>({data:{user:await userFromRequest(req)}})}},serviceClient:admin()})
  return json(await createNumericalService(gateway)(request))
 }catch(error){
  const code=error instanceof Error?error.message:'unavailable'
  const status:Record<string,number>={invalid_request:400,forbidden:403,feature_disabled:409,unsupported_policy:409,stale_context:409,source_changed:409,content_revoked:409,session_mismatch:409,baseline_review_required:409,draft_conflict:409,source_unavailable:503,decision_save_unconfirmed:503}
  return json({error:code in status?code:'unavailable',assignment:null},status[code] || 503)
 }
})
