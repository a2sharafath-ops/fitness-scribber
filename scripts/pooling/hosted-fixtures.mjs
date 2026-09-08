import {readFileSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import {harness,functions,url} from './hosted-test-runtime.mjs'
const migration=JSON.parse(readFileSync('.recovery/hosted-test/baseline-l0mYAT/hosted-migration-result.json','utf8'));assert.equal(migration.passed,true)
const h=harness();console.log(JSON.stringify({runLedger:h.file,stage:'creating_fictional_fixtures'}))
const {ledger,admin,check}=h
for(const [label,role] of [['coach-a','coach'],['coach-b','coach'],['client-a','athlete'],['client-b','athlete'],['unlinked','pending']]){
 if(ledger.users.length>=6)throw Error('auth_user_cap')
 const u={label,role,email:label+'.'+ledger.runId+'@example.invalid',password:randomBytes(27).toString('base64url'),state:'create_requested'}
 ledger.users.push(u);h.save();h.reserve()
 const {data,error}=await admin.auth.admin.createUser({email:u.email,password:u.password,email_confirm:true,user_metadata:{fixture:ledger.runId,fictional:true}})
 if(error||!data.user?.id)throw Error('user_create_failed_or_unknown:'+label+':'+error?.code)
 u.id=data.user.id;u.state='active';h.save()
 await h.insert('profiles',{id:u.id,role,displayName:'Fictional pooling test '+label})
}
const id=label=>ledger.users.find(u=>u.label===label).id
for(const letter of ['a','b']){
 const cid=ledger.runId+'_client_'+letter;ledger.clientIds[letter]=cid;h.save()
 await h.insert('clients',{id:cid,coachId:id('coach-'+letter),userId:id('client-'+letter),name:'Fictional Pooling Test '+letter.toUpperCase(),goal:'general_fitness',level:'beginner',status:'active',joined:new Date().toISOString().slice(0,10),notes:'Synthetic software testing only; do not perform exercises.',intake:{fixture:ledger.runId}})
 await h.insert('settings',{coachId:id('coach-'+letter),trainerName:'Fictional Test Coach '+letter.toUpperCase(),businessName:'Engineering fixtures only',units:'kg',tz:'UTC'})
}
const coach=await h.signIn('coach-a'),athlete=await h.signIn('client-a'),other=await h.signIn('coach-b'),unlinked=await h.signIn('unlinked')
for(const [label,c,expected] of [['coach-a',coach,ledger.clientIds.a],['coach-b',other,ledger.clientIds.b],['client-a',athlete,ledger.clientIds.a],['unlinked',unlinked,null]]){
 const {data,error}=await c.from('clients').select('id');check('Classic REST visibility '+label,!error&&data.length===(expected?1:0)&&(!expected||data[0].id===expected))
}
const selfRole=await athlete.from('profiles').update({role:'admin'}).eq('id',id('client-a'));check('Self promotion denied',!!selfRole.error)
const forged=await athlete.rpc('pooling_decision_input',{verified_actor:id('coach-a'),target_client:ledger.clientIds.a,target_draft:1});check('Direct server decision RPC denied',!!forged.error)
const flagWrite=await athlete.from('pooling_runtime').update({r1:true}).eq('singleton',true);check('Client cannot enable runtime',!!flagWrite.error)
for(const name of functions){
 const options=await fetch(`${url}/functions/v1/${name}`,{method:'OPTIONS',headers:{Origin:'https://fitness-scribber-kq6i.vercel.app','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'},signal:AbortSignal.timeout(25000)})
 check(name+' CORS',options.ok&&options.headers.get('access-control-allow-origin')==='*',{status:options.status})
 const denied=await h.edge(unlinked,name,{clientId:ledger.clientIds.a,draftId:1,expectedGeneration:1,operationKey:h.key('unauthorized')})
 check(name+' malformed request rejected',denied.status===400,{status:denied.status,error:denied.data.error})
}
const disabled=await h.edge(coach,'pooling-decision',{clientId:ledger.clientIds.a,draftId:1,expectedGeneration:1})
check('Hosted decision refuses flag-off',disabled.status===409&&disabled.data.error==='feature_disabled',disabled)
ledger.state.fixturesReady=true;h.save();console.log(JSON.stringify({fixtureSetupPassed:true,runLedger:h.file,users:ledger.users.length,rowsReserved:ledger.rowsReserved}))
