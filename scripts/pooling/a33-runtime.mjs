// One private run, one remote transport budget shared by SDK and browser traffic.
import {readFileSync,writeFileSync,existsSync,mkdtempSync,renameSync,statSync,statfsSync} from 'node:fs'
import {resolve,join,dirname} from 'node:path'
import {parseEnv} from 'node:util'
import {randomUUID,randomBytes} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import assert from 'node:assert/strict'
export const url='https://haxxetirrcrwzwdzsdui.supabase.co'
export function a33Harness(create=false){
 process.umask(0o077)
 const marker=resolve('.recovery/hosted-test/a33-current.json'),config=parseEnv(readFileSync('.env','utf8'))
 assert.equal(config.VITE_SUPABASE_URL,url);assert(config.SUPABASE_SERVICE_ROLE_KEY&&config.VITE_SUPABASE_ANON_KEY.startsWith('sb_publishable_'))
 if(!existsSync(marker)){
  assert(create,'A33 setup required');const file=join(mkdtempSync(resolve('.recovery/hosted-test/run-')),'ledger.json')
  writeFileSync(file,JSON.stringify({approval:'A33',runId:'fs_pool_a33_'+randomBytes(6).toString('hex'),startedAt:new Date().toISOString(),users:[],workspaces:[],checks:[],keys:{},resources:{},state:{},previewBuilds:0,budget:{requests:150,writes:40,infrastructureReserve:{requests:150,writes:40},rowsReserved:0},limits:{users:2,workspaces:3,requests:1200,writes:400,rows:1000,previewBuilds:2,concurrentMutations:2}})+'\n',{mode:0o600,flag:'wx'})
  writeFileSync(marker,JSON.stringify({file})+'\n',{mode:0o600,flag:'wx'})
 }
 const file=JSON.parse(readFileSync(marker,'utf8')).file;assert(file.startsWith(resolve('.recovery/hosted-test/run-')));assert.equal(statSync(file).mode&0o077,0)
 const ledger=JSON.parse(readFileSync(file,'utf8'));assert.equal(ledger.approval,'A33')
 const save=()=>{writeFileSync(file+'.pending',JSON.stringify(ledger,null,2)+'\n',{mode:0o600,flush:true});renameSync(file+'.pending',file)}
 let mutations=0,cleanup=false
 const transport=async(input,init={})=>{
  const target=new URL(typeof input==='string'?input:input.url??input.toString());assert.equal(target.origin,url)
  assert(/^\/(auth|rest|functions)\/v1\//.test(target.pathname),'exact approved API only')
  const write=!['GET','HEAD','OPTIONS'].includes((init.method??input.method??'GET').toUpperCase()),disk=statfsSync(file)
  const readRpc=/\/rpc\/pooling_(read_[a-z_]+|client_runtime|actor_runtime|test_status|test_scenario|operation_status)$/.test(target.pathname)
  const mutating=write&&!readRpc
  assert(disk.bavail*disk.bsize>64*1024*1024,'Evidence disk guard')
  assert(ledger.budget.requests<(cleanup?1200:1080),'Reserve 120 requests for safe retirement')
  assert(!write||ledger.budget.writes<(cleanup?400:350),'Reserve 50 writes for safe retirement')
  assert(!mutating||mutations<2,'No more than two simultaneous mutations')
  ledger.budget.requests++;if(write)ledger.budget.writes++;if(mutating)mutations++;save()
  try{return await fetch(input,{...init,signal:init.signal??AbortSignal.timeout(25000),redirect:'error'})}finally{if(mutating)mutations--}
 }
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:transport}}
 const admin=createClient(url,config.SUPABASE_SERVICE_ROLE_KEY,options),client=()=>createClient(url,config.VITE_SUPABASE_ANON_KEY,options)
 const reserve=(rows=0)=>{assert(ledger.budget.rowsReserved+rows<=900,'Reserve 100 app rows for cleanup');ledger.budget.rowsReserved+=rows;save()}
 const check=(name,passed,details={})=>{ledger.checks.push({name,passed,...details,at:new Date().toISOString()});save();console.log(JSON.stringify({name,passed,...details}));assert(passed,name)}
 const key=name=>{ledger.keys[name]??=ledger.runId+'_'+name+'_'+randomUUID();save();return ledger.keys[name]}
 const rpc=async(who,name,args,rows=1)=>{reserve(rows);const {data,error}=await who.rpc(name,args);if(error)throw Error(name+':'+error.message);return data}
 const signIn=async label=>{const user=ledger.users.find(u=>u.label===label);assert(user?.id&&user.state==='active','Only new active fictional user');const c=client();const {data,error}=await c.auth.signInWithPassword({email:user.email,password:user.password});assert.ifError(error);assert.equal(data.user.id,user.id);return c}
 const edge=async(who,name,body)=>{assert(['pooling-decision','pooling-extension','pooling-context-review','pooling-weekly','pooling-suggestion','pooling-publication'].includes(name));reserve(8);const {data:{session}}=await who.auth.getSession();const response=await transport(url+'/functions/v1/'+name,{method:'POST',headers:{apikey:config.VITE_SUPABASE_ANON_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,200,JSON.stringify({name,status:response.status,error:data.error}));return data}
 return {ledger,file,directory:dirname(file),admin,client,save,reserve,check,key,rpc,signIn,edge,transport,publicKey:config.VITE_SUPABASE_ANON_KEY,beginCleanup:()=>{cleanup=true}}
}
