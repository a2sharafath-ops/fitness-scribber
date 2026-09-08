// Loopback-only production app, live Supabase transport and explicit UI controls.
// No browser aliases/fake authentication; never serves service-role credentials.
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {a33Harness,url} from './a33-runtime.mjs'
const h=a33Harness(),{ledger,admin}=h;assert(ledger.state.kg.ready)
const events=ledger.browserEvents??=[];let mode='normal',release=null
const origin='http://127.0.0.1:5189',active=ledger.users.filter(u=>u.state==='active'),refreshTokens=new Set(active.map(u=>u.expirySession.refresh_token))
const summary=()=>({mode,workspaces:ledger.workspaces.map(({label,slot,coachId,clientId})=>({label,slot,coachId,clientId})),budget:ledger.budget,checks:ledger.checks,events:events.slice(-12)})
const check=h.check
async function verify(){
 const a=ledger.workspaces.find(w=>w.label==='a33-a'&&w.slot===1),b=ledger.workspaces.find(w=>w.label==='a33-a'&&w.slot===2),kg=ledger.state.kg
 const reviews=await admin.from('pooling_extension_reviews').select('*').eq('request_id',kg.request.id).eq('client_id',a.clientId);assert.ifError(reviews.error)
 if(reviews.data.length){check('Hosted dropped numerical-review response reconciles exactly one acceptance',reviews.data.length===1&&events.some(e=>e.fault==='response_dropped_after_commit'&&e.path.endsWith('/pooling_review_extension')));const r=await admin.from('pooling_assignments').select('id').eq('draft_id',reviews.data[0].draft_id);assert.ifError(r.error);check('Hosted kg acceptance remains a separate unassigned child',r.data.length===0)}
 const drafts=await admin.from('pooling_drafts').select('id,client_id,proposal').in('client_id',[a.clientId,b.clientId]).order('id');assert.ifError(drafts.error)
 const copies=drafts.data.filter(d=>d.proposal.source==='manual_or_imported_builder'&&d.proposal.blocks.some(b=>b.exercises?.some(e=>e.exerciseDbRef===kg.imports.exerciseId)))
 if(copies.length){check('Hosted copy-last/template/same-coach cross-client UI yields three drafts',copies.length===3&&copies.filter(d=>d.client_id===b.clientId).length===1);check('Hosted imported actuals and private recipient notes are stripped',copies.every(d=>d.proposal.blocks.every(b=>b.exercises.every(e=>e.sets.every(s=>s.completedReps===null&&s.completedLoadKg===null))))&&copies.filter(d=>d.client_id===b.clientId).every(d=>d.proposal.notes===''));const r=await admin.from('pooling_assignments').select('id').in('draft_id',copies.map(d=>d.id));assert.ifError(r.error);check('Hosted imported drafts remain unassigned',r.data.length===0)}
 const travel=drafts.data.filter(d=>d.proposal.notes==='FICTIONAL A33 travel schedule; no catch-up requested')
 if(travel.length){check('Hosted travel history retains explicit dates, same instant and both zones',travel.length===2&&travel[0].proposal.date!==travel[1].proposal.date&&travel[0].proposal.session.sessionAt===travel[1].proposal.session.sessionAt&&travel[0].proposal.session.timeZone==='Asia/Tokyo'&&travel[1].proposal.session.timeZone==='America/Los_Angeles');const r=await admin.from('pooling_assignments').select('id').in('draft_id',travel.map(d=>d.id));assert.ifError(r.error);check('Hosted travel changes never invent a catch-up assignment',r.data.length===0)}
 for(const e of events.filter(e=>e.fault==='response_dropped_after_commit'&&e.path.endsWith('/pooling_save_draft'))){const r=await admin.from('pooling_drafts').select('id').eq('operation_key',e.key);assert.ifError(r.error);check('Hosted dropped draft has exactly one durable row',r.data.length===1)}
 const flags=await admin.from('pooling_runtime').select('*').single();assert.ifError(flags.error);check('Global pooling remains off throughout A33 UI testing',!flags.data.r1&&!flags.data.r2&&!flags.data.r3)
 ledger.browserVerifiedAt=new Date().toISOString();h.save()
}
async function expiry(){
 const user=active.find(u=>u.label==='a33-b'),s=user.expirySession
 assert(Date.now()>s.expires_at*1000+3000,'Wait for actual signed JWT expiry; no clock/claim forgery')
 const response=await h.transport(url+'/rest/v1/rpc/pooling_test_status',{method:'POST',headers:{apikey:h.publicKey,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:'{}'})
 const error=await response.json();check('Actually expired provider-issued JWT is rejected by hosted REST',response.status===401&&/expired/i.test(error.message??''),{status:response.status})
 const c=h.client(),r=await c.auth.refreshSession({refresh_token:s.refresh_token});assert.ifError(r.error);assert.equal(r.data.user.id,user.id)
 user.expirySession.refreshedAt=new Date().toISOString();user.expirySession.refreshedSession=r.data.session;h.save()
 check('Original provider refresh token refreshes after genuine JWT expiry',r.data.session.expires_at>Date.now()/1000)
}
const server=await createServer({configFile:false,envDir:false,define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(origin+'/__supabase'),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify(h.publicKey),'import.meta.env.VITE_POOLING_R1':'"true"','import.meta.env.VITE_POOLING_R2':'"true"','import.meta.env.VITE_POOLING_R3':'"true"'},plugins:[react(),{name:'a33-approved-hosted-test',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
 const path=new URL(req.url,origin)
 if(!path.pathname.startsWith('/__a33/')&&!path.pathname.startsWith('/__supabase/')){
  // SPA routes must load the real test entry (production App), not the default
  // index entry's unrelated environment configuration.
  if(req.headers.accept?.includes('text/html')&&!path.pathname.startsWith('/tests/'))req.url='/tests/pooling/a33-app.html'
  return next()
 }
 try{
  if(req.headers.origin)assert.equal(req.headers.origin,origin)
  let body='';for await(const chunk of req){body+=chunk;assert(body.length<=300000)}
  const input=body?JSON.parse(body):{}
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store')
  if(path.pathname==='/__a33/control'){
   assert.equal(req.method,'POST');assert.equal(req.headers.origin,origin)
   if(input.action==='release'){release?.();release=null;mode='normal'}
   else if(input.action==='verify')await verify()
   else if(input.action==='expiry')await expiry()
   else if(input.action!=='status'){assert(['normal','drop_review','drop_draft','offline_draft','hold_draft','expired_draft'].includes(input.action));mode=input.action}
   res.end(JSON.stringify(summary()));return
  }
  if(path.pathname==='/__a33/pending-fixture'){
   const result=[]
   for(const u of active){const w=ledger.workspaces.find(w=>w.coachId===u.id&&w.slot===1);const r=await admin.from('pooling_contexts').select('generation').eq('client_id',w.clientId).single();assert.ifError(r.error)
    ledger.state.pendingFixtures??={};ledger.state.pendingFixtures[u.id]??={clientId:w.clientId,generation:r.data.generation,operationKey:h.key(u.label+'-pending-browser'),proposal:{date:'2026-09-14',blocks:[],notes:'FICTIONAL A33 account-scoped recovery draft',source:'manual_or_imported_builder',requiresIdentityAndDoseReview:true}};h.save()
    result.push({coachId:u.id,request:ledger.state.pendingFixtures[u.id]})}
   res.end(JSON.stringify(result));return
  }
  const target=path.pathname.replace(/^\/__supabase/,'');assert(/^\/(auth|rest|functions)\/v1\//.test(target))
  const token=String(req.headers.authorization??'').replace(/^Bearer /,'')
  if(target==='/auth/v1/token'){
   if(path.searchParams.get('grant_type')==='password')assert(active.some(u=>u.email===input.email),'Fictional account required')
   else assert(refreshTokens.has(input.refresh_token),'Only observed test refresh tokens')
  }else{let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString())}catch{throw Error('Test JWT required')}assert(active.some(u=>u.id===claims.sub)&&claims.role==='authenticated','Only new A33 test users')}
  const draft=target.endsWith('/pooling_save_draft'),headers={}
  for(const key of ['authorization','apikey','content-type','x-client-info','prefer','range','accept-profile','content-profile','x-supabase-api-version','accept'])if(req.headers[key])headers[key]=req.headers[key]
  if(mode==='offline_draft'&&draft){events.push({path:target,fault:'offline_before_send',key:input.operation_key,request:input});h.save();req.socket.destroy();return}
  if(mode==='expired_draft'&&draft){const actor=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).sub,u=active.find(u=>u.id===actor);assert(Date.now()>u.expirySession.expires_at*1000+3000);headers.authorization='Bearer '+u.expirySession.access_token;mode='normal'}
  const started=Date.now(),response=await h.transport(url+target+path.search,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body}:{})}),bytes=Buffer.from(await response.arrayBuffer())
  let data;try{data=JSON.parse(bytes.toString())}catch{}
  if(response.ok&&target==='/auth/v1/token'&&data?.refresh_token)refreshTokens.add(data.refresh_token)
  const event={path:target,status:response.status,ms:Date.now()-started,key:input.operation_key};events.push(event);h.save()
  if(response.ok&&((mode==='drop_review'&&target.endsWith('/pooling_review_extension'))||(mode==='drop_draft'&&draft))){mode='normal';event.fault='response_dropped_after_commit';event.receipt=data;h.save();req.socket.destroy();return}
  if(response.ok&&mode==='hold_draft'&&draft){mode='holding';event.fault='response_held_after_commit';h.save();await new Promise(resolve=>{const timer=setTimeout(()=>{release=null;resolve()},45000);release=()=>{clearTimeout(timer);resolve()}})}
  for(const [key,value]of response.headers)if(!['content-encoding','content-length','transfer-encoding','connection','access-control-allow-origin','set-cookie'].includes(key))res.setHeader(key,value)
  res.statusCode=response.status;res.end(bytes)
 }catch(error){events.push({failure:error.message,at:new Date().toISOString()});h.save();res.statusCode=503;res.end(JSON.stringify({error:error.message}))}
})}}],server:{host:'127.0.0.1',port:5189,strictPort:true,fs:{deny:['.env','.env.*','**/.recovery/**','**/.local-test-runtime/**','**/.git/**']},watch:{ignored:['**/.recovery/**','**/.local-test-runtime/**']}},logLevel:'error'})
await server.listen();console.log(JSON.stringify({app:origin,controls:origin+'/tests/pooling/a33-controls.html',scope:'Production UI and real hosted Auth/REST/Edge; exact fictional tokens only'}))
const close=async()=>{release?.();h.save();writeFileSync(join(h.directory,'browser-summary.json'),JSON.stringify(summary(),null,2)+'\n',{mode:0o600});await server.close();process.exit(0)}
process.on('SIGTERM',close);process.on('SIGINT',close)
