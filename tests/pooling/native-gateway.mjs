import {createSupabaseDecisionGateway} from '../../supabase/functions/_shared/pooling-gateway.js'
import {jsonSQL,literal,serviceRPC,coach} from './native-connection.mjs'
// Test-only identity adapter. Never a substitute for hosted JWT verification.
export function nativeGateway(actor=coach){return createSupabaseDecisionGateway({userClient:{auth:{getUser:async()=>({data:{user:{id:actor}}})}},serviceClient:{rpc:async(n,p)=>serviceRPC(n,p),from:table=>{
 if(!['clients','pooling_context_reviews','pooling_week_reviews','pooling_suggestions'].includes(table))throw Error('Unexpected test table')
 const clauses=[]
 return {select:()=>{const builder={eq:(key,value)=>{if(!['id','client_id','actor_id','operation_key'].includes(key))throw Error('Unexpected test filter');clauses.push(`"${key}"=${literal(value)}`);return builder},maybeSingle:async()=>({data:jsonSQL(`select coalesce((select to_jsonb(t) from public.${table} t where ${clauses.join(' and ')}),'null'::jsonb)`)})};return builder}}
}}})}
