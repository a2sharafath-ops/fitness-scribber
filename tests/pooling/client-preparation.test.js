import {test} from 'node:test'
import assert from 'node:assert/strict'
import {developmentRelease} from '../../scripts/pooling/development-release.mjs'
import {admission,selectPool,resolveDose} from '../../src/lib/pooling/selection.js'
import {clientPreparation,preparationDefaults,latestRecord} from '../../src/lib/pooling/client-preparation.js'
import {buildSourceSnapshot} from '../../src/lib/pooling/sources.js'
import {resolveContext} from '../../src/lib/pooling/context.js'
const at='2026-09-09T10:00:00.000Z',sessionAt='2026-09-09T10:05:00.000Z'
const fixture=()=>({at,generation:1,release:developmentRelease(),data:{clients:[{id:'normal-client',level:'Intermediate'}],wellness:[{id:'wellness',date:'2026-09-09',sleep:5,stress:6,fatigue:3,soreness:2}]},sources:[{source:'clients',id:'normal-client',status:'loaded',token:'client-token'},{source:'wellness',id:'wellness',status:'loaded',token:'wellness-token'}]})
test('development content has no invented professional approvals and cannot enter production admission',()=>{
 const doc=developmentRelease();assert.equal(doc.catalogue.length,48)
 for(const record of [doc.modulePolicy,...doc.catalogue,...doc.doses,...doc.extensionPolicies]){
  assert.deepEqual(record.approvalEvidence,[]);assert(admission(record,doc.manifest));assert(!admission(record,{...doc.manifest,audience:'production'}))
 }
})
test('existing records seed visible values, not unconfirmed adult or health authority',()=>{
 const context=fixture(),form=preparationDefaults(context)
 assert.equal(form.level,'intermediate');assert.equal(form.adult,false);assert.equal(form.health,'');assert.deepEqual(form.prerequisites,[])
 assert.throws(()=>clientPreparation(context,form,sessionAt,'Asia/Kolkata'),/Review/)
 assert.equal(latestRecord([{date:'2026-09-10'},{date:'2026-09-08'}],()=>true,at).date,'2026-09-08')
})
test('development resistance variants cannot inherit bodyweight prescriptions even when demand metadata omits external load',()=>{
 const doc=developmentRelease()
 for(const id of ['EX-014','EX-017','EX-028','EX-029','EX-035','EX-036','EX-037','EX-040','EX-046']) {
  const exercise=doc.catalogue.find(row=>row.id===id)
  for(const dose of doc.doses)assert.deepEqual(resolveDose(exercise,dose,doc.manifest),{state:'unresolved',reasons:['reviewed_resistance_prescription_required']},id)
 }
 assert.equal(resolveDose(doc.catalogue.find(row=>row.id==='EX-015'),doc.doses[0],doc.manifest).state,'resolved')
})
test('reviewed normal client inputs retain exact source lineage and produce a complete bodyweight workout',()=>{
 const input=fixture(),doc=input.release,form={...preparationDefaults(input),adult:true,health:'no_change',equipmentReviewed:true,sourcesReviewed:true,
  equipment:['mat','stable_chair','fixed_support','clear_wall'],prerequisites:doc.modulePolicy.requirements.filter(r=>r.source==='clients').map(r=>r.key)}
 const prepared=clientPreparation(input,form,sessionAt,'Asia/Kolkata')
 assert.equal(prepared.proposal.date,'2026-09-09')
 assert.equal(prepared.observations.find(o=>o.key==='external_load_prescription_reviewed').state,'unknown')
 const stress=prepared.observations.find(o=>o.key==='stress');assert.equal(stress.value,6);assert.equal(stress.sourceId,'wellness');assert.equal(stress.effectiveAt,'2026-09-09T00:00:00.000Z')
 const bundle={clientId:'normal-client',generation:1,cutoff:at,modulePolicy:doc.modulePolicy,manifest:doc.manifest,session:prepared.proposal.session,purposeAuthority:true,authorityValidUntil:'2026-10-09T10:00:00Z',restrictions:[],sources:input.sources,
  confirmations:prepared.observations.map((observation,i)=>({id:i+1,clientId:'normal-client',observation,confirmedBy:'coach',confirmedAt:at,recordedAt:at}))}
 const snapshot=buildSourceSnapshot(bundle),context=resolveContext(snapshot.contextInput)
 assert.equal(context.state,'eligible_for_coach_review')
 const pool=selectPool({context,request:snapshot.sessionRequest,catalogue:doc.catalogue,doses:doc.doses,manifest:doc.manifest})
 assert.equal(pool.completeness,'ready_for_coach_review',JSON.stringify(pool.gaps))
 assert(pool.blocks.every(b=>b.dose.prescription.sets===2));assert(pool.blocks.length>=3)
 assert(pool.blocks.every(b=>!doc.catalogue.find(e=>e.id===b.exerciseId).demands.includes('external_load')))
 bundle.sources[0].token='changed'
 assert.notEqual(resolveContext(buildSourceSnapshot(bundle).contextInput).state,'eligible_for_coach_review')
})
