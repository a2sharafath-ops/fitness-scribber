// Authored locally; not deployed. Hosted authentication/hosting need separate verification.
import {admin,userFromRequest} from '../_shared/supa.ts'
import {createSupabaseDecisionGateway} from '../_shared/pooling-gateway.js'
import {createDecisionService} from '../_shared/pooling-decision.js'
import {createPoolingHandler} from '../_shared/pooling-handler.ts'
Deno.serve(createPoolingHandler(createDecisionService,req=>createSupabaseDecisionGateway({
 userClient:{auth:{getUser:async()=>({data:{user:await userFromRequest(req)}})}},serviceClient:admin(),
})))
