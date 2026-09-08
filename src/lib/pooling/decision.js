import { canonical } from './context.js'
import { ENGINE_VERSION, evaluateCandidate, resolveDose } from './selection.js'
import { budgetGap } from './budget.js'

// Validate the exact proposed revision; never substitute a newly generated plan.
export function evaluateDraft({ context, request, catalogue, doses, manifest, selection }) {
  const gaps = [], blocks = [], usedOccurrences = new Set(), usedExercises = new Set()
  if (!Array.isArray(selection) || !selection.length) return { completeness:'blocked', sessionState:context.state, blocks:[], gaps:[{reason:'identity_and_dose_review_required'}], assignment:null }
  if (!Array.isArray(request.roles) || !Number.isFinite(request.budgetSeconds) || request.budgetSeconds <= 0) throw new Error('invalid_session_request')
  const roleIds = new Set(request.roles.map(role=>role.id))
  for (const item of selection) {
    const record = catalogue.find(row=>row.id===item.exerciseId && row.revision===item.exerciseRevision)
    const dose = doses.find(row=>row.id===item.doseId && row.revision===item.doseRevision)
    if (!item.occurrenceId || usedOccurrences.has(item.occurrenceId)) { gaps.push({reason:'occurrence_identity_conflict'}); continue }
    usedOccurrences.add(item.occurrenceId)
    if (!record) { gaps.push({occurrenceId:item.occurrenceId,reason:'unknown_exercise_revision'}); continue }
    if (!roleIds.has(item.role) || !record.roles?.includes(item.role)) { gaps.push({occurrenceId:item.occurrenceId,reason:'role_mismatch'}); continue }
    if (usedExercises.has(record.id)) { gaps.push({occurrenceId:item.occurrenceId,reason:'repeated_exercise_requires_reviewed_policy'}); continue }
    usedExercises.add(record.id)
    const eligibility=evaluateCandidate(record,context,request,manifest)
    const resolvedDose=resolveDose(record,dose,manifest,context)
    if (eligibility.eligibility!=='eligible' || resolvedDose.state!=='resolved') {
      gaps.push({occurrenceId:item.occurrenceId,reason:'item_not_ready',details:[...eligibility.reasons,...(resolvedDose.reasons || [])]}); continue
    }
    blocks.push({occurrenceId:item.occurrenceId,role:item.role,exerciseId:record.id,exerciseRevision:record.revision,dose:resolvedDose,matchedNeeds:eligibility.matchedNeeds})
  }
  const durationSeconds=blocks.reduce((sum,block)=>sum+block.dose.seconds,0)
  if (durationSeconds>request.budgetSeconds) gaps.push(budgetGap(durationSeconds,request.budgetSeconds,{lowerBound:blocks.length!==selection.length}))
  for(const role of request.roles) if(role.required && !blocks.some(block=>block.role===role.id)) gaps.push({role:role.id,reason:'required_role_missing'})
  for(const need of request.requiredNeeds || []) if(!blocks.some(block=>block.matchedNeeds.includes(need))) gaps.push({need,reason:'required_need_missing'})
  const result={engineVersion:ENGINE_VERSION,resolverVersion:context.version,contextGeneration:context.generation,manifestId:manifest?.id || null,
    sessionState:context.state,blocks,gaps,durationSeconds,completeness:context.state==='eligible_for_coach_review' && !gaps.length && blocks.length===selection.length ? 'ready_for_coach_review':'blocked',assignment:null}
  return {...result,replay:canonical(result)}
}
