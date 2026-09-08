import {admission,doseTiming} from './selection.js'

// Validation does not supply missing professional evidence or publish anything.
export function validateRelease(document){
 try{return validateDocument(document)}catch{return {valid:false,errors:['malformed_release_document']}}
}
function validateDocument(document){
 const errors=[]
 if(!document || typeof document!=='object')return {valid:false,errors:['release_document_required']}
 const {manifest,modulePolicy,catalogue,doses,extensionPolicies=[]}=document
 if(!manifest?.id || manifest.state!=='published' || !manifest.releaseEvidence || !Array.isArray(manifest.records))errors.push('accepted_release_manifest_required')
 if(!Array.isArray(catalogue) || !catalogue.length || !Array.isArray(doses) || !doses.length)return {valid:false,errors:[...errors,'catalogue_and_doses_required']}
 const records=[modulePolicy,...catalogue,...doses,...extensionPolicies].filter(Boolean)
 const keys=records.map(row=>`${row.id}@${row.revision}`)
 if(new Set(keys).size!==keys.length)errors.push('duplicate_record_revision')
 if(new Set((manifest?.records || []).map(row=>`${row.id}@${row.revision}`)).size!==(manifest?.records || []).length)errors.push('duplicate_manifest_entry')
 if((manifest?.records || []).some(row=>!keys.includes(`${row.id}@${row.revision}`)))errors.push('manifest_references_missing_record')
 for(const record of records)if(!record.id || !Number.isSafeInteger(record.revision) || record.revision<1 || !admission(record,manifest))errors.push(`${record.id || 'unknown'}:accepted_version_evidence_required`)
 for(const policy of extensionPolicies){
  if(!['daily','progression','weekly'].includes(policy.kind))errors.push(`${policy.id}:unsupported_extension_kind`)
  if(policy.kind==='daily' && (!Array.isArray(policy.signalRules) || !policy.signalRules.length || policy.signalRules.some(r=>!r.id || !r.key || !['gte','lte','equals'].includes(r.operator) || r.threshold===undefined || !Number.isFinite(r.delta) || !Array.isArray(r.roles) || !r.roles.length || !policy.fields?.[r.field])))errors.push(`${policy.id}:daily_parameters_incomplete`)
  if(policy.kind==='progression' && (!Number.isSafeInteger(policy.minimumPerformances) || policy.minimumPerformances<1 || !Number.isFinite(policy.windowSeconds) || policy.windowSeconds<0 || !['gte','lte'].includes(policy.operator) || !Number.isFinite(policy.comparisonThreshold) || !Number.isFinite(policy.progressionDelta) || !policy.fields?.[policy.field] || policy.performanceUnit!=='completed_occurrence' || !['minimum_actual','maximum_actual'].includes(policy.aggregation)))errors.push(`${policy.id}:progression_parameters_incomplete`)
  if(['daily','progression'].includes(policy.kind) && (!policy.fields || Object.values(policy.fields).some(f=>!f || ![f.min,f.max,f.increment,f.maxChange].every(Number.isFinite) || f.min>f.max || f.increment<=0 || f.maxChange<0)))errors.push(`${policy.id}:reviewed_effect_bounds_required`)
if(policy.kind==='weekly' && (!policy.supportKey || !Array.isArray(policy.goals) || !policy.goals.length || !Array.isArray(policy.splits) || !policy.splits.length || !Number.isSafeInteger(policy.minSessions) || policy.minSessions<1 || !Number.isSafeInteger(policy.maxSessions) || policy.maxSessions<policy.minSessions || policy.maxSessions>31 || !Number.isFinite(policy.maxWeeklySeconds) || policy.maxWeeklySeconds<=0 || !Array.isArray(policy.patternRules) || !policy.patternRules.length || policy.patternRules.some(r=>!r.pattern || !Number.isSafeInteger(r.minSessions) || r.minSessions<0 || !Number.isSafeInteger(r.maxSessions) || r.maxSessions<r.minSessions || !Number.isFinite(r.recoverySeconds) || r.recoverySeconds<0)))errors.push(`${policy.id}:weekly_parameters_incomplete`)
 }
 if(!modulePolicy || !Array.isArray(modulePolicy.requirements) || !Array.isArray(modulePolicy.requiredRoles) || !modulePolicy.requiredRoles.length || !Number.isFinite(modulePolicy.decisionValiditySeconds) || modulePolicy.decisionValiditySeconds<=0 || modulePolicy.decisionValiditySeconds>86400)errors.push('complete_module_policy_required')
 for(const requirement of modulePolicy?.requirements || [])if(!requirement.key || !requirement.source || !requirement.unit || !requirement.protocol || !Number.isFinite(requirement.maxAgeSeconds) || requirement.maxAgeSeconds<0)errors.push(`${requirement.key}:source_contract_incomplete`)
 for(const key of ['adult','purpose','health','equipment'])if(!modulePolicy?.requirements?.some(row=>row.key===modulePolicy.authorityKeys?.[key] && row.required===true))errors.push(`${key}:required_authority_mapping_missing`)
 for(const record of catalogue){
  if(!['scopes','settings','levels','equipment','prerequisites','roles','demands','doseRefs'].every(key=>Array.isArray(record[key])))errors.push(`${record.id}:metadata_incomplete`)
  if(!record.doseRefs?.length)errors.push(`${record.id}:reviewed_dose_required`)
  for(const id of record.doseRefs || [])if(!doses.some(dose=>dose.id===id))errors.push(`${record.id}:unknown_dose_${id}`)
 }
 for(const dose of doses){
  const record=catalogue.find(row=>row.doseRefs?.includes(dose.id))
  if(!record)errors.push(`${dose.id}:unreferenced_dose`)
  if(doseTiming(dose).state!=='resolved')errors.push(`${dose.id}:invalid_dose`)
  if(dose.loadMethod && !['none','absolute','percentage'].includes(dose.loadMethod))errors.push(`${dose.id}:unsupported_load_method`)
  if(['absolute','percentage'].includes(dose.loadMethod)){
   if(!Number.isFinite(dose.minimumLoadKg)||!Number.isFinite(dose.maximumLoadKg)||dose.minimumLoadKg<0||dose.minimumLoadKg>dose.maximumLoadKg)errors.push(`${dose.id}:load_bounds_incomplete`)
   if(!modulePolicy?.requirements?.some(r=>r.key===dose.loadInventoryKey && r.required===true && r.sessionSpecific===true))errors.push(`${dose.id}:session_load_inventory_required`)
  }
  if(dose.loadMethod==='absolute' && (!Number.isFinite(dose.loadKg)||dose.loadKg<dose.minimumLoadKg||dose.loadKg>dose.maximumLoadKg))errors.push(`${dose.id}:invalid_absolute_load`)
  if(dose.loadMethod==='percentage' && (!dose.loadReferenceKey || !dose.referenceMethod || !dose.allowedReferenceKinds?.length || !Number.isFinite(dose.percentage) || dose.percentage<=0 || !Number.isFinite(dose.incrementKg) || dose.incrementKg<=0 || !modulePolicy?.requirements?.some(r=>r.key===dose.loadReferenceKey && r.required===true)))errors.push(`${dose.id}:load_reference_policy_incomplete`)
 }
 return {valid:errors.length===0,errors}
}
