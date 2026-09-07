import test from 'node:test'
import assert from 'node:assert/strict'
import {evaluateWeek} from '../../src/lib/pooling/weekly.js'
import {bundle} from './source-fixture.js'
import {buildSourceSnapshot} from '../../src/lib/pooling/sources.js'
function fixture(){
 const b=bundle(),accepted=(id,extra)=>({...b.modulePolicy,id,...extra})
 const exercise=accepted('e',{scopes:['adult_general_fitness'],settings:['home'],levels:['beginner'],equipment:[],prerequisites:[],roles:['main'],demands:[],doseRefs:['d'],pattern:'fictional-pattern'})
 const dose=accepted('d',{sets:1,workSeconds:1,restSeconds:0,setupSeconds:0,transitionSeconds:0,sideMultiplier:1})
 const policy=accepted('w',{kind:'weekly',supportKey:'support',splits:['fictional'],goals:['fictional'],minSessions:1,maxSessions:2,maxWeeklySeconds:10,patternRules:[{pattern:'fictional-pattern',minSessions:1,maxSessions:2,recoverySeconds:1}]})
 b.modulePolicy.requirements.push({key:'support',required:true,source:'clients',unit:'support',protocol:'explicit-v1',maxAgeSeconds:60})
 b.confirmations.push({...b.confirmations[0],id:5,observation:{...b.confirmations[0].observation,key:'support',unit:'support',value:'none'}})
 const compiled=buildSourceSnapshot(b),manifest={...b.manifest,id:'fixture',records:[b.modulePolicy,policy,exercise,dose].map(({id,revision})=>({id,revision}))}
 const snapshot={...compiled,held:false,modulePolicy:b.modulePolicy,manifest,catalogue:[exercise],doses:[dose],draft:{id:1,selection:[{occurrenceId:'one',role:'main',exerciseId:'e',exerciseRevision:1,doseId:'d',doseRevision:1}]}}
 snapshot.sessionRequest={...snapshot.sessionRequest,setting:'home',level:'beginner',budgetSeconds:10,goalPriority:['fictional']}
 return {constraints:{startDate:'2026-09-07',timeZone:'UTC',split:'fictional',goalPriority:['fictional'],slots:[{id:'s1',draftId:1,budgetSeconds:10,support:'none'}]},sessions:[snapshot],policy,manifest}
}
test('weekly review retains exact selections and never assigns',()=>{const i=fixture(),before=structuredClone(i),r=evaluateWeek(i);assert.equal(r.state,'ready_for_coach_review');assert.equal(r.assignment,null);assert.equal(r.durationSeconds,1);assert.deepEqual(i,before)})
test('weekly rules must be admitted and explicit',()=>{const i=fixture();i.policy.patternRules[0].recoverySeconds=null;assert.equal(evaluateWeek(i).state,'unsupported_policy')})
test('weekly unknown support is not inferred as none',()=>{const i=fixture();i.constraints.slots[0].support='coach';assert.equal(evaluateWeek(i).gaps[0].reason,'support_unconfirmed')})
test('weekly coverage counts a pattern once per session',()=>{const i=fixture();i.policy.patternRules[0].minSessions=2;assert(evaluateWeek(i).gaps.some(g=>g.reason==='pattern_distribution_gap'))})
test('weekly recovery spacing and overlap return explicit gaps',()=>{const i=fixture();i.sessions.push({...structuredClone(i.sessions[0]),draft:{...i.sessions[0].draft,id:2}});i.constraints.slots.push({id:'s2',draftId:2,budgetSeconds:10,support:'none'});const r=evaluateWeek(i);assert(r.gaps.some(g=>g.reason==='reviewed_recovery_gap'));assert(r.gaps.some(g=>g.reason==='sessions_overlap'))})
test('weekly cannot invent a new slot to fill missing coverage',()=>{const i=fixture();i.policy.patternRules.push({pattern:'not-covered',minSessions:1,maxSessions:1,recoverySeconds:1});const r=evaluateWeek(i);assert.equal(r.sessions.length,1);assert.equal(r.state,'blocked')})
test('weekly duplicate slots or incompatible goals cannot be approved',()=>{const i=fixture();i.constraints.slots.push(i.constraints.slots[0]);assert.throws(()=>evaluateWeek(i),/invalid_week/);const j=fixture();j.sessions[0].sessionRequest.goalPriority=[];assert(evaluateWeek(j).gaps.some(g=>g.reason==='priority_goals_mismatch'))})
