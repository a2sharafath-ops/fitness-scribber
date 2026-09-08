import {canonical,resolveContext} from './context.js'
import {admission,resolveDose} from './selection.js'
import {reconcileEffects,proposeProgression,reassessmentRequests} from './extensions.js'
import {aggregatePerformances} from './performance-history.js'

// Called with server-owned inputs. Browser answers never become policy constants.
export function numericalProposal(input){
 const {kind,policy,manifest,baselineBlocks,targetProposal,catalogue,doses,performances=[],completedOccurrences=[]}=input
 if(!admission(policy || {},manifest))return {state:'unsupported_policy',effects:[],suggestedDraft:null,assignment:null}
 const context=resolveContext(input.contextInput)
 if(input.held!==false)context.state='held'
 if(context.state!=='eligible_for_coach_review')return {state:context.state==='held'?'hold':context.state,reasons:context.reasons,effects:[],reassessmentRequests:reassessmentRequests(context),suggestedDraft:null,assignment:null}
 const common={context,policy,manifest,completedOccurrences:kind==='daily'?completedOccurrences:[],baseline:baselineBlocks.map(block=>({occurrenceId:block.occurrenceId,revision:input.baselineRevision,...block.dose.prescription}))}
 let result
 if(kind==='daily'){
  if(!Array.isArray(policy.signalRules) || !policy.signalRules.length)return {state:'unsupported_policy',effects:[],suggestedDraft:null,assignment:null}
  const signals=[],missing=[]
  for(const rule of policy.signalRules){
   const fact=context.facts[rule.key]
   if(!['gte','lte','equals'].includes(rule.operator) || !Number.isFinite(rule.delta) || !rule.field || rule.threshold===undefined || !Array.isArray(rule.roles))return {state:'unsupported_policy',effects:[],suggestedDraft:null,assignment:null}
   if(fact?.state!=='usable'){missing.push({key:rule.key,state:fact?.state || 'missing'});continue}
   if(rule.operator!=='equals' && (!Number.isFinite(fact.value) || !Number.isFinite(rule.threshold))){missing.push({key:rule.key,state:'incompatible_unit_or_value'});continue}
   const applies=rule.operator==='equals'?canonical(fact.value)===canonical(rule.threshold):rule.operator==='gte'?fact.value>=rule.threshold:fact.value<=rule.threshold
   if(applies)for(const block of baselineBlocks.filter(row=>rule.roles.includes(row.role)))signals.push({id:`${rule.id}:${block.occurrenceId}`,occurrenceId:block.occurrenceId,field:rule.field,delta:rule.delta,quality:'confirmed',lineageId:canonical(fact.refs)})
  }
  result=missing.length?{state:'information_required',effects:[],missing}:reconcileEffects({...common,signals})
 }else if(kind==='progression'){
  const history=aggregatePerformances({performances,policy,sessionAt:context.sessionAt,knowledgeCutoff:context.knowledgeCutoff})
  if(history.state==='unsupported_policy')return {state:'unsupported_policy',effects:[],suggestedDraft:null,assignment:null,policyId:policy.id,policyRevision:policy.revision}
  const results=baselineBlocks.map(block=>{
   const reference={...block.dose.prescription.comparison,occurrenceId:block.occurrenceId,variantId:block.exerciseId,variantRevision:block.exerciseRevision}
   return proposeProgression({...common,reference,performances:history.performances,sessionAt:context.sessionAt,knowledgeCutoff:context.knowledgeCutoff})
  })
  result={state:results.some(row=>row.state==='hold')?'hold':results.some(row=>row.state==='unsupported_policy')?'unsupported_policy':results.some(row=>row.state==='review_required')?'review_required':results.some(row=>row.state==='proposal')?'proposal':results.some(row=>row.state==='insufficient_evidence')?'insufficient_evidence':'no_change',effects:results.flatMap(row=>row.effects || []),comparisons:results.map((row,i)=>({occurrenceId:baselineBlocks[i].occurrenceId,...row.comparison || {state:row.state,included:row.included,excluded:row.excluded}}))}
 }else throw new Error('invalid_request')
 result={...result,reassessmentRequests:reassessmentRequests(context),suggestedDraft:null,assignment:null,policyId:policy.id,policyRevision:policy.revision,baselineAssignmentId:input.baselineAssignmentId}
 if(result.state!=='proposal')return result
 const selection=structuredClone(targetProposal.selection || []),gaps=[],prescriptionChanges=[]
 for(const block of baselineBlocks){
  const effects=result.effects.filter(effect=>effect.occurrenceId===block.occurrenceId)
  if(!effects.length)continue
  const item=selection.find(row=>row.occurrenceId===block.occurrenceId && row.exerciseId===block.exerciseId && row.exerciseRevision===block.exerciseRevision)
  if(!item){gaps.push({occurrenceId:block.occurrenceId,reason:'baseline_identity_changed'});continue}
  const expected={...block.dose.prescription,...Object.fromEntries(effects.map(effect=>[effect.field,effect.to]))}
  const record=catalogue.find(row=>row.id===item.exerciseId && row.revision===item.exerciseRevision)
  const match=doses.find(dose=>{const resolved=record && resolveDose(record,dose,manifest,context);return resolved?.state==='resolved' && canonical(resolved.prescription)===canonical(expected)})
  if(!match){gaps.push({occurrenceId:block.occurrenceId,reason:'no_matching_reviewed_dose'});continue}
  const resolved=resolveDose(record,match,manifest,context)
  prescriptionChanges.push({occurrenceId:block.occurrenceId,from:{...block.dose.prescription,durationSeconds:block.dose.seconds},to:{...resolved.prescription,durationSeconds:resolved.seconds}})
  item.doseId=match.id;item.doseRevision=match.revision
 }
 if(gaps.length)return {...result,state:'dose_review_required',gaps}
 return {...result,prescriptionChanges,suggestedDraft:{...structuredClone(targetProposal),source:`${kind}_review_proposal`,selection}}
}
