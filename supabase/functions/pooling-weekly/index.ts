import {admin,userFromRequest} from '../_shared/supa.ts'
import {createSupabaseDecisionGateway} from '../_shared/pooling-gateway.js'
import {createWeeklyService} from '../_shared/pooling-weekly.js'
import {createPoolingHandler} from '../_shared/pooling-handler.ts'
Deno.serve(createPoolingHandler(createWeeklyService,req=>createSupabaseDecisionGateway({
 userClient:{auth:{getUser:async()=>({data:{user:await userFromRequest(req)}})}},serviceClient:admin(),
})))
