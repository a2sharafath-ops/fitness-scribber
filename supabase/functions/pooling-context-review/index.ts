import {admin,userFromRequest} from '../_shared/supa.ts'
import {createSupabaseDecisionGateway} from '../_shared/pooling-gateway.js'
import {createContextReviewService} from '../_shared/pooling-context-review.js'
import {createPoolingHandler} from '../_shared/pooling-handler.ts'
Deno.serve(createPoolingHandler(createContextReviewService,req=>createSupabaseDecisionGateway({
 userClient:{auth:{getUser:async()=>({data:{user:await userFromRequest(req)}})}},serviceClient:admin(),
})))
