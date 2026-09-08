// Fictional software parameters only. Never import this into application code.
import {bundle} from './source-fixture.js'
export const approved=(id,extra={})=>({...bundle().modulePolicy,id,...extra})
export function selectionFixture(){
 const exercise=approved('fictional-ex',{scopes:['adult_general_fitness'],settings:['home','gym','travel'],levels:['beginner'],equipment:[],demands:[],prerequisites:[],roles:['main'],needRefs:['need-09'],doseRefs:['fictional-dose']})
 const dose=approved('fictional-dose',{sets:1,workSeconds:1600,restSeconds:0,setupSeconds:300,transitionSeconds:0,sideMultiplier:1,loadMethod:'none'})
 const input={context:{version:'fictional',generation:1,state:'eligible_for_coach_review',facts:{}},catalogue:[exercise],doses:[dose],
  request:{scope:'adult_general_fitness',setting:'home',level:'beginner',equipmentConfirmed:true,equipment:[],roles:[{id:'main',required:true}],budgetSeconds:1800,requiredNeeds:['need-09']},
  selection:[{occurrenceId:'one',role:'main',exerciseId:exercise.id,exerciseRevision:1,doseId:dose.id,doseRevision:1}]}
 return admit(input)
}
export function admit(input){input.manifest={id:'fictional-manifest',state:'published',releaseEvidence:'fictional-only',records:[...input.catalogue,...input.doses,...(input.extraRecords || [])].map(({id,revision})=>({id,revision}))};return input}
export function contextFixture(){
 return {clientId:'fictional',generation:1,sessionAt:'2026-09-08T10:00:00Z',knowledgeCutoff:'2026-09-08T10:00:00Z',timeZone:'UTC',adultConfirmed:true,purposePermitted:true,scope:'adult_general_fitness',healthChange:'no_change',sourceStatus:{assessment:'loaded'},requirements:[{key:'need',source:'assessment',unit:'boolean',protocol:'fictional',maxAgeSeconds:60,required:true}],observations:[]}
}
export const observation=(id,extra={})=>({id,clientId:'fictional',key:'need',source:'assessment',unit:'boolean',protocol:'fictional',quality:'confirmed',state:'reported',value:true,confirmedBy:'fictional-reviewer',confirmedAt:'2026-09-08T10:00:00Z',effectiveAt:'2026-09-08T10:00:00Z',recordedAt:'2026-09-08T10:00:00Z',...extra})
