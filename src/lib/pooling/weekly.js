import {canonical,resolveContext} from './context.js'
import {admission} from './selection.js'
import {evaluateDraft} from './decision.js'

// Compose only explicitly selected session drafts. No extra day, exercise,
// recovery interval or weekly volume target is supplied by this module.
export function evaluateWeek({constraints,sessions,policy,manifest}){
 const blocked=(state,gaps)=>({state,gaps,sessions:[],assignment:null})
 if(!admission(policy || {},manifest) || policy.kind!=='weekly' || !policy.supportKey || !Array.isArray(policy.splits) || !policy.splits.length || !Array.isArray(policy.goals) || !policy.goals.length ||
  !Number.isSafeInteger(policy.minSessions) || policy.minSessions<1 || !Number.isSafeInteger(policy.maxSessions) || policy.maxSessions<policy.minSessions || policy.maxSessions>31 ||
  !Number.isFinite(policy.maxWeeklySeconds) || policy.maxWeeklySeconds<=0 || !Array.isArray(policy.patternRules) || !policy.patternRules.length ||
  policy.patternRules.some(r=>!r.pattern || !Number.isSafeInteger(r.minSessions) || r.minSessions<0 || !Number.isSafeInteger(r.maxSessions) || r.maxSessions<r.minSessions || !Number.isFinite(r.recoverySeconds) || r.recoverySeconds<0) ||
  new Set(policy.patternRules.map(r=>r.pattern)).size!==policy.patternRules.length)return blocked('unsupported_policy',['reviewed_weekly_parameters_required'])
 if(!constraints || Object.keys(constraints).some(k=>!['startDate','timeZone','split','goalPriority','slots'].includes(k)) || !/^\d{4}-\d{2}-\d{2}$/.test(constraints.startDate || '') || !Number.isFinite(Date.parse(constraints.startDate)) || new Date(constraints.startDate).toISOString().slice(0,10)!==constraints.startDate ||
  !constraints.timeZone || !policy.splits.includes(constraints.split) || !Array.isArray(constraints.goalPriority) || !constraints.goalPriority.length || constraints.goalPriority.some(g=>!policy.goals.includes(g)) || new Set(constraints.goalPriority).size!==constraints.goalPriority.length ||
  !Array.isArray(constraints.slots) || !constraints.slots.length || constraints.slots.length>31)throw Error('invalid_week')
 try{new Intl.DateTimeFormat('en',{timeZone:constraints.timeZone})}catch{throw Error('invalid_week')}
 if(new Set(constraints.slots.map(s=>s.id)).size!==constraints.slots.length || new Set(constraints.slots.map(s=>s.draftId)).size!==constraints.slots.length)throw Error('invalid_week')
 const gaps=[],reviewed=[],start=Date.parse(constraints.startDate)
 for(const slot of constraints.slots){
  if(!slot.id || typeof slot.id!=='string' || slot.id.length>100 || !Number.isSafeInteger(slot.draftId) || slot.draftId<1 || !Number.isFinite(slot.budgetSeconds) || slot.budgetSeconds<=0 || !slot.support || Object.keys(slot).some(k=>!['id','draftId','budgetSeconds','support'].includes(k)))throw Error('invalid_week')
  const snapshot=sessions.find(s=>s.draft.id===slot.draftId)
  if(!snapshot){gaps.push({slotId:slot.id,reason:'session_unavailable'});continue}
  const context=resolveContext(snapshot.contextInput),request=snapshot.sessionRequest
  if(snapshot.held!==false)context.state='held'
  const result=evaluateDraft({context,request,catalogue:snapshot.catalogue,doses:snapshot.doses,manifest:snapshot.manifest,selection:snapshot.draft.selection})
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:constraints.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(context.sessionAt))
  if(Date.parse(date)<start || Date.parse(date)>=start+7*86400000)gaps.push({slotId:slot.id,reason:'outside_explicit_week'})
  if(context.timeZone!==constraints.timeZone || context.scope && context.scope!==policy.scope || snapshot.modulePolicy.scope!==policy.scope || snapshot.manifest.id!==manifest.id)gaps.push({slotId:slot.id,reason:'incompatible_session_scope'})
  if(context.facts[policy.supportKey]?.state!=='usable' || context.facts[policy.supportKey].value!==slot.support)gaps.push({slotId:slot.id,reason:'support_unconfirmed'})
  if(canonical(request.goalPriority || [])!==canonical(constraints.goalPriority))gaps.push({slotId:slot.id,reason:'priority_goals_mismatch'})
  if(slot.budgetSeconds!==request.budgetSeconds || result.durationSeconds>slot.budgetSeconds)gaps.push({slotId:slot.id,reason:'slot_budget_mismatch'})
  if(result.completeness!=='ready_for_coach_review')gaps.push({slotId:slot.id,reason:'session_not_ready',details:result.gaps})
  const patterns=[...new Set(result.blocks.map(b=>snapshot.catalogue.find(e=>e.id===b.exerciseId && e.revision===b.exerciseRevision)?.pattern).filter(Boolean))].sort()
  if(patterns.length===0)gaps.push({slotId:slot.id,reason:'pattern_metadata_missing'})
  reviewed.push({slotId:slot.id,draftId:slot.draftId,date,sessionAt:context.sessionAt,budgetSeconds:slot.budgetSeconds,support:slot.support,patterns,result})
 }
 reviewed.sort((a,b)=>Date.parse(a.sessionAt)-Date.parse(b.sessionAt) || a.slotId.localeCompare(b.slotId,'en'))
 for(let i=1;i<reviewed.length;i++)if(Date.parse(reviewed[i].sessionAt)<Date.parse(reviewed[i-1].sessionAt)+reviewed[i-1].result.durationSeconds*1000)gaps.push({slotId:reviewed[i].slotId,reason:'sessions_overlap'})
 for(const rule of policy.patternRules){
  const rows=reviewed.filter(s=>s.patterns.includes(rule.pattern))
  if(rows.length<rule.minSessions || rows.length>rule.maxSessions)gaps.push({pattern:rule.pattern,reason:'pattern_distribution_gap',sessions:rows.length,min:rule.minSessions,max:rule.maxSessions})
  for(let i=1;i<rows.length;i++)if(Date.parse(rows[i].sessionAt)-Date.parse(rows[i-1].sessionAt)-rows[i-1].result.durationSeconds*1000<rule.recoverySeconds*1000)gaps.push({pattern:rule.pattern,slotId:rows[i].slotId,reason:'reviewed_recovery_gap'})
 }
 const durationSeconds=reviewed.reduce((sum,s)=>sum+s.result.durationSeconds,0)
 if(reviewed.length<policy.minSessions || reviewed.length>policy.maxSessions)gaps.push({reason:'session_count_gap'})
 if(durationSeconds>policy.maxWeeklySeconds)gaps.push({reason:'weekly_time_limit'})
 return {state:gaps.length?'blocked':'ready_for_coach_review',gaps,sessions:reviewed,durationSeconds,policyId:policy.id,policyRevision:policy.revision,manifestId:manifest.id,assignment:null}
}
