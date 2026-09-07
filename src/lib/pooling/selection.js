import { canonical } from './context.js'
export const ENGINE_VERSION = 'pool-selection-2'
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0
const unique = values => [...new Set(values)].sort(compare)

export function admission(record, manifest) {
  if (!manifest || manifest.state !== 'published' || manifest.revoked || !manifest.releaseEvidence) return false
  const entry = manifest.records?.find(item => item.id === record.id && item.revision === record.revision)
  return !!entry && record.reviewStatus === 'published' && record.automationEligible === true &&
    record.rightsStatus === 'accepted' && ['content', 'rights', 'scope'].every(kind =>
      record.approvalEvidence?.some(e => e.kind === kind && e.decision === 'accepted' && e.reviewerId && e.reference && e.revision === record.revision))
}

export function evaluateCandidate(record, context, request, manifest) {
  const reasons = []
  if (!['scopes', 'settings', 'levels', 'equipment', 'prerequisites', 'roles', 'demands', 'doseRefs'].every(key => Array.isArray(record[key]))) reasons.push('metadata_incomplete')
  if (!admission(record, manifest)) reasons.push('content_not_admitted')
  if (!record.scopes?.includes(request.scope)) reasons.push('unsupported_scope')
  if (!record.settings?.includes(request.setting)) reasons.push('setting_mismatch')
  if (!record.levels?.includes(request.level)) reasons.push('level_mismatch')
  if (request.equipmentConfirmed !== true) reasons.push('equipment_unconfirmed')
  if ((record.equipment || []).some(item => !request.equipment?.includes(item))) reasons.push('equipment_missing')
  if ((record.prerequisites || []).some(key => context.facts[key]?.state !== 'usable' || context.facts[key]?.value !== true)) reasons.push('prerequisite_missing')
  if (request.refusedIds?.includes(record.id)) reasons.push('client_refusal')
  if (request.prohibitedIds?.includes(record.id) || record.demands?.some(value => request.prohibitedDemands?.includes(value))) reasons.push('restriction_exclusion')
  if (context.state !== 'eligible_for_coach_review') reasons.push('session_not_eligible')
  const matchedNeeds = unique((record.needRefs || []).filter(id => request.requiredNeeds?.includes(id)))
  return { id: record.id, revision: record.revision, eligibility: reasons.length ? 'excluded' : 'eligible', reasons, matchedNeeds }
}

export function resolveDose(record, dose, manifest, context = null) {
  if (!dose || !record.doseRefs?.includes(dose.id) || !admission(dose, manifest)) return { state: 'unresolved', reasons: ['dose_not_admitted'] }
  const { sets, workSeconds, restSeconds, setupSeconds, transitionSeconds, sideMultiplier } = dose
  if (!Number.isInteger(sets) || sets < 1 || ![1, 2].includes(sideMultiplier) ||
      [workSeconds, restSeconds, setupSeconds, transitionSeconds].some(value => !Number.isFinite(value) || value < 0) || workSeconds === 0) {
    return { state: 'unresolved', reasons: ['dose_invalid_or_incomplete'] }
  }
  const seconds = sets * workSeconds * sideMultiplier + Math.max(0, sets * sideMultiplier - 1) * restSeconds + setupSeconds + transitionSeconds
  if (!Number.isFinite(seconds)) return { state: 'unresolved', reasons: ['dose_invalid_or_incomplete'] }
  const mode=dose.mode || 'timed'
  if(!['timed','repetitions'].includes(mode) || (mode==='repetitions' && (!Number.isSafeInteger(dose.reps) || dose.reps<1))) return {state:'unresolved',reasons:['dose_invalid_or_incomplete']}
  let loadKg=null
  if(dose.loadMethod==='absolute') loadKg=dose.loadKg
  else if(dose.loadMethod==='percentage'){
    const reference=context?.facts[dose.loadReferenceKey]
    const value=reference?.value
    if(reference?.state!=='usable' || value?.variantId!==record.id || value?.unit!=='kg' || !dose.allowedReferenceKinds?.includes(value?.kind) || value?.method!==dose.referenceMethod || !Number.isFinite(value?.valueKg) || value.valueKg<=0 || !Number.isFinite(dose.percentage) || dose.percentage<=0 || !Number.isFinite(dose.incrementKg) || dose.incrementKg<=0) return {state:'unresolved',reasons:['load_reference_unavailable']}
    loadKg=Math.round(value.valueKg*dose.percentage/100/dose.incrementKg)*dose.incrementKg
  }else if(dose.loadMethod && dose.loadMethod!=='none')return {state:'unresolved',reasons:['loading_method_unsupported']}
  if(['absolute','percentage'].includes(dose.loadMethod) && (!Number.isFinite(loadKg) || !Number.isFinite(dose.minimumLoadKg) || !Number.isFinite(dose.maximumLoadKg) || loadKg<dose.minimumLoadKg || loadKg>dose.maximumLoadKg || loadKg<0))return {state:'unresolved',reasons:['load_outside_reviewed_bounds']}
  return { state: 'resolved', id: dose.id, revision: dose.revision, seconds,
    prescription: { sets, workSeconds, restSeconds, setupSeconds, transitionSeconds, sideMultiplier,mode,reps:mode==='repetitions'?dose.reps:null,loadKg,
      ...(dose.comparison?{comparison:structuredClone(dose.comparison)}:{}) } }
}

export function selectPool({ context, catalogue, doses, manifest, request }) {
  if (!Array.isArray(request.roles) || !Number.isFinite(request.budgetSeconds) || request.budgetSeconds <= 0) throw new Error('invalid_request')
  if (new Set(catalogue.map(row => row.id)).size !== catalogue.length) throw new Error('duplicate_catalogue_identity')
  const records = [...catalogue].sort((a, b) => compare(a.id, b.id))
  const candidates = records.map(record => evaluateCandidate(record, context, request, manifest))
  const byId = new Map(records.map(record => [record.id, record]))
  const covered = new Set(), used = new Set(), blocks = [], gaps = [], omissions = []
  let durationSeconds = 0
  for (const role of request.roles) {
    const options = candidates.filter(candidate => candidate.eligibility === 'eligible' && !used.has(candidate.id) && byId.get(candidate.id).roles.includes(role.id))
      .map(candidate => {
        const record = byId.get(candidate.id)
        const goalIndex = (request.goalPriority || []).findIndex(goal => record.goalRefs?.includes(goal))
        return { candidate, record, score: [
          -candidate.matchedNeeds.filter(id => !covered.has(id)).length,
          goalIndex < 0 ? Number.MAX_SAFE_INTEGER : goalIndex,
          request.pinnedIds?.includes(candidate.id) ? -1 : 0,
          request.preferredIds?.includes(candidate.id) ? -1 : 0,
        ] }
      }).sort((a, b) => {
        for (let index = 0; index < a.score.length; index++) if (a.score[index] !== b.score[index]) return a.score[index] - b.score[index]
        return compare(a.record.id, b.record.id)
      })
    let selected
    for (const option of options) {
      const possibleDoses = doses.filter(dose => option.record.doseRefs?.includes(dose.id)).sort((a, b) => compare(a.id, b.id))
      for (const rawDose of possibleDoses) {
        const dose = resolveDose(option.record, rawDose, manifest,context)
        if (dose.state === 'resolved' && durationSeconds + dose.seconds <= request.budgetSeconds) { selected = { ...option, dose }; break }
      }
      if (selected) break
    }
    if (!selected) { (role.required ? gaps : omissions).push({ role: role.id, reason: 'no_eligible_dosed_option_within_budget' }); continue }
    const { candidate, record, dose } = selected
    used.add(record.id)
    candidate.matchedNeeds.forEach(id => covered.add(id))
    durationSeconds += dose.seconds
    blocks.push({ occurrenceId: `${role.id}:${record.id}:${record.revision}`, role: role.id, exerciseId: record.id,
      exerciseRevision: record.revision, dose, matchedNeeds: candidate.matchedNeeds })
  }
  for (const id of unique(request.requiredNeeds || [])) if (!covered.has(id)) gaps.push({ need: id, reason: 'required_need_uncovered' })
  const output = { engineVersion: ENGINE_VERSION, resolverVersion: context.version, contextGeneration: context.generation,
    manifestId: manifest?.id || null, sessionState: context.state, candidates, blocks, gaps, omissions, durationSeconds,
    completeness: context.state === 'eligible_for_coach_review' && !gaps.length && blocks.length ? 'ready_for_coach_review' : 'blocked',
    assignment: null }
  // Replay payload is canonical and excludes wall clock, random IDs and raw notes.
  return { ...output, replay: canonical(output) }
}

export function compatibleAlternatives(input, exerciseId) {
  const original = input.catalogue.find(record => record.id === exerciseId)
  if (!original || !original.familyId || !original.laterality) return []
  return selectPool(input).candidates.filter(candidate => {
    const record = input.catalogue.find(row => row.id === candidate.id)
    return candidate.id !== exerciseId && candidate.eligibility === 'eligible' && record.familyId === original.familyId && record.laterality === original.laterality
  })
}
