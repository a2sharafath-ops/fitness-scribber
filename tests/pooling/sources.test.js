import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateConfirmation,buildSourceSnapshot} from '../../src/lib/pooling/sources.js'
import {bundle} from './source-fixture.js'
const observation=()=>({key:'adult',source:'clients',sourceId:'synthetic',sourceToken:'digest',state:'reported',value:true,unit:'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt:'2026-09-07T10:00:00Z',sessionAt:'2026-09-07T10:00:00Z',evidenceReference:'synthetic evidence only'})
test('confirmation does not accept actor or approval claims',()=>assert.throws(()=>validateConfirmation({...observation(),confirmedBy:'forged'}),/invalid_confirmation/))
test('unknown cannot carry a normal/default value',()=>assert.throws(()=>validateConfirmation({...observation(),state:'unknown'}),/invalid_confirmation/))
test('explicit zero/false survive confirmation validation',()=>{assert.equal(validateConfirmation({...observation(),value:0}).value,0);assert.equal(validateConfirmation({...observation(),state:'assessed_absent',value:false}).value,false)})
test('only explicit current confirmed sources produce context authority',()=>{const result=buildSourceSnapshot(bundle());assert.equal(result.contextInput.adultConfirmed,true);assert.equal(result.contextInput.healthChange,'no_change');assert.equal(result.sessionRequest.equipmentConfirmed,true)})
test('source edit invalidates confirmation instead of adopting the default',()=>{const input=bundle();input.sources[0].token='new';const result=buildSourceSnapshot(input);assert.equal(result.contextInput.adultConfirmed,false);assert.equal(result.sessionRequest.equipmentConfirmed,false)})
test('unreviewed module never supplies authority mappings',()=>{const input=bundle();input.modulePolicy.reviewStatus='draft';assert.throws(()=>buildSourceSnapshot(input),/unsupported_policy/)})
test('another session cannot inherit a health/equipment response',()=>{const input=bundle();input.session.sessionAt='2026-09-07T10:00:10Z';const result=buildSourceSnapshot(input);assert.equal(result.contextInput.healthChange,null);assert.equal(result.sessionRequest.equipmentConfirmed,false)})
