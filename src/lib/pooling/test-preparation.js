// Persist exact requests before sending them, so reload/lost responses reuse
// the same generation and operation key. Only fictional scenarios belong here.
export async function prepareFictionalScenario({clientId,count,scenario,storage,api,uuid}){
 if(![1,2].includes(count)||scenario.testOnly!==true||scenario.source?.id!==clientId)throw Error('Fictional scenario could not be verified.')
 const key=`fitscribe_fictional_preparation_v1:${clientId}`
 const stored=storage.getItem(key)
 const state=stored?JSON.parse(stored):{version:1,clientId,count,operation:uuid(),scenario,steps:{}}
 if(state.version!==1||state.clientId!==clientId||!state.steps)throw Error('The saved preparation cannot be read; it has not been replaced.')
 if(state.count!==count)throw Error(`Resume the pending ${state.count}-session preparation first.`)
 const save=()=>{const raw=JSON.stringify(state);storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw Error('Preparation could not be saved locally; no further request was sent.')}
 save()
 async function step(name,request,send){
  if(!state.steps[name]){state.steps[name]={request:await request()};save()}
  const item=state.steps[name]
  if(!item.receipt){item.receipt=await send(item.request);save()}
  return item.receipt
 }
 const source=state.scenario,proposals=[]
 const generation=async()=>{const current=await api.read();if(!Number.isSafeInteger(current.context?.generation))throw Error('Current context is unavailable.');return current.context.generation}
 for(let slot=0;slot<count;slot++){
  const sessionAt=new Date(Date.parse(source.at)+slot*60000).toISOString()
  for(const [field,value]of Object.entries(source.values)){
   const name=`${slot}-${field}`
   await step(name,async()=>({clientId,generation:await generation(),operationKey:`${state.operation}-${name}`,observation:{key:field,value,source:'clients',sourceId:clientId,sourceToken:source.source.token,state:'reported',unit:field==='fictional-signal'?'fixture':field==='support'?'support':'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt:source.at,sessionAt,evidenceReference:'Coach explicitly prepared this fictional software-test scenario; not a real assessment.'}}),api.confirm)
  }
  const proposal=structuredClone(source.proposal);proposal.session.sessionAt=sessionAt;proposals.push(proposal)
 }
 const parent=await step('parent',async()=>({clientId,generation:await generation(),operationKey:state.operation+'-parent',proposal:proposals[0]}),api.draft)
 const reviewed=await step('review',async()=>({clientId,draftId:parent.id,generation:await generation(),operationKey:state.operation+'-review',reference:'Explicit fictional software-test setup; no real restriction, privacy consent or professional acceptance is inferred.'}),api.review)
 const drafts=[{id:reviewed.draftId}]
 if(count===2)drafts.push(await step('second',async()=>({clientId,generation:reviewed.generation,operationKey:state.operation+'-second',proposal:proposals[1]}),api.draft))
 storage.removeItem(key)
 return {drafts,reviewed,generation:reviewed.generation,sessionAt:proposals[0].session.sessionAt}
}
