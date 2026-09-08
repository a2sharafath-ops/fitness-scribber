import test from 'node:test'
import assert from 'node:assert/strict'
import {selectPool,resolveDose} from '../../src/lib/pooling/selection.js'
import {evaluateDraft} from '../../src/lib/pooling/decision.js'
import {resolveContext,canonical} from '../../src/lib/pooling/context.js'
import {buildSourceSnapshot} from '../../src/lib/pooling/sources.js'
import {budgetMessages} from '../../src/lib/pooling/budget.js'
import {reconcileEffects,comparePerformances} from '../../src/lib/pooling/extensions.js'
import {bundle} from './source-fixture.js'
import {approved,selectionFixture,admit,contextFixture,observation} from './completion-fixture.js'

test('TC-022 R2-T10 CAT-014: exact 1900/1800 budget exposes 100 seconds, never cuts required time',()=>{
 const f=selectionFixture(),before=structuredClone(f),r=evaluateDraft(f),g=r.gaps.find(g=>g.reason==='budget_exceeded')
 assert.deepEqual(g,{reason:'budget_exceeded',durationSeconds:1900,budgetSeconds:1800,shortfallSeconds:100,lowerBound:false})
 assert.match(budgetMessages(r)[0],/1900 seconds required; 1800 seconds available; 100 seconds short/)
 assert.equal(r.completeness,'blocked');assert.equal(r.assignment,null);assert.deepEqual(f,before)
})
test('CAT-014: optional omission cannot make an over-budget required role ready',()=>{
 const f=selectionFixture();f.request.roles.push({id:'optional',required:false})
 const r=selectPool(f);assert.equal(r.completeness,'blocked');assert.equal(r.gaps[0].shortfallSeconds,100);assert.equal(r.omissions.length,1)
 assert.match(budgetMessages(r)[0],/^Role main: At least/)
})
test('budget explanations do not invent duration for an unresolved dose',()=>{
 const f=selectionFixture();f.doses[0].workSeconds=null
 const r=selectPool(f);assert.equal(budgetMessages(r).length,0);assert.equal(r.blocks.length,0)
})
test('TC-001: empty movement dataset never becomes assessed-absent or resolved needs',()=>{
 const r=resolveContext(contextFixture());assert.deepEqual(r.facts.need,{state:'missing',refs:[]});assert.equal(r.state,'information_required');assert.equal(r.facts.need.value,undefined)
})
test('TC-002 R2-T02: untouched 4/4/Moderate and 5/3/3/3 cannot become confirmed authority',()=>{
 for(const raw of [{activity:4,sleep:4,stress:'Moderate'},{sleep:5,stress:3,fatigue:3,soreness:3}]){
  const f=bundle();f.confirmations=[];f.sources[0].data={lifestyle:raw,wellness:raw,movement:[],oneRep:1,maxKg:40}
  const s=buildSourceSnapshot(f),r=resolveContext(s.contextInput)
  assert.equal(r.facts.adult.state,'missing');assert.notEqual(r.state,'eligible_for_coach_review');assert.equal(s.contextInput.observations.length,0)
 }
})
test('TC-005: known future-effective source returns date mismatch with no future-recorded leak',()=>{
 const f=contextFixture();f.observations=[observation('future',{effectiveAt:'2026-09-09T10:00:00Z'})]
 assert.deepEqual(resolveContext(f).reasons[0],{code:'source_date_mismatch',key:'need',refs:['future']})
 f.observations[0].recordedAt='2026-09-09T10:00:00Z'
 assert.deepEqual(resolveContext(f).reasons[0],{code:'missing_required_source',key:'need'})
})
test('TC-012 CAT-006: duplicate findings retain evidence but incremental need coverage wins over pins',()=>{
 const ctx=contextFixture();ctx.observations=[observation('finding-one'),observation('finding-two')]
 assert.deepEqual(resolveContext(ctx).facts.need.refs,['finding-one','finding-two'])
 const f=selectionFixture(),base=f.catalogue[0];f.doses[0].workSeconds=1;f.doses[0].setupSeconds=0
 f.request.roles=[{id:'first',required:true},{id:'second',required:true}];f.request.requiredNeeds=['need-09','need-09','need-10'];f.request.pinnedIds=['fictional-16']
 f.catalogue=[{...base,id:'fictional-15',roles:['first']},{...base,id:'fictional-16',roles:['second']},{...base,id:'fictional-19',roles:['second'],needRefs:['need-10']}];admit(f)
 const r=selectPool(f);assert.deepEqual(r.blocks.map(b=>b.exerciseId),['fictional-15','fictional-19']);assert.deepEqual(r.blocks.map(b=>b.matchedNeeds),[['need-09'],['need-10']]);assert.equal(r.gaps.length,0)
})
test('TC-019: stale, future, wrong-variant and unsupported-method references never supply load',()=>{
 for(const kind of ['stale','future','wrong-variant','wrong-method']){
  const f=selectionFixture();Object.assign(f.doses[0],{workSeconds:1,setupSeconds:0,loadMethod:'percentage',loadReferenceKey:'load',loadInventoryKey:'inventory',percentage:50,incrementKg:1,minimumLoadKg:0,maximumLoadKg:100,allowedReferenceKinds:['measured'],referenceMethod:'verified-test'})
  const c=contextFixture();c.requirements=[{...c.requirements[0],key:'load',unit:'kg'}];c.observations=[observation('max',{key:'load',unit:'kg',value:{variantId:kind==='wrong-variant'?'similarly-named-other':f.catalogue[0].id,unit:'kg',kind:'measured',method:kind==='wrong-method'?'legacy-default':'verified-test',valueKg:40},effectiveAt:kind==='stale'?'2026-09-01T10:00:00Z':kind==='future'?'2026-09-09T10:00:00Z':'2026-09-08T10:00:00Z'})]
  const context=resolveContext(c);context.facts.inventory={state:'usable',value:{unit:'kg',loadsKg:[20]}}
  assert.equal(resolveDose(f.catalogue[0],f.doses[0],f.manifest,context).state,'unresolved',kind)
 }
})
test('TC-020 R3-T04: legacy single-rep default is not a verified maximal measurement',()=>{
 const c=contextFixture();c.requirements[0]={...c.requirements[0],key:'load',unit:'kg'};c.observations=[observation('legacy-one-rep',{key:'load',unit:'kg',quality:'legacy_ambiguous',value:{reps:1,valueKg:40}})]
 assert.equal(resolveContext(c).facts.load.state,'missing')
})
test('loaded dose requires confirmed exact session inventory, not a broad gym label',()=>{
 const f=selectionFixture();Object.assign(f.doses[0],{loadMethod:'absolute',loadKg:42,minimumLoadKg:0,maximumLoadKg:42,loadInventoryKey:'loads'})
 assert.equal(resolveDose(f.catalogue[0],f.doses[0],f.manifest,f.context).reasons[0],'load_inventory_unavailable')
 f.context.facts.loads={state:'usable',value:{unit:'kg',loadsKg:[40,45]}}
 assert.equal(resolveDose(f.catalogue[0],f.doses[0],f.manifest,f.context).reasons[0],'load_not_in_confirmed_inventory')
 f.context.facts.loads.value.loadsKg=[42];assert.equal(resolveDose(f.catalogue[0],f.doses[0],f.manifest,f.context).prescription.loadKg,42)
 f.context.facts.loads.state='stale';assert.equal(resolveDose(f.catalogue[0],f.doses[0],f.manifest,f.context).state,'unresolved')
})
test('R2-T09: fictional maximum 48 with 45/50 inventory never rounds up to 50',()=>{
 const p=approved('policy',{fields:{loadKg:{min:40,max:48,increment:5,maxChange:10}}}),f=selectionFixture();f.extraRecords=[p];admit(f)
 const r=reconcileEffects({context:f.context,manifest:f.manifest,policy:p,baseline:[{occurrenceId:'one',revision:1,loadKg:45}],signals:[{id:'s',occurrenceId:'one',field:'loadKg',delta:3,quality:'confirmed',lineageId:'one-source'}]})
 assert.equal(r.state,'review_required');assert.equal(r.effects.length,0);assert.equal(r.conflicts[0].reason,'outside_reviewed_bounds')
})
test('R3-T09: fictional cap 42 with 40/45 inventory cannot authorize unavailable 42 or excessive 45',()=>{
 const f=selectionFixture();Object.assign(f.doses[0],{loadMethod:'absolute',loadKg:42,minimumLoadKg:40,maximumLoadKg:42,loadInventoryKey:'loads'});f.context.facts.loads={state:'usable',value:{unit:'kg',loadsKg:[40,45]}}
 assert.equal(resolveDose(f.catalogue[0],f.doses[0],f.manifest,f.context).state,'unresolved')
 f.doses[0].loadKg=45;assert.equal(resolveDose(f.catalogue[0],f.doses[0],f.manifest,f.context).reasons[0],'load_outside_reviewed_bounds')
})
test('TC-045: current hotel inventory and unavailable assistance defeat old gym prerequisites',()=>{
 const f=selectionFixture();f.request.setting='travel';f.request.equipment=[];f.catalogue[0].equipment=['band'];f.catalogue[0].prerequisites=['assistant'];f.context.facts.assistant={state:'usable',value:false}
 const r=selectPool(f);assert(r.candidates[0].reasons.includes('equipment_missing'));assert(r.candidates[0].reasons.includes('prerequisite_missing'));assert.equal(r.blocks.length,0)
})
test('session-specific inventory confirmation cannot be borrowed from another date',()=>{
 const f=bundle();f.modulePolicy.requirements.push({key:'loads',source:'clients',required:true,sessionSpecific:true,unit:'load_inventory',protocol:'explicit-v1',maxAgeSeconds:60})
 f.confirmations.push({...f.confirmations[0],id:90,observation:{...f.confirmations[0].observation,key:'loads',unit:'load_inventory',value:{unit:'kg',loadsKg:[42]},sessionAt:'2026-09-06T10:00:00Z'}})
 assert.equal(resolveContext(buildSourceSnapshot(f).contextInput).facts.loads.state,'missing')
 f.confirmations.at(-1).observation.sessionAt=f.session.sessionAt
 assert.equal(resolveContext(buildSourceSnapshot(f).contextInput).facts.loads.state,'usable')
})
test('TC-039: mirrored legacy evidence counts once and conflicting mirrors count zero',()=>{
 const f=selectionFixture(),reference={variantId:'test',variantRevision:1,side:'left',range:'full',equipment:[],unit:'kg',method:'verified',assistance:'none',loadBasis:'actual'},p=approved('comparison',{windowSeconds:86400,minimumPerformances:1});f.extraRecords=[p];admit(f)
 const row={...reference,id:'a',actual:0,quality:'confirmed',complete:true,effortConfirmed:true,lineageId:'same-source',effectiveAt:'2026-09-08T09:00:00Z',recordedAt:'2026-09-08T09:00:00Z'}
 const input={reference,policy:p,manifest:f.manifest,sessionAt:'2026-09-08T10:00:00Z',knowledgeCutoff:'2026-09-08T10:00:00Z',performances:[row,{...row,id:'b'}]}
 assert.equal(comparePerformances(input).included.length,1);input.performances[1].actual=1;assert.equal(comparePerformances(input).included.length,0)
})
test('TC-046: semantic catalogue, dose, manifest and observation permutations replay identically',()=>{
 const f=selectionFixture();f.doses[0].workSeconds=1;f.doses[0].setupSeconds=0;f.catalogue.push({...f.catalogue[0],id:'another'});f.doses.push({...f.doses[0],id:'another-dose'});admit(f)
 const expected=selectPool(f).replay
 for(let i=0;i<8;i++){const p=structuredClone(f);if(i&1)p.catalogue.reverse();if(i&2)p.doses.reverse();if(i&4)p.manifest.records.reverse();assert.equal(selectPool(p).replay,expected)}
 const c=contextFixture();c.observations=[observation('a'),observation('b')];const expectedContext=canonical(resolveContext(c));c.observations.reverse();assert.equal(canonical(resolveContext(c)),expectedContext)
})
