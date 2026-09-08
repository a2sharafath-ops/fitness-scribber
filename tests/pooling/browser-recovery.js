import {runRecoverableOperation,PoolingError} from '../../src/lib/pooling/recovery-transport.js'
import {OPERATION_KEY,pendingOperations} from '../../src/lib/pooling/operations.js'
import {canonicalProposal} from '../../src/lib/pooling/review.js'

document.querySelector('#run').onclick=async()=>{
 const results=[],check=(name,condition)=>{results.push({name,passed:!!condition});if(!condition)throw Error(name)}
 const reject=async(fn,code)=>{try{await fn();return false}catch(error){return error.code===code}}
 // Fresh isolated browser context, separate test origin. Do not erase an
 // existing journal, even if someone opens this fixture outside the test runner.
 if(localStorage.getItem(OPERATION_KEY)!==null)throw Error('Fresh browser context required')
 const lock=fn=>navigator.locks.request(OPERATION_KEY,fn),scope='fictional-a:fictional-client'
 let actor='fictional-a',sent=0,commits=0,drop=true
 const receipt={status:'saved',id:1,draftId:2},request={clientId:'fictional-client',operationKey:crypto.randomUUID(),action:'accept',proposalId:1,reason:'Fictional extension response-loss test'}
 const options={scope,kind:'extension_review',request,storage:localStorage,lock,assertScope:async()=>{if(actor!=='fictional-a')throw new PoolingError('session_mismatch','Changed actor')},send:async()=>{sent++;if(!commits)commits++;if(drop){drop=false;throw new PoolingError('outcome_unknown','Dropped simulated extension response')}return receipt}}
 try{
  check('Browser Web Locks and durable storage available',!!navigator.locks)
  check('Extension response-loss remains pending',await reject(()=>runRecoverableOperation(options),'outcome_unknown')&&pendingOperations(localStorage,scope).length===1)
  actor='fictional-b'
  check('Other account cannot adopt original key',await reject(()=>runRecoverableOperation({...options,scope:'fictional-b:fictional-client',assertScope:async()=>{}}),'session_mismatch')&&sent===1)
  actor='fictional-a'
  await runRecoverableOperation(options)
  check('Original account reconciles exact extension key once',commits===1&&sent===2&&pendingOperations(localStorage,scope).length===0)
  let release,locked
  const acquired=new Promise(resolve=>{locked=resolve})
  const holder=navigator.locks.request(OPERATION_KEY,async()=>{locked();await new Promise(resolve=>{release=resolve})})
  await acquired
  const waiting=runRecoverableOperation({...options,request:{...request,operationKey:crypto.randomUUID()}})
  actor='fictional-b';release();await holder
  check('Real lock queue plus account switch sends nothing',await reject(()=>waiting,'session_mismatch')&&sent===2)
  actor='fictional-a'
  const pendingKey=crypto.randomUUID(),expired={...options,request:{...request,operationKey:pendingKey},send:async()=>{throw new PoolingError('outcome_unknown','Synthetic expired HTTP token')}}
  check('Forced-expiry failure preserves pending key',await reject(()=>runRecoverableOperation(expired),'outcome_unknown')&&pendingOperations(localStorage,scope).some(r=>r.request.operationKey===pendingKey))
  await runRecoverableOperation({...expired,send:async()=>receipt})
  check('Same account after refresh reconciles original key',!pendingOperations(localStorage,scope).some(r=>r.request.operationKey===pendingKey))
  const quotaKeys=[]
  try{
   let full=false
   for(let i=0;i<64;i++){const key='fictional-quota-'+i;try{localStorage.setItem(key,'x'.repeat(256*1024));quotaKeys.push(key)}catch(error){full=error.name==='QuotaExceededError';break}}
   check('Actual bounded Web Storage quota reached',full)
   // Near a quota boundary a small request could still fit. A 512KiB
   // additional journal entry must fail before any send at this point.
   check('Actual browser quota blocks write before network',await reject(()=>runRecoverableOperation({...options,request:{...request,operationKey:crypto.randomUUID(),reason:'x'.repeat(512*1024)}}),'failed_save')&&sent===2)
  }finally{for(const key of quotaKeys)localStorage.removeItem(key)}
  check('Quota cleanup preserves previous pending records',pendingOperations(localStorage,scope).length===1)
  const base={manifestId:'fictional',request:{setting:'travel',level:'beginner',budgetSeconds:60,roles:[{id:'main',required:true}]},selection:[{occurrenceId:'fixture',role:'main',exerciseId:'fixture',exerciseRevision:1,doseId:'fixture',doseRevision:1}]}
  const tokyo=canonicalProposal({...base,date:'2026-09-09',sessionAt:'2026-09-08T23:30:00Z',timeZone:'Asia/Tokyo'})
  const la=canonicalProposal({...base,date:'2026-09-08',sessionAt:'2026-09-08T23:30:00Z',timeZone:'America/Los_Angeles'})
  check('Travel zone changes explicit date, never session instant',tokyo.date!==la.date&&tokyo.session.sessionAt===la.session.sessionAt)
  let mismatch=false;try{canonicalProposal({...base,date:'2026-09-08',sessionAt:'2026-09-08T23:30:00Z',timeZone:'Asia/Tokyo'})}catch{mismatch=true}
  check('Travel date mismatch requires explicit correction',mismatch)
  document.querySelector('#result').textContent=JSON.stringify({passed:true,results})
 }catch(error){document.querySelector('#result').textContent=JSON.stringify({passed:false,error:error.message,results})}
}
