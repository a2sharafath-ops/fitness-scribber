// Backend-only engineering placeholders; never real exercise policy admission.
import {bundle} from '../../tests/pooling/source-fixture.js'
export function coachTestTemplate(){
 const modulePolicy=bundle().modulePolicy
 modulePolicy.requirements.forEach(r=>r.maxAgeSeconds=3600)
 modulePolicy.requirements.push({key:'fictional-signal',source:'clients',required:true,unit:'fixture',protocol:'explicit-v1',maxAgeSeconds:3600},{key:'support',source:'clients',required:true,unit:'support',protocol:'explicit-v1',maxAgeSeconds:3600})
 const accepted=(id,extra)=>({...structuredClone(modulePolicy),id,...extra})
 const comparison={side:'not_applicable',range:'fictional',equipment:[],unit:'seconds',method:'fictional',assistance:'none',loadBasis:'no_external_load',effortMethod:'fictional-effort'}
 const dose=accepted('fictional-dose-one',{sets:2,workSeconds:1,restSeconds:0,setupSeconds:0,transitionSeconds:0,sideMultiplier:1,comparison})
 const doseTwo={...structuredClone(dose),id:'fictional-dose-two',workSeconds:2}
 const exercise=accepted('fictional-exercise',{name:'ENGINEERING PLACEHOLDER — DO NOT PERFORM',familyId:'fictional-family',laterality:'bilateral',pattern:'fictional-pattern',scopes:['adult_general_fitness'],settings:['home'],levels:['beginner'],equipment:[],prerequisites:[],demands:[],roles:['main'],doseRefs:[dose.id,doseTwo.id]})
 const alternative={...structuredClone(exercise),id:'fictional-alternative',name:'ALTERNATIVE SOFTWARE PLACEHOLDER — DO NOT PERFORM'}
 const fields={workSeconds:{min:1,max:2,increment:1,maxChange:1}}
 const daily=accepted('fictional-daily',{kind:'daily',fields,signalRules:[{id:'fictional-signal-rule',key:'fictional-signal',operator:'gte',threshold:2,delta:1,field:'workSeconds',roles:['main']}]})
 const progression=accepted('fictional-progression',{kind:'progression',fields,windowSeconds:604800,minimumPerformances:1,operator:'gte',comparisonThreshold:1,field:'workSeconds',progressionDelta:1,performanceUnit:'completed_occurrence',aggregation:'minimum_actual'})
 const weekly=accepted('fictional-weekly',{kind:'weekly',supportKey:'support',splits:['fictional'],goals:['fictional'],minSessions:2,maxSessions:2,maxWeeklySeconds:100,patternRules:[{pattern:'fictional-pattern',minSessions:2,maxSessions:2,recoverySeconds:1}]})
 const manifest={id:'server-replaced',state:'published',releaseEvidence:'Fictional engineering-only evidence. No professional acceptance.',records:[modulePolicy,exercise,alternative,dose,doseTwo,daily,progression,weekly].map(({id,revision})=>({id,revision}))}
 return {modulePolicy,manifest,catalogue:[exercise,alternative],doses:[dose,doseTwo],extensionPolicies:[daily,progression,weekly]}
}
