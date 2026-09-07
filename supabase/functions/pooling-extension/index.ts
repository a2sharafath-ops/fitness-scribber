// Local implementation only. No hosted deployment or real-content publication.
import {admin,userFromRequest} from '../_shared/supa.ts'
import {createSupabaseDecisionGateway} from '../_shared/pooling-gateway.js'
import {createNumericalService} from '../_shared/pooling-numerical.js'
import {createPoolingHandler} from '../_shared/pooling-handler.ts'
Deno.serve(createPoolingHandler(createNumericalService,req=>createSupabaseDecisionGateway({
 userClient:{auth:{getUser:async()=>({data:{user:await userFromRequest(req)}})}},serviceClient:admin(),
})))
