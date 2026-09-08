import test from 'node:test'
import assert from 'node:assert/strict'
import {numericalProposal} from '../../src/lib/pooling/numerical-proposals.js'
import {buildSourceSnapshot} from '../../src/lib/pooling/sources.js'
import {resolveDose} from '../../src/lib/pooling/selection.js'
import {bundle} from './source-fixture.js'
function fixture(){
 const source=bundle(),contextInput=buildSourceSnapshot(source).contextInput
 const policy={...source.modulePolicy,id:'fictional-daily',kind:'daily',fields:{workSeconds:{min:1,max:2,increment:1,maxChange:1}},signalRules:[{id:'synthetic',key:'adult',operator:'equals',threshold:true,delta:1,field:'workSeconds',roles:['main']}]}
 const exercise={...source.modulePolicy,id:'ex',doseRefs:['d1','d2']},dose={...source.modulePolicy,id:'d1',sets:1,workSeconds:1,restSeconds:0,setupSeconds:0,transitionSeconds:0,sideMultiplier:1},dose2={...dose,id:'d2',workSeconds:2}
 const manifest={...source.manifest,records:[source.modulePolicy,policy,exercise,dose,dose2].map(({id,revision})=>({id,revision}))}
 const selection=[{occurrenceId:'one',exerciseId:'ex',exerciseRevision:1,doseId:'d1',doseRevision:1,role:'main'}]
 return {kind:'daily',contextInput,held:false,policy,manifest,catalogue:[exercise],doses:[dose,dose2],baselineAssignmentId:1,baselineRevision:1,baselineBlocks:[{...selection[0],dose:resolveDose(exercise,dose,manifest)}],targetProposal:{date:'2026-09-07',selection}}
}
test('numerical effects only choose an exact separately reviewed dose',()=>{const input=fixture(),result=numericalProposal(input);assert.equal(result.state,'proposal');assert.equal(result.suggestedDraft.selection[0].doseId,'d2');assert.equal(input.targetProposal.selection[0].doseId,'d1');assert.equal(result.assignment,null)})
test('missing reviewed dose leaves a visible gap, never a generated numeric prescription',()=>{const input=fixture();input.doses.pop();const result=numericalProposal(input);assert.equal(result.state,'dose_review_required');assert.equal(result.suggestedDraft,null);assert.equal(result.effects[0].to,2)})
test('authoritative hold wins over otherwise sufficient daily signals',()=>{const input=fixture();input.held=true;const result=numericalProposal(input);assert.equal(result.state,'hold');assert.deepEqual(result.effects,[])})
test('partial performed occurrence is not numerically rewritten',()=>{const input=fixture();input.completedOccurrences=['one'];const result=numericalProposal(input);assert.equal(result.state,'no_change');assert.equal(result.suggestedDraft,null)})
test('unmapped baseline occurrence cannot receive another exercise dose',()=>{const input=fixture();input.targetProposal.selection[0].exerciseId='different';const result=numericalProposal(input);assert.equal(result.state,'dose_review_required');assert.equal(result.gaps[0].reason,'baseline_identity_changed')})
test('R2-T13: full reps, sides and duration comparison is derived from exact admitted doses',()=>{
 const i=fixture();Object.assign(i.doses[0],{mode:'repetitions',reps:5});Object.assign(i.doses[1],{mode:'repetitions',reps:6,sideMultiplier:2})
 i.policy.fields={workSeconds:{min:1,max:2,increment:1,maxChange:1},reps:{min:5,max:6,increment:1,maxChange:1},sideMultiplier:{min:1,max:2,increment:1,maxChange:1}}
 i.policy.signalRules=['workSeconds','reps','sideMultiplier'].map(field=>({id:field,key:'adult',operator:'equals',threshold:true,delta:1,field,roles:['main']}))
 i.baselineBlocks[0].dose=resolveDose(i.catalogue[0],i.doses[0],i.manifest)
 const result=numericalProposal(i),change=result.prescriptionChanges[0]
 assert.equal(result.state,'proposal');assert.equal(change.from.reps,5);assert.equal(change.to.reps,6);assert.equal(change.from.sideMultiplier,1);assert.equal(change.to.sideMultiplier,2);assert.equal(change.from.durationSeconds,1);assert.equal(change.to.durationSeconds,4)
 assert.equal(i.baselineBlocks[0].dose.prescription.reps,5);assert.equal(result.assignment,null)
})
test('R3-T08: exact fictional 40 to 42 kg progression requires available 42 and a separately admitted dose',()=>{
 const i=fixture();i.kind='progression';Object.assign(i.policy,{kind:'progression',fields:{loadKg:{min:40,max:42,increment:2,maxChange:2}},windowSeconds:86400,minimumPerformances:1,operator:'gte',comparisonThreshold:40,field:'loadKg',progressionDelta:2,performanceUnit:'completed_occurrence',aggregation:'minimum_actual'})
 i.contextInput.requirements.push({key:'loads',source:'clients',required:true,unit:'load_inventory',protocol:'explicit-v1',maxAgeSeconds:60})
 i.contextInput.observations.push({...i.contextInput.observations[0],id:'inventory',key:'loads',unit:'load_inventory',value:{unit:'kg',loadsKg:[40,42]}})
 const comparison={side:'not_applicable',range:'fictional',equipment:[],unit:'kg',method:'fictional',assistance:'none',loadBasis:'actual'}
 for(const [index,dose]of i.doses.entries())Object.assign(dose,{workSeconds:1,loadMethod:'absolute',loadKg:index?42:40,minimumLoadKg:40,maximumLoadKg:42,loadInventoryKey:'loads',comparison})
 const context={facts:{loads:{state:'usable',value:{unit:'kg',loadsKg:[40,42]}}}}
 i.baselineBlocks[0].dose=resolveDose(i.catalogue[0],i.doses[0],i.manifest,context)
 i.performances=[{...comparison,id:'performed',assignmentId:1,occurrenceId:'one',setIndex:1,expectedSets:1,variantId:'ex',variantRevision:1,actual:40,quality:'confirmed',complete:true,effortConfirmed:true,lineageId:'performed',effectiveAt:i.contextInput.sessionAt,recordedAt:i.contextInput.sessionAt}]
 let r=numericalProposal(i);assert.equal(r.state,'proposal');assert.equal(r.effects[0].to,42);assert.equal(r.prescriptionChanges[0].to.loadKg,42);assert.equal(i.baselineBlocks[0].dose.prescription.loadKg,40)
 i.contextInput.observations.at(-1).value.loadsKg=[40,45];r=numericalProposal(i);assert.equal(r.state,'dose_review_required');assert.equal(r.suggestedDraft,null)
})
