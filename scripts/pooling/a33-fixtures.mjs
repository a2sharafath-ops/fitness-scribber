// New A33 fictional records only; live provider JWT/REST/Edge verification.
import assert from 'node:assert/strict'
import {a33Harness} from './a33-runtime.mjs'
import {prepareFictionalScenario} from '../../src/lib/pooling/test-preparation.js'
const h=a33Harness(),{ledger,admin}=h;assert(ledger.setup.passed)
const a=ledger.workspaces.find(w=>w.label==='a33-a'&&w.slot===1),b=ledger.workspaces.find(w=>w.label==='a33-a'&&w.slot===2)
const actor=await h.signIn('a33-a'),other=await h.signIn('a33-b'),state=ledger.state.kg??={};h.save()
const read=async(table,columns,field,id)=>{const r=await admin.from(table).select(columns).eq(field,id).single();assert.ifError(r.error);return r.data}
const gen=async()=>Number((await read('pooling_contexts','generation','client_id',a.clientId)).generation)
const rpc=(name,args,rows=1)=>h.rpc(actor,name,args,rows)
const document=await read('pooling_manifests','document','id',a.manifestId)
if(!state.document){
 const doc=structuredClone(document.document)
 doc.modulePolicy.requirements.push({key:'loads',source:'clients',required:true,sessionSpecific:true,unit:'load_inventory',protocol:'explicit-v1',maxAgeSeconds:3600})
 Object.assign(doc.doses[0],{sets:1,loadMethod:'absolute',loadKg:2,minimumLoadKg:0,maximumLoadKg:4,loadInventoryKey:'loads',comparison:{side:'not_applicable',range:'fictional',equipment:[],unit:'seconds',method:'fictional',assistance:'none',loadBasis:{unit:'kg',value:2},effortMethod:'fictional-effort'}})
 doc.doses=[doc.doses[0],{...structuredClone(doc.doses[0]),id:'fictional-four-kg',loadKg:4}]
 doc.catalogue.forEach(e=>{e.doseRefs=doc.doses.map(d=>d.id);e.settings=['home','travel']})
 const policy={...structuredClone(doc.modulePolicy),id:'fictional-kg-progression',kind:'progression',fields:{loadKg:{min:2,max:4,increment:2,maxChange:2}},windowSeconds:3600,minimumPerformances:1,operator:'gte',comparisonThreshold:1,field:'loadKg',progressionDelta:2,performanceUnit:'completed_occurrence',aggregation:'minimum_actual'}
 doc.extensionPolicies=[policy];doc.manifest.records=[doc.modulePolicy,...doc.catalogue,...doc.doses,policy].map(({id,revision})=>({id,revision}))
 state.document=doc;h.save()
}
const kgManifest=a.clientId+'_a33_kg_manifest'
state.document.manifest.id=kgManifest;state.document.manifest.releaseEvidence='Fictional A33 kg/inventory software fixture only; no professional acceptance.';h.save()
if(!state.manifestReady){
 const old=await admin.from('pooling_manifests').select('document,state').eq('id',kgManifest).maybeSingle();assert.ifError(old.error)
 if(old.data){assert.deepEqual(old.data.document,state.document);assert.equal(old.data.state,'published')}
 else{h.reserve(1);const r=await admin.from('pooling_manifests').insert({id:kgManifest,state:'published',document:state.document});assert.ifError(r.error)}
 const mapped=await admin.from('pooling_engineering_releases').select('*').eq('client_id',a.clientId).maybeSingle();assert.ifError(mapped.error)
 if(mapped.data)assert.equal(mapped.data.manifest_id,kgManifest)
 else{h.reserve(1);const r=await admin.from('pooling_engineering_releases').insert({client_id:a.clientId,manifest_id:kgManifest,run_id:ledger.runId});assert.ifError(r.error)}
 state.manifestReady=true;h.save()
}
if(!state.prepared){
 if(!state.scenario){state.scenario=await rpc('pooling_test_scenario',{target_client:a.clientId},0);state.scenario.proposal.manifestId=kgManifest;state.scenario.values.loads={unit:'kg',loadsKg:[2]};h.save()}
 const storage={getItem:k=>state.storage?.[k]??null,setItem:(k,v)=>{state.storage??={};state.storage[k]=v;h.save()},removeItem:k=>{delete state.storage[k];h.save()}}
 state.prepared=await prepareFictionalScenario({clientId:a.clientId,count:1,scenario:state.scenario,storage,uuid:()=>h.key('kg-preparation'),api:{
  read:async()=>({context:{generation:await gen()}}),
  confirm:r=>rpc('pooling_confirm_source',{target_client:a.clientId,expected_generation:r.generation,operation_key:r.operationKey,observation:r.observation.key==='loads'?{...r.observation,unit:'load_inventory'}:r.observation},2),
  draft:r=>rpc('pooling_save_draft',{target_client:a.clientId,expected_generation:r.generation,operation_key:r.operationKey,proposal:r.proposal}),
  review:async r=>(await h.edge(actor,'pooling-context-review',{clientId:a.clientId,draftId:r.draftId,expectedGeneration:r.generation,operationKey:r.operationKey,reference:r.reference})).receipt,
 }});h.save()
}
// All initial explicit load evidence is recorded before the kg decision.
const at=state.prepared.sessionAt
const confirm=async(name,key,value,sessionAt=at,effectiveAt=state.scenario.at)=>{
 if(state[name])return state[name]
 const inventory=await rpc('pooling_read_source_review',{target_client:a.clientId},0)
 const source=inventory.sources.find(s=>s.source==='clients'&&s.id===a.clientId);assert(source)
 const args={target_client:a.clientId,expected_generation:await gen(),operation_key:h.key(name),observation:{key,value,source:'clients',sourceId:a.clientId,sourceToken:source.token,state:'reported',unit:key==='loads'?'load_inventory':'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt,sessionAt,evidenceReference:'Fictional A33 exact kg/inventory software verification; no exercise authority'}}
 state[name+'Args']??=args;h.save();state[name]=await rpc('pooling_confirm_source',state[name+'Args'],2);h.save();return state[name]
}
const draft=async(name,proposal)=>{
 if(state[name])return state[name]
 state[name+'Args']??={target_client:a.clientId,expected_generation:await gen(),operation_key:h.key(name),proposal};h.save()
 state[name]=await rpc('pooling_save_draft',state[name+'Args']);h.save();return state[name]
}
await confirm('initial-loads','loads',{unit:'kg',loadsKg:[2]})
if(!state.proposal){state.proposal=(await read('pooling_drafts','proposal','id',state.prepared.drafts[0].id)).proposal;h.save()}
const base=await draft('base',state.proposal)
if(!state.assignment){
 const decision=await h.edge(actor,'pooling-decision',{clientId:a.clientId,draftId:base.id,expectedGeneration:await gen()})
 assert.equal(decision.result.completeness,'ready_for_coach_review');assert.equal(decision.result.blocks[0].dose.prescription.loadKg,2)
 state.assignment=await rpc('pooling_approve',{target_client:a.clientId,draft_id:base.id,decision_id:decision.receipt.decisionId,expected_generation:await gen(),operation_key:h.key('kg-approve')},2);h.save()
}
for(const [kind,payload]of [['start',{healthChange:'no_change'}],['actual',{occurrenceId:state.proposal.selection[0].occurrenceId,setIndex:1,actual:1,unit:'seconds',loadKg:2,effort:0,effortMethod:'fictional-effort'}],['complete',{}]]){
 if(state[kind])continue
 state[kind]=await rpc('pooling_execution',{assignment_id:state.assignment.assignmentId,expected_generation:await gen(),operation_key:h.key('kg-'+kind),event_kind:kind,event_payload:payload});h.save()
}
if(!state.later){state.later=new Date(Date.now()+5000).toISOString();h.save()}
for(const [key,value]of [['health','no_change'],['equipment',[]],['loads',{unit:'kg',loadsKg:[2]}]])await confirm('target-'+key,key,value,state.later)
const proposal={...state.proposal,session:{...state.proposal.session,sessionAt:state.later}}
const target=await draft('target',proposal)
if(!state.request){state.request=await rpc('pooling_request_extension',{target_client:a.clientId,expected_generation:await gen(),operation_key:h.key('kg-request'),proposal:{kind:'progression',date:proposal.date,requestedChange:'Fictional 2kg to 4kg inventory comparison',blocks:[],authority:'none',state:'review_requested'}});h.save()}
const input=async id=>({clientId:a.clientId,draftId:id,expectedGeneration:await gen(),requestId:state.request.id,baselineAssignmentId:state.assignment.assignmentId,policyId:'fictional-kg-progression'})
if(!state.absent){state.absent=await h.edge(actor,'pooling-extension',await input(target.id));h.save();h.check('Hosted 4kg is unavailable without confirmed target inventory',state.absent.result.state==='dose_review_required'&&state.absent.result.suggestedDraft===null)}
if(!state.inventoryAt){state.inventoryAt=new Date(Math.min(Date.now(),Date.parse(state.later)-1)).toISOString();h.save()}
await confirm('expanded-loads','loads',{unit:'kg',loadsKg:[2,4]},state.later,state.inventoryAt)
const current=await draft('current',proposal)
if(!state.numerical){state.numerical=await h.edge(actor,'pooling-extension',await input(current.id));h.save()}
h.check('Hosted exact 2kg actual proposes admitted 4kg after target inventory confirmation',state.numerical.result.state==='proposal'&&state.numerical.result.prescriptionChanges[0].from.loadKg===2&&state.numerical.result.prescriptionChanges[0].to.loadKg===4)
const originals=await read('pooling_drafts','proposal','id',base.id);assert.deepEqual(originals.proposal,state.proposal)
// Legacy import sources owned ONLY by the new fictional coach. They exercise
// the Classic-to-governed bridge; they are not assigned pooling sessions.
if(!state.imports){
 const exerciseId=h.key('legacy-exercise'),blocks=[{blockId:'fixture-block',blockType:'Main Lifts',order:1,exercises:[{exerciseId:'fixture-occurrence',exerciseDbRef:exerciseId,exerciseName:'FICTIONAL IMPORT — DO NOT PERFORM',order:1,intensityType:'Load',sets:[{setId:'fixture-set',setNumber:1,prescribedReps:1,prescribedLoadKg:0,prescribedRestSeconds:0,completedReps:9,completedLoadKg:9,status:'Completed'}]}]}]
 const priorDate=new Date(Date.parse(proposal.date)-86400000).toISOString().slice(0,10)
 for(const [table,row]of [['exercises',{id:exerciseId,coachId:a.coachId,name:'FICTIONAL IMPORT — DO NOT PERFORM'}],['prescriptions',{id:h.key('legacy-prescription'),clientId:a.clientId,coachId:a.coachId,date:priorDate,blocks,items:[],notes:'PRIVATE FICTIONAL A33 NOTE'}],['templates',{id:h.key('legacy-template'),coachId:a.coachId,name:'Fictional A33 saved template',blocks,items:[]}]]){
  const old=await admin.from(table).select('id').eq('id',row.id).maybeSingle();assert.ifError(old.error)
  if(!old.data){h.reserve(2);const r=await admin.from(table).insert(row);assert.ifError(r.error)}
 }
 state.imports={exerciseId,priorDate,blocks};h.save()
}
const primary=await rpc('pooling_test_status',{},0);assert.equal(primary.clientId,a.clientId)
const secondary=await rpc('pooling_create_engineering_secondary',{acknowledged:true},0);assert.equal(secondary.clientId,b.clientId)
const forbidden=await other.rpc('pooling_client_runtime',{target_client:a.clientId});h.check('New account B cannot read account A workspace runtime',forbidden.error?.message==='forbidden')
const scope=await other.rpc('pooling_create_engineering_secondary',{acknowledged:true});h.check('Single-slot engineering account cannot create secondary workspace',scope.error?.message==='engineering_slot_forbidden')
state.generation=await gen();state.ready=true;h.save()
console.log(JSON.stringify({fixtureReady:true,generation:state.generation,budget:ledger.budget}))
