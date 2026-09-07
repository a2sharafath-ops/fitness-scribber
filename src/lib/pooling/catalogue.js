import {admission,resolveDose} from './selection.js'

// Validation does not supply missing professional evidence or publish anything.
export function validateRelease(document){
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
  else if(dose.loadMethod!=='percentage' && resolveDose(record,dose,manifest).state!=='resolved')errors.push(`${dose.id}:invalid_dose`)
  else if(dose.loadMethod==='percentage' && (!dose.loadReferenceKey || !dose.referenceMethod || !dose.allowedReferenceKinds?.length || !Number.isFinite(dose.percentage) || dose.percentage<=0 || !Number.isFinite(dose.incrementKg) || dose.incrementKg<=0 || !Number.isFinite(dose.minimumLoadKg) || !Number.isFinite(dose.maximumLoadKg) || dose.minimumLoadKg>dose.maximumLoadKg))errors.push(`${dose.id}:load_reference_policy_incomplete`)
 }
 return {valid:errors.length===0,errors}
}
