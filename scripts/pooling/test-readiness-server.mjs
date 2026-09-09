// A34: real production UI and hosted Auth/API through a narrowly guarded,
// budgeted loopback transport. The OWNER enters sign-in details in the UI.
// No credentials/request bodies/token responses are logged or stored here.
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync,statfsSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
import {isReadOnlyPoolingRpc} from '../../src/lib/pooling/read-errors.js'

assert(process.argv.includes('--approved-owner-scope'),'Explicit A34 owner approval required')
process.umask(0o077)
const origin='http://127.0.0.1:5192',remote='https://haxxetirrcrwzwdzsdui.supabase.co'
const config=parseEnv(readFileSync('.env','utf8'))
assert.equal(config.VITE_SUPABASE_URL,remote)
const directory=resolve('.recovery/test-readiness'),file=directory+'/owner-run.json'
mkdirSync(directory,{recursive:true,mode:0o700})
const limits={requests:1200,writes:400,previewBuilds:2,concurrentMutations:1}
if(!existsSync(file))writeFileSync(file,JSON.stringify({approval:'A34-owner-assisted',startedAt:new Date().toISOString(),ownerId:null,clientId:null,remainingWrites:null,assignmentIds:[],requests:25,writes:0,reserve:{requests:20,previousPreflightReads:5},previewBuilds:0,limits,events:[]})+'\n',{mode:0o600,flag:'wx'})
const ledger=JSON.parse(readFileSync(file,'utf8'))
assert.equal(ledger.approval,'A34-owner-assisted');assert.deepEqual(ledger.limits,limits)
const save=()=>{writeFileSync(file+'.pending',JSON.stringify(ledger,null,2)+'\n',{mode:0o600,flush:true});renameSync(file+'.pending',file)}
const writes=new Set(['pooling_confirm_source','pooling_save_draft','pooling_request_extension','pooling_approve','pooling_approve_batch','pooling_review_extension','pooling_approve_week','pooling_submit_report','pooling_request_reassessment','pooling_execution'])
const edges=new Set(['pooling-decision','pooling-extension','pooling-suggestion','pooling-weekly','pooling-context-review'])
let queue=Promise.resolve()
async function transport(path,init,mutating=false,safeFinish=false){
  let release
  if(mutating){const prior=queue;queue=new Promise(resolve=>{release=resolve});await prior}
  try{
    assert(ledger.requests<(safeFinish?1200:1100),'request_reserve_reached')
    const write=!['GET','HEAD','OPTIONS'].includes(init.method||'GET')
    assert(!write||ledger.writes<(safeFinish?400:350),'write_reserve_reached')
    const disk=statfsSync(directory);assert(disk.bavail*disk.bsize>64*1024**2,'evidence_disk_guard')
    ledger.requests++;if(write)ledger.writes++;save()
    return await fetch(remote+path,{...init,redirect:'error',signal:AbortSignal.timeout(25000)})
  }finally{release?.()}
}
async function controls(table,select){
  const response=await transport(`/rest/v1/${table}?select=${encodeURIComponent(select)}`,{headers:{apikey:config.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+config.SUPABASE_SERVICE_ROLE_KEY}})
  assert.equal(response.status,200,'control_inventory_unavailable');return response.json()
}
const [test]=await controls('pooling_test_config','enabled,ends_at,coach_ids')
const [flags]=await controls('pooling_runtime','r1,r2,r3')
const existing=await controls('pooling_test_workspaces','client_id,coach_id,revoked_at,expires_at,writes')
assert(test.enabled&&Date.parse(test.ends_at)>Date.now(),'test_window_unavailable')
assert(!flags.r1&&!flags.r2&&!flags.r3,'global_pooling_must_remain_off')
assert.equal(test.coach_ids.length,2,'original_coach_allowlist_changed')
assert(existing.length<=9,'workspace_cap_exceeded')
if(ledger.clientId)assert(existing.some(w=>w.client_id===ledger.clientId&&w.coach_id===ledger.ownerId&&!w.revoked_at),'retained_workspace_unavailable')
ledger.endsAt=test.ends_at;save()
function bindWorkspace(runtime){
  if(!runtime?.clientId)return
  assert(runtime.testOnly===true&&runtime.clientId.startsWith('fs_pool_coachtest_'),'fictional_workspace_required')
  assert(!ledger.clientId||ledger.clientId===runtime.clientId,'another_workspace_forbidden')
  ledger.clientId=runtime.clientId;ledger.remainingWrites=runtime.remainingWrites;save()
}
const publicStatus=()=>({scope:'A34 owner-assisted fictional workspace only',ownerSignedIn:!!ledger.ownerId,clientId:ledger.clientId,remainingWrites:ledger.remainingWrites,endsAt:ledger.endsAt,requests:ledger.requests,writes:ledger.writes,limits:ledger.limits,previewBuilds:ledger.previewBuilds,events:ledger.events.slice(-12)})
const server=await createServer({configFile:false,envDir:false,cacheDir:'node_modules/.vite-a34-owner',define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(origin+'/__supabase'),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify(config.VITE_SUPABASE_ANON_KEY),'import.meta.env.VITE_POOLING_R1':'"true"','import.meta.env.VITE_POOLING_R2':'"true"','import.meta.env.VITE_POOLING_R3':'"true"'},plugins:[react(),{name:'a34-owner-guard',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,origin)
  if(url.pathname==='/__readiness/status'){
    if(req.method!=='GET'){res.statusCode=405;res.end();return}
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(publicStatus()));return
  }
  if(!url.pathname.startsWith('/__supabase/')){
    if(req.headers.accept?.includes('text/html')&&!url.pathname.startsWith('/tests/'))req.url='/tests/pooling/readiness-app.html'
    return next()
  }
  const path=url.pathname.replace('/__supabase',''),rpc=path.split('/rpc/')[1],edge=path.split('/functions/v1/')[1]
  let status=0
  try{
    assert(!req.headers.origin||req.headers.origin===origin,'same_origin_required')
    assert(!req.headers['sec-fetch-site']||req.headers['sec-fetch-site']==='same-origin','same_origin_required')
    assert(/^\/(auth|rest|functions)\/v1\//.test(path),'api_not_in_scope')
    let body='';for await(const chunk of req){body+=chunk;assert(body.length<=300000,'request_too_large')}
    const input=body?JSON.parse(body):req.method==='GET'&&isReadOnlyPoolingRpc(rpc)?Object.fromEntries(url.searchParams):{}
    const method=req.method||'GET',write=!['GET','HEAD','OPTIONS'].includes(method)
    const auth=path.startsWith('/auth/v1/'),readonly=isReadOnlyPoolingRpc(rpc)
    if(edge || (rpc&&!readonly))assert(method==='POST','mutating_endpoint_requires_post')
    const safeFinish=auth&&path==='/auth/v1/logout'||rpc==='pooling_execution'&&['stop','complete','actual'].includes(input.event_kind)
    if(auth){
      assert((path==='/auth/v1/token'&&method==='POST'&&['password','refresh_token'].includes(url.searchParams.get('grant_type')))||(path==='/auth/v1/user'&&method==='GET')||(path==='/auth/v1/logout'&&method==='POST'),'only_existing_owner_signin_refresh_signout_allowed')
    }else{
      const token=String(req.headers.authorization||'').replace(/^Bearer /,'')
      let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString())}catch{throw Error('owner_authentication_required')}
      // This narrows transport only. The real provider still validates the JWT,
      // role, ownership, release and all source/approval checks independently.
      assert(ledger.ownerId&&claims.sub===ledger.ownerId&&claims.role==='authenticated','signed_in_owner_required')
      if(write&&!readonly){
        assert(method==='POST','direct_table_writes_forbidden')
        if(rpc==='pooling_create_test_workspace'){
          assert(!ledger.clientId&&input.acknowledged===true,'only_one_acknowledged_workspace')
          assert(!existing.some(w=>w.coach_id===ledger.ownerId),'existing_workspace_must_be_explicitly_selected')
        }else{
          assert(ledger.clientId,'fictional_workspace_required')
          assert(ledger.remainingWrites!==null&&(safeFinish?ledger.remainingWrites>0:ledger.remainingWrites>20),'workspace_stop_reserve_reached')
          assert(rpc&&writes.has(rpc)||edge&&edges.has(edge),'mutation_not_in_scope')
          if(rpc==='pooling_execution')assert(ledger.assignmentIds.includes(input.assignment_id),'assignment_not_in_fictional_workspace')
          else assert((input.target_client||input.clientId)===ledger.clientId,'real_or_other_client_write_forbidden')
        }
      }
    }
    const headers={};for(const name of ['authorization','apikey','content-type','x-client-info','prefer','range','accept-profile','content-profile','x-supabase-api-version','accept'])if(req.headers[name])headers[name]=req.headers[name]
    const started=Date.now(),response=await transport(path+url.search,{method,headers,...(write?{body}:{})},write&&!readonly,safeFinish)
    status=response.status
    const bytes=Buffer.from(await response.arrayBuffer());let data;try{data=JSON.parse(bytes.toString())}catch{}
    if(response.ok&&auth&&path==='/auth/v1/token'){
      assert(test.coach_ids.includes(data?.user?.id),'only_original_eligible_coach_allowed')
      assert(!ledger.ownerId||ledger.ownerId===data.user.id,'another_account_not_in_scope')
      ledger.ownerId=data.user.id
    }
    if(response.ok&&rpc==='pooling_test_status')bindWorkspace(data?.runtime)
    if(response.ok&&rpc==='pooling_create_test_workspace')bindWorkspace(data)
    if(response.ok&&rpc==='pooling_client_runtime'&&input.target_client===ledger.clientId)bindWorkspace(data)
    if(response.ok&&rpc==='pooling_read_assignments'&&input.target_client===ledger.clientId)ledger.assignmentIds=data.map(row=>row.id)
    ledger.events.push({at:new Date().toISOString(),path,status,ms:Date.now()-started,...(data?.code?{code:data.code}:{})});save()
    for(const [key,value]of response.headers)if(!['content-encoding','content-length','transfer-encoding','connection','access-control-allow-origin','set-cookie'].includes(key))res.setHeader(key,value)
    res.setHeader('Cache-Control','no-store');res.statusCode=status;res.end(bytes)
  }catch(error){
    // No raw request/response or credential is included in this error output.
    const code=error instanceof assert.AssertionError?error.message.split('\n')[0]:'test_transport_unavailable'
    ledger.events.push({at:new Date().toISOString(),path,blocked:true,status,reason:code});save()
    res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({code:'test_scope_guard',message:`Fictional test transport paused: ${code}. No broader action was authorized.`}))
  }
})}}],server:{host:'127.0.0.1',port:5192,strictPort:true,fs:{deny:['.env','.env.*','*.{crt,pem,key,p12,pfx,cer,der}','.npmrc','.yarnrc.yml','**/.git/**','**/.recovery/**','**/.local-test-runtime/**']},watch:{ignored:['**/.recovery/**','**/.local-test-runtime/**']}},logLevel:'error'})
await server.listen()
console.log(JSON.stringify({app:origin+'/pooling-test',controls:origin+'/tests/pooling/readiness-controls.html',scope:'Owner enters existing sign-in details personally; exact fictional workspace mutations only',requests:ledger.requests,writes:ledger.writes}))
async function close(){save();await server.close();process.exit(0)}
process.on('SIGTERM',close);process.on('SIGINT',close)
