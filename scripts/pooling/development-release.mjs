import {readFileSync} from 'node:fs'

// Owner-approved development parameters, not professional/clinical signatures.
// Published solely through the tester-only server manifest gate in A35.
export function developmentRelease() {
 const reference='A35 owner-approved development testing, 2026-09-09; not a production or clinical release'
 const record=(id,extra={})=>({id,revision:1,scope:'adult_general_fitness',reviewStatus:'development',automationEligible:true,
  approvalEvidence:[],developmentEvidence:{reference},...extra})
 const originals=JSON.parse(readFileSync(new URL('../../docs/exercise-pooling/catalogues/exercises.draft.json',import.meta.url))).exercises
 const prerequisites=[...new Set(originals.flatMap(e=>e.prerequisites))].sort()
 const requirement=(key,extra={})=>({key,source:'clients',required:false,unit:'boolean',protocol:'coach-reviewed-v1',maxAgeSeconds:2592000,...extra})
 const modulePolicy=record('DEV-general-fitness-policy',{scope:'adult_general_fitness',authorityKeys:{adult:'adult',purpose:'purpose',health:'health',equipment:'equipment'},
  requiredFields:['adult','purpose','health','equipment'],requiredRoles:['general_warmup','main_accessory','cooldown'],decisionValiditySeconds:86400,
  requirements:[...['adult','purpose','health','equipment'].map(key=>requirement(key,{required:true,sessionSpecific:['health','equipment'].includes(key)})),
   ...prerequisites.map(key=>requirement(key)),requirement('support',{unit:'support'}),
   ...['stress','fatigue','soreness'].map(key=>requirement(key,{source:'wellness',unit:'score_1_7',maxAgeSeconds:86400})),
   requirement('sleepQuality',{source:'wellness',unit:'score_1_7',maxAgeSeconds:86400})]})
 const doses=[]
 for(const level of ['beginner','intermediate','advanced'])for(const seconds of [20,30,40])doses.push(record(`DEV-${level}-${seconds}`,{
  levels:[level],sets:level==='beginner'?1:level==='intermediate'?2:3,workSeconds:seconds,restSeconds:30,setupSeconds:15,transitionSeconds:15,
  sideMultiplier:1,mode:'timed',loadMethod:'none',comparison:{side:'not_applicable',range:'coach_confirmed',equipment:[],unit:'seconds',method:'timed',assistance:'none',loadBasis:'no_external_load',effortMethod:'rpe_0_10'}}))
 // Default 30s first; 20/40s variants exist only for explicit reviewed changes.
 for(const dose of doses)dose.id=dose.id.replace(/-(20|30|40)$/,(_,n)=>`-${n==='30'?'a':n==='20'?'b':'c'}-${n}`)
 const catalogue=originals.map(e=>record(e.id,{...e,reviewStatus:'development',automationEligible:true,approvalEvidence:[],developmentEvidence:{reference},
  scopes:['adult_general_fitness'],goalRefs:e.roles.includes('mobility_lengthening')?['mobility','general_fitness']:e.roles.includes('conditioning')?['endurance','general_fitness']:['strength','general_fitness'],
  // External-load variants require a reviewed load prescription, not a guessed weight.
  prerequisites:e.demands.includes('external_load')?[...e.prerequisites,'external_load_prescription_reviewed']:e.prerequisites,
  doseRefs:doses.map(d=>d.id)}))
 modulePolicy.requirements.push(requirement('external_load_prescription_reviewed'))
 const roles=[...new Set(catalogue.flatMap(e=>e.roles))]
 const daily=record('DEV-daily',{kind:'daily',fields:{workSeconds:{min:20,max:40,increment:10,maxChange:10}},
  signalRules:['stress','fatigue','soreness'].map(key=>({id:`DEV-high-${key}`,key,operator:'gte',threshold:5,delta:-10,field:'workSeconds',roles}))})
 const progression=record('DEV-progression',{kind:'progression',fields:{workSeconds:{min:20,max:40,increment:10,maxChange:10}},windowSeconds:1209600,
  minimumPerformances:1,operator:'gte',comparisonThreshold:30,field:'workSeconds',progressionDelta:10,performanceUnit:'completed_occurrence',aggregation:'minimum_actual'})
 const weekly=record('DEV-weekly',{kind:'weekly',supportKey:'support',splits:['full_body'],goals:['general_fitness','strength','mobility','endurance'],minSessions:2,maxSessions:5,maxWeeklySeconds:18000,
  patternRules:[...new Set(catalogue.map(e=>e.pattern))].map(pattern=>({pattern,minSessions:0,maxSessions:5,recoverySeconds:86400}))})
 const manifest={id:'fitness-scribber-development-v1',state:'published',audience:'development',releaseEvidence:reference,
  records:[modulePolicy,...catalogue,...doses,daily,progression,weekly].map(({id,revision})=>({id,revision}))}
 const needs=JSON.parse(readFileSync(new URL('../../docs/exercise-pooling/catalogues/rules-and-templates.draft.json',import.meta.url))).needs.map(({id,name})=>({id,name}))
 return {manifest,modulePolicy,catalogue,doses,needs,extensionPolicies:[daily,progression,weekly]}
}
