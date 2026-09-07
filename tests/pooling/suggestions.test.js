import test from 'node:test'
import assert from 'node:assert/strict'
import {suggestSelection} from '../../src/lib/pooling/suggestions.js'

function fixture(){
 const approved=(id,extra)=>({id,revision:1,reviewStatus:'published',automationEligible:true,rightsStatus:'accepted',approvalEvidence:['content','rights','scope'].map(kind=>({kind,decision:'accepted',reviewerId:'fictional',reference:'synthetic-only',revision:1})),...extra})
 const catalogue=['original','alternative'].map(id=>approved(id,{familyId:'fictional-family',laterality:'bilateral',scopes:['adult_general_fitness'],settings:['home'],levels:['beginner'],equipment:[],demands:[],prerequisites:[],roles:['main'],needRefs:['need'],doseRefs:[id+'-dose']}))
 const doses=catalogue.map(row=>approved(row.id+'-dose',{sets:1,workSeconds:10,restSeconds:0,setupSeconds:0,transitionSeconds:0,sideMultiplier:1}))
 return {context:{version:'fictional',generation:1,state:'eligible_for_coach_review',facts:{}},catalogue,doses,manifest:{id:'fictional-manifest',state:'published',releaseEvidence:'synthetic-only',records:[...catalogue,...doses].map(({id,revision})=>({id,revision}))},request:{scope:'adult_general_fitness',setting:'home',level:'beginner',equipmentConfirmed:true,equipment:[],roles:[{id:'main',required:true}],budgetSeconds:20,requiredNeeds:['need']},selection:[{occurrenceId:'first',role:'main',exerciseId:'original',exerciseRevision:1,doseId:'original-dose',doseRevision:1}]}
}
const swap={mode:'swap',occurrenceId:'first',exerciseId:'alternative'}
test('compatible swap checks full draft and does not mutate or assign the parent',()=>{const input=fixture(),before=structuredClone(input);const result=suggestSelection(input,swap);assert.equal(result.completeness,'ready_for_coach_review');assert.equal(result.blocks[0].exerciseId,'alternative');assert.equal(result.assignment,null);assert.deepEqual(input,before)})
test('swap never relaxes family, laterality, equipment or review requirements',()=>{for(const change of [{familyId:'other'},{laterality:'unilateral'},{equipment:['missing']},{reviewStatus:'draft'}]){const input=fixture();Object.assign(input.catalogue[1],change);assert.equal(suggestSelection(input,swap).completeness,'blocked')}})
test('unknown family/laterality cannot be treated as equivalent',()=>{const input=fixture();for(const row of input.catalogue){delete row.familyId;delete row.laterality}assert.equal(suggestSelection(input,swap).gaps[0].reason,'no_compatible_alternative')})
test('swap must fit total budget and retain required needs',()=>{for(const kind of ['budget','needs']){const input=fixture();if(kind==='budget')input.doses[1].workSeconds=21;else input.catalogue[1].needRefs=[];assert.equal(suggestSelection(input,swap).gaps[0].reason,'no_compatible_dose_within_budget')}})
test('unknown occurrence or hard hold cannot generate a substitute',()=>{assert.equal(suggestSelection(fixture(),{...swap,occurrenceId:'missing'}).completeness,'blocked');const input=fixture();input.context.state='held';assert.equal(suggestSelection(input,swap).completeness,'blocked')})
