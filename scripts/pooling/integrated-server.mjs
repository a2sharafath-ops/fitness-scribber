// Normal application, original local auth storage origin, real hosted RLS.
// A35 scope supersedes A34's fictional-client-only transport. No secrets/body logs.
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {readFileSync,mkdirSync,appendFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import assert from 'node:assert/strict'
assert(process.argv.includes('--approved-integration'))
process.umask(0o077)
const config=parseEnv(readFileSync('.env','utf8')),origin='http://127.0.0.1:5192',remote='https://haxxetirrcrwzwdzsdui.supabase.co'
assert.equal(config.VITE_SUPABASE_URL,remote)
mkdirSync('.recovery/integrated',{recursive:true,mode:0o700})
const server=await createServer({configFile:false,envDir:false,cacheDir:'node_modules/.vite-a35-integrated',
 define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(origin+'/__supabase'),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify(config.VITE_SUPABASE_ANON_KEY),
 'import.meta.env.VITE_POOLING_R1':'"true"','import.meta.env.VITE_POOLING_R2':'"true"','import.meta.env.VITE_POOLING_R3':'"true"'},
 plugins:[react(),{name:'a35-api-proxy',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,origin);if(!url.pathname.startsWith('/__supabase/'))return next()
  const path=url.pathname.slice('/__supabase'.length)
  try {
   assert(!req.headers.origin||req.headers.origin===origin)
   assert(/^\/(auth|rest|functions)\/v1\//.test(path))
   let body='';for await(const chunk of req){body+=chunk;assert(body.length<=1024*1024)}
   const headers={};for(const key of ['authorization','apikey','content-type','x-client-info','prefer','range','accept-profile','content-profile','x-supabase-api-version','accept'])if(req.headers[key])headers[key]=req.headers[key]
   const start=Date.now(),response=await fetch(remote+path+url.search,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body}:{}),redirect:'error',signal:AbortSignal.timeout(45000)})
   const bytes=Buffer.from(await response.arrayBuffer())
   appendFileSync('.recovery/integrated/http-events.jsonl',JSON.stringify({at:new Date().toISOString(),method:req.method,path,status:response.status,ms:Date.now()-start})+'\n',{mode:0o600})
   for(const [key,value]of response.headers)if(!['content-encoding','content-length','transfer-encoding','connection','set-cookie'].includes(key))res.setHeader(key,value)
   res.setHeader('Cache-Control','no-store');res.statusCode=response.status;res.end(bytes)
  }catch {res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:'Connected development API is unavailable. Keep pending operation keys and retry when connected.'}))}
 })}}],server:{host:'127.0.0.1',port:5192,strictPort:true,fs:{deny:['.env','.env.*','*.{crt,pem,key,p12,pfx,cer,der}','.npmrc','.yarnrc.yml','**/.git/**','**/.recovery/**','**/.local-test-runtime/**']},watch:{ignored:['**/.recovery/**','**/.local-test-runtime/**']}},logLevel:'error'})
await server.listen();console.log(JSON.stringify({url:origin+'/clients',scope:'A35 normal development-client workflow; backend authorization unchanged'}))
async function close(){await server.close();process.exit(0)}
process.on('SIGTERM',close);process.on('SIGINT',close)
