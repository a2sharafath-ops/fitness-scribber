import {admin,userFromRequest} from '../_shared/supa.ts'
import {createSupabaseDecisionGateway} from '../_shared/pooling-gateway.js'
import {createSuggestionService} from '../_shared/pooling-suggestion.js'
import {createPoolingHandler} from '../_shared/pooling-handler.ts'
Deno.serve(createPoolingHandler(createSuggestionService,req=>createSupabaseDecisionGateway({
 userClient:{auth:{getUser:async()=>({data:{user:await userFromRequest(req)}})}},serviceClient:admin(),
})))
