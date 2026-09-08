// Private, bounded A30 synthetic-only API harness. Never imported by the app.
import {readFileSync,writeFileSync,mkdtempSync,statSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {parseEnv} from 'node:util'
import {randomBytes,randomUUID} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
export const ref='haxxetirrcrwzwdzsdui',url=`https://${ref}.supabase.co`
export const functions=['pooling-decision','pooling-extension','pooling-context-review','pooling-weekly','pooling-suggestion','pooling-publication']
export function harness(file){
 process.umask(0o077)
 const config=parseEnv(readFileSync('.env','utf8'))
 if(config.VITE_SUPABASE_URL!==url || !config.VITE_SUPABASE_ANON_KEY?.startsWith('sb_publishable_') || !config.SUPABASE_SERVICE_ROLE_KEY)throw Error('exact_existing_backend_required')
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init={})=>fetch(input,{...init,signal:AbortSignal.timeout(25000)})}}
 const admin=createClient(url,config.SUPABASE_SERVICE_ROLE_KEY,options),client=()=>createClient(url,config.VITE_SUPABASE_ANON_KEY,options)
 let ledger
 if(file){file=resolve(file);if(!file.startsWith(resolve('.recovery/hosted-test/run-'))||statSync(file).mode&0o077)throw Error('private_run_ledger_required');ledger=JSON.parse(readFileSync(file,'utf8'));if(ledger.projectRef!==ref)throw Error('wrong_project')}
 else{
  const dir=mkdtempSync(resolve('.recovery/hosted-test/run-'))
  file=join(dir,'ledger.json')
  ledger={runId:'fs_pool_e2e_20260908_'+randomBytes(4).toString('hex'),projectRef:ref,startedAt:new Date().toISOString(),users:[],clientIds:{},rowsReserved:0,apiCalls:0,checks:[],resources:{},state:{},limits:{users:6,rows:1000,previewBuilds:10,storageBytes:10485760},previewBuilds:1}
 }
 const save=()=>writeFileSync(file,JSON.stringify(ledger,null,2)+'\n',{mode:0o600})
 save()
 const reserve=(rows=0)=>{if(ledger.rowsReserved+rows>900)throw Error('row_budget_guard_reserve_100_for_ui');if(ledger.apiCalls>=800)throw Error('bounded_api_call_guard');ledger.rowsReserved+=rows;ledger.apiCalls++;save()}
 function check(name,passed,details={}){ledger.checks.push({name,passed,...details,at:new Date().toISOString()});save();console.log(JSON.stringify({name,passed,...details}));if(!passed)throw Error('check_failed:'+name)}
 async function insert(table,rows){if(!Array.isArray(rows))rows=[rows];reserve(rows.length*2);const {data,error}=await admin.from(table).insert(rows).select();if(error)throw Error('fixture_insert_'+table+':'+error.code);ledger.resources[table]??=[];ledger.resources[table].push(...data.map(r=>r.id??r.client_id??r.coachId??r.actor_id));save();return data}
 async function rpc(who,name,args,rows=0){reserve(rows);const {data,error}=await who.rpc(name,args);if(error){const e=Error(error.message);e.code=error.code;throw e}return data}
 async function signIn(label){const u=ledger.users.find(u=>u.label===label);if(!u?.id)throw Error('fixture_user_missing');const c=client();reserve();const {data,error}=await c.auth.signInWithPassword({email:u.email,password:u.password});if(error||data.user?.id!==u.id)throw Error('fictional_signin_failed:'+label+':'+error?.code);return c}
 async function edge(who,name,body,{rawToken}={}){if(!functions.includes(name))throw Error('unapproved_function');reserve(8);const {data:{session}}=await who.auth.getSession();const response=await fetch(`${url}/functions/v1/${name}`,{method:'POST',headers:{apikey:config.VITE_SUPABASE_ANON_KEY,Authorization:'Bearer '+(rawToken??session?.access_token??''),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const data=await response.json();return {status:response.status,data}}
 const key=s=>{ledger.operationKeys??={};if(!ledger.operationKeys[s]){ledger.operationKeys[s]=ledger.runId+'_'+s+'_'+randomUUID();save()}return ledger.operationKeys[s]}
 return {ledger,file,admin,client,save,reserve,check,insert,rpc,signIn,edge,key,publicKey:config.VITE_SUPABASE_ANON_KEY}
}
