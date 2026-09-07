// Authored locally; not deployed. Requires the unverified decision-gateway SQL
// and reviewed source publication before end-to-end acceptance.
import { admin, userFromRequest } from '../_shared/supa.ts'
import { cors, json } from '../_shared/cors.ts'
import { createSupabaseDecisionGateway } from '../_shared/pooling-gateway.js'
import { createDecisionService } from '../_shared/pooling-decision.js'

async function readRequest(req: Request) {
  if (!req.body) throw new Error('invalid_request')
  const reader=req.body.getReader()
  const chunks: Uint8Array[]=[]
  let size=0
  try {
    while(true) {
      const {done,value}=await reader.read()
      if(done) break
      size+=value.byteLength
      if(size>16384) { await reader.cancel();throw new Error('invalid_request') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes=new Uint8Array(size)
  let offset=0
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  try { return JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new Error('invalid_request') }
}

Deno.serve(async (req: Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors})
  if(req.method!=='POST') return json({error:'method_not_allowed'},405)
  try {
    const request=await readRequest(req)
    const gateway=createSupabaseDecisionGateway({
      userClient:{auth:{getUser:async()=>({data:{user:await userFromRequest(req)}})}},
      serviceClient:admin(),
    })
    const result=await createDecisionService(gateway)(request)
    return json(result)
  } catch(error) {
    const code=error instanceof Error ? error.message:'unavailable'
    const status: Record<string,number>={invalid_request:400,forbidden:403,unsupported_policy:409,stale_context:409,source_changed:409,source_unavailable:503,decision_save_unconfirmed:503}
    return json({error:code in status?code:'unavailable',assignment:null},status[code] || 503)
  }
})
