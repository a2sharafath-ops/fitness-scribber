import test from 'node:test'
import assert from 'node:assert/strict'
import {validateRelease} from '../../src/lib/pooling/catalogue.js'
import {bundle} from './source-fixture.js'
function fixture(){const b=bundle(),policy=b.modulePolicy,exercise={...policy,id:'ex',scopes:['adult_general_fitness'],settings:['home'],levels:['beginner'],equipment:[],prerequisites:[],roles:['main'],demands:[],doseRefs:['dose']},dose={...policy,id:'dose',sets:1,workSeconds:1,restSeconds:0,setupSeconds:0,transitionSeconds:0,sideMultiplier:1};return {modulePolicy:policy,catalogue:[exercise],doses:[dose],manifest:{...b.manifest,id:'synthetic',records:[policy,exercise,dose].map(({id,revision})=>({id,revision}))}}}
test('catalogue validation checks evidence but does not publish',()=>{const d=fixture(),before=structuredClone(d);assert.deepEqual(validateRelease(d),{valid:true,errors:[]});assert.deepEqual(d,before)})
test('malformed catalogue input is a reported validation failure',()=>{for(const d of [null,[],{manifest:{records:{}}}, {...fixture(),catalogue:[null]}])assert.equal(validateRelease(d).valid,false)})
test('duplicate revisions and missing manifest records are rejected',()=>{const d=fixture();d.doses.push(d.doses[0]);assert(validateRelease(d).errors.includes('duplicate_record_revision'));const e=fixture();e.manifest.records.pop();assert.equal(validateRelease(e).valid,false)})
test('missing reviewer identity does not inherit owner approval',()=>{const d=fixture();d.catalogue[0]={...d.catalogue[0],approvalEvidence:[]};assert.equal(validateRelease(d).valid,false)})
test('unknown dose references and unsupported loading cannot publish',()=>{const d=fixture();d.catalogue[0].doseRefs=['missing'];assert.equal(validateRelease(d).valid,false);const e=fixture();e.doses[0].loadMethod='magic';assert.equal(validateRelease(e).valid,false)})
test('numerical policy cannot publish with null parameters',()=>{const d=fixture();d.extensionPolicies=[{...d.modulePolicy,id:'progression',kind:'progression',windowSeconds:null}];d.manifest.records.push({id:'progression',revision:1});assert(validateRelease(d).errors.includes('progression:progression_parameters_incomplete'))})
test('loaded release requires an explicit required session inventory contract',()=>{
 const d=fixture();Object.assign(d.doses[0],{loadMethod:'absolute',loadKg:42,minimumLoadKg:0,maximumLoadKg:42,loadInventoryKey:'loads'})
 assert(validateRelease(d).errors.includes('dose:session_load_inventory_required'))
 d.modulePolicy.requirements.push({key:'loads',source:'clients',required:true,sessionSpecific:true,unit:'load_inventory',protocol:'explicit-v1',maxAgeSeconds:60})
 assert.equal(validateRelease(d).valid,true)
 d.modulePolicy.requirements.at(-1).sessionSpecific=false;assert.equal(validateRelease(d).valid,false)
})
