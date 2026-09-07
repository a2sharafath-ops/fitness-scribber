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
