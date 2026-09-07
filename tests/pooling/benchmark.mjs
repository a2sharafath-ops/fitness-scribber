// Synthetic performance measurement only, not clinical or hosted-backend evidence.
import { performance } from 'node:perf_hooks'
import { cpus } from 'node:os'
import { resolveContext } from '../../src/lib/pooling/context.js'
import { selectPool } from '../../src/lib/pooling/selection.js'
const at='2026-09-07T12:00:00Z'
const approved=(id,extra={})=>({id,revision:1,reviewStatus:'published',automationEligible:true,rightsStatus:'accepted',
  approvalEvidence:['content','rights','scope'].map(kind=>({kind,decision:'accepted',reviewerId:'fictional',reference:'synthetic-only',revision:1})),...extra})
const requirements=Array.from({length:500},(_,i)=>({key:`synthetic-${i}`,source:'synthetic',unit:'boolean',protocol:'synthetic',maxAgeSeconds:1,required:true}))
const observations=requirements.map(row=>({id:row.key,clientId:'synthetic',source:row.source,key:row.key,value:true,unit:row.unit,protocol:row.protocol,state:'reported',quality:'confirmed',confirmedBy:'fictional',confirmedAt:at,effectiveAt:at,recordedAt:at}))
const contextInput={clientId:'synthetic',generation:1,sessionAt:at,knowledgeCutoff:at,timeZone:'UTC',requirements,observations,sourceStatus:{synthetic:'loaded'},healthChange:'no_change',adultConfirmed:true,purposePermitted:true,scope:'adult_general_fitness'}
const catalogue=Array.from({length:2000},(_,i)=>approved(`synthetic-ex-${String(i).padStart(4,'0')}`,{scopes:['adult_general_fitness'],settings:['home'],levels:['beginner'],equipment:[],prerequisites:[],demands:[],roles:['main'],doseRefs:['synthetic-dose']}))
const doses=[approved('synthetic-dose',{sets:1,workSeconds:1,restSeconds:0,setupSeconds:0,transitionSeconds:0,sideMultiplier:1})]
const manifest={id:'synthetic-only',state:'published',releaseEvidence:'synthetic-only',records:[...catalogue,...doses].map(({id,revision})=>({id,revision}))}
const request={scope:'adult_general_fitness',setting:'home',level:'beginner',equipmentConfirmed:true,equipment:[],roles:[{id:'main',required:true}],budgetSeconds:10}
const samples=[]
for(let index=0;index<22;index++){
  const start=performance.now()
  const context=resolveContext(contextInput)
  const result=selectPool({context,catalogue,doses,manifest,request})
  if(result.completeness!=='ready_for_coach_review') throw new Error('Synthetic benchmark fixture failed')
  if(index>=2) samples.push(performance.now()-start)
}
samples.sort((a,b)=>a-b)
const p95=samples[Math.ceil(samples.length*.95)-1]
console.log(JSON.stringify({platform:process.platform,architecture:process.arch,cpu:cpus()[0]?.model,observations:500,variants:2000,samples:samples.length,p95Ms:+p95.toFixed(2),proposedBudgetMs:250,meetsProposedBudget:p95<250,scope:'pure engine synthetic only; no backend/UI concurrency measurement'},null,2))
