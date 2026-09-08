// Loopback-only transport fault fixture against the exact approved hosted API.
// No service-role credential is sent through this proxy or exposed to browsers.
import http from 'node:http'
import {readFileSync,writeFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {verificationHarness} from './verification-runtime.mjs'
import {url} from './hosted-test-runtime.mjs'
const h=verificationHarness(),file=join(dirname(h.file),'transport-evidence.json')
const allowedOrigins=new Set(['http://127.0.0.1:5180','http://127.0.0.1:54832'])
const refreshTokens=new Set(),events=[];let requests=0,writes=0,mode='normal',release=null
const save=()=>writeFileSync(file,JSON.stringify({requests,writes,mode,events},null,2)+'\n',{mode:0o600})
const log=e=>{events.push({...e,at:new Date().toISOString()});save()}
const html=()=>`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A32 transport controls</title><body><h1>Fictional hosted transport verification</h1><p>No real accounts. Mode: ${mode}. Requests: ${requests}; writes: ${writes}.</p><form method="post" action="/__control">${['normal','drop_actual','drop_draft','drop_review','offline','hold_approve','release'].map(action=>`<button name="action" value="${action}">${action}</button>`).join(' ')}</form><pre>${JSON.stringify(events.slice(-12),null,2)}</pre></body></html>`
const server=http.createServer(async(req,res)=>{
 try{
  const origin=req.headers.origin
  if(origin&&!allowedOrigins.has(origin)){res.writeHead(403);res.end();return}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
  res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,prefer,range,accept-profile,content-profile,x-supabase-api-version')
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS,HEAD')
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>200000)throw Error('body_limit')}
  const path=new URL(req.url,'http://127.0.0.1:54832')
  if(path.pathname==='/__control'){
   if(req.method==='POST'){const action=new URLSearchParams(body).get('action');if(action==='release'){release?.();release=null;mode='normal'}else if(['normal','drop_actual','drop_draft','drop_review','offline','hold_approve'].includes(action))mode=action;log({control:action});res.writeHead(303,{Location:'/__control'});res.end();return}
   res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html());return
  }
  if(!/^\/(auth|rest|functions)\/v1\//.test(path.pathname))throw Error('unsupported_target')
  const ledger=JSON.parse(readFileSync(h.file,'utf8')),users=ledger.users.filter(u=>u.state==='active')
  const token=String(req.headers.authorization||'').replace(/^Bearer /,'')
  let input={};try{input=JSON.parse(body||'{}')}catch{throw Error('invalid_json')}
  if(path.pathname==='/auth/v1/token'){
   if(path.searchParams.get('grant_type')==='password'){if(!users.some(u=>u.email===input.email))throw Error('fictional_account_required')}
   else if(!refreshTokens.has(input.refresh_token))throw Error('run_refresh_required')
  }else{
   let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString())}catch{throw Error('run_user_token_required')}
   if(!users.some(u=>u.id===claims.sub)||claims.role!=='authenticated')throw Error('run_user_token_required')
  }
  if(++requests>1200)throw Error('request_cap')
  if(!['GET','HEAD'].includes(req.method)&&++writes>300)throw Error('write_request_cap')
  if(mode==='offline'){log({path:path.pathname,fault:'offline_before_send'});req.socket.destroy();return}
  if(mode==='hold_approve'&&path.pathname.endsWith('/pooling_approve')){
   mode='approval_held';log({path:path.pathname,fault:'approval_held_before_send'})
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{release=null;reject(Error('hold_timeout_no_send'))},45000);release=()=>{clearTimeout(timer);resolve()}})
  }
  const started=Date.now(),headers={}
  for(const key of ['authorization','apikey','content-type','x-client-info','prefer','range','accept-profile','content-profile','x-supabase-api-version','accept'])if(req.headers[key])headers[key]=req.headers[key]
  const response=await fetch(url+path.pathname+path.search,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body}:{}),signal:AbortSignal.timeout(25000),redirect:'error'})
  const bytes=Buffer.from(await response.arrayBuffer());let data;try{data=JSON.parse(bytes.toString())}catch{}
  if(path.pathname==='/auth/v1/token'&&response.ok&&data?.refresh_token)refreshTokens.add(data.refresh_token)
  const drop=response.ok&&((mode==='drop_actual'&&input.event_kind==='actual'&&path.pathname.endsWith('/pooling_execution'))||(mode==='drop_draft'&&path.pathname.endsWith('/pooling_save_draft'))||(mode==='drop_review'&&path.pathname.endsWith('/pooling_review_extension')))
  log({path:path.pathname,status:response.status,ms:Date.now()-started,...(drop?{fault:'response_dropped_after_hosted_commit',operationKey:input.operation_key,receipt:data}:{} )})
  if(drop){mode='normal';save();req.socket.destroy();return}
  for(const [key,value]of response.headers)if(!['content-encoding','content-length','transfer-encoding','connection','access-control-allow-origin','set-cookie'].includes(key))res.setHeader(key,value)
  res.writeHead(response.status);res.end(bytes)
 }catch(e){log({failure:e.message});if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'verification_transport_unavailable'}))}
})
server.listen(54832,'127.0.0.1',()=>console.log(JSON.stringify({proxy:'http://127.0.0.1:54832',controls:'http://127.0.0.1:54832/__control',destination:url,allowed:'Only new active A32 fictional user tokens; provider validates every request'})))
