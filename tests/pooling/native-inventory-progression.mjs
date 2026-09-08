// Exact kg/load-inventory integration through real SQL and JS services. These
// small fictional values are software fixtures, not accepted exercise guidance.
import assert from 'node:assert/strict'
import {sql,jsonSQL,literal,asActor,coach,athlete} from './native-connection.mjs'
import {nativeGateway} from './native-gateway.mjs'
import {createDecisionService} from '../../supabase/functions/_shared/pooling-decision.js'
import {createNumericalService} from '../../supabase/functions/_shared/pooling-numerical.js'
process.env.FITNESS_POOLING_FLOW_CLIENT='context-test-'+crypto.randomUUID()
const {nativeFixture:f}=await import('./native-flow.mjs'),run=crypto.randomUUID(),gen=()=>Number(sql(`select generation from public.pooling_contexts where client_id=${literal(f.client)}`))
const doc=jsonSQL(`select document from public.pooling_manifests where id=${literal(f.manifest.id)}`),at=f.proposal.session.sessionAt,later=new Date(Date.now()+5000).toISOString()
doc.manifest.id='kg-progression-'+run
doc.modulePolicy.requirements.push({key:'loads',source:'clients',required:true,sessionSpecific:true,unit:'load_inventory',protocol:'explicit-v1',maxAgeSeconds:3600})
Object.assign(doc.doses[0],{loadMethod:'absolute',loadKg:2,minimumLoadKg:0,maximumLoadKg:4,loadInventoryKey:'loads',comparison:{side:'not_applicable',range:'fictional',equipment:[],unit:'seconds',method:'fictional',assistance:'none',loadBasis:{unit:'kg',value:2},effortMethod:'fictional-effort'}})
doc.doses.push({...structuredClone(doc.doses[0]),id:'fictional-four-kg',loadKg:4});doc.catalogue[0].doseRefs.push('fictional-four-kg')
const policy={...doc.modulePolicy,id:'fictional-kg-progression',kind:'progression',fields:{loadKg:{min:2,max:4,increment:2,maxChange:2}},windowSeconds:3600,minimumPerformances:1,operator:'gte',comparisonThreshold:1,field:'loadKg',progressionDelta:2,performanceUnit:'completed_occurrence',aggregation:'minimum_actual'}
doc.extensionPolicies=[policy];doc.manifest.records.push(...[doc.doses[1],policy].map(({id,revision})=>({id,revision})))
sql(`update public.pooling_runtime set r1=true,r2=true,r3=true where singleton;insert into public.pooling_manifests(id,state,document) values(${literal(doc.manifest.id)},'published',${literal(doc)})`)
const source=jsonSQL(`select public.pooling_source_inventory(${literal(coach)},${literal(f.client)})`).find(r=>r.source==='clients')
const confirm=(key,value,sessionAt=at,effectiveAt=at)=>jsonSQL(asActor(`select public.pooling_confirm_source(${literal(f.client)},${gen()},${literal(crypto.randomUUID())},${literal({key,value,source:'clients',sourceId:f.client,sourceToken:source.token,state:'reported',unit:key==='loads'?'load_inventory':'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt,sessionAt,evidenceReference:'Fictional exact kg/inventory software test'})})`))
confirm('loads',{unit:'kg',loadsKg:[2]})
const proposal={...f.proposal,manifestId:doc.manifest.id}
const draft=(p,key)=>jsonSQL(asActor(`select public.pooling_save_draft(${literal(f.client)},${gen()},${literal(run+key)},${literal(p)})`))
const base=draft(proposal,'base'),decision=await createDecisionService(nativeGateway())({clientId:f.client,draftId:base.id,expectedGeneration:gen()})
assert.equal(decision.result.blocks[0].dose.prescription.loadKg,2)
const assignment=jsonSQL(asActor(`select public.pooling_approve(${literal(f.client)},${base.id},${decision.receipt.decisionId},${gen()},${literal(run+'approve')})`))
const execute=(kind,payload)=>jsonSQL(asActor(`select public.pooling_execution(${assignment.assignmentId},${gen()},${literal(crypto.randomUUID())},${literal(kind)},${literal(payload)})`,athlete))
execute('start',{healthChange:'no_change'});execute('actual',{occurrenceId:'synthetic-occ1',setIndex:1,actual:1,unit:'seconds',loadKg:2,effort:0,effortMethod:'fictional-effort'});execute('complete',{})
for(const [key,value]of [['health','no_change'],['equipment',[]],['loads',{unit:'kg',loadsKg:[2]}]])confirm(key,value,later)
const target=draft({...proposal,session:{...proposal.session,sessionAt:later}},'target')
const intent=jsonSQL(asActor(`select public.pooling_request_extension(${literal(f.client)},${gen()},${literal(run+'intent')},${literal({kind:'progression',date:proposal.date,requestedChange:'Fictional kg/inventory comparison',blocks:[],authority:'none',state:'review_requested'})})`))
const input=()=>({clientId:f.client,draftId:target.id,expectedGeneration:gen(),requestId:intent.id,baselineAssignmentId:assignment.assignmentId,policyId:policy.id})
const absent=await createNumericalService(nativeGateway())(input());assert.equal(absent.result.state,'dose_review_required');assert.equal(absent.result.suggestedDraft,null)
// A changed inventory is a later observation, not contradictory equal-time data.
confirm('loads',{unit:'kg',loadsKg:[2,4]},later,new Date(Math.min(Date.now(),Date.parse(later)-1)).toISOString())
const current=draft({...proposal,session:{...proposal.session,sessionAt:later}},'confirmed-target')
const result=await createNumericalService(nativeGateway())({...input(),draftId:current.id})
assert.equal(result.result.state,'proposal');assert.equal(result.result.prescriptionChanges[0].from.loadKg,2);assert.equal(result.result.prescriptionChanges[0].to.loadKg,4)
assert.equal(jsonSQL(`select proposal from public.pooling_drafts where id=${base.id}`).selection[0].doseId,doc.doses[0].id)
console.log(JSON.stringify({passed:true,test:'Exact actual 2kg history proposes admitted 4kg only after target-session inventory confirmation; original retained',client:f.client}))
export const inventoryFixture={...f,proposal:{...proposal,session:{...proposal.session,sessionAt:later}},manifest:doc.manifest,generation:gen(),request:intent,numerical:result,baseline:assignment,target:current}
