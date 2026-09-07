import { canonical, resolveContext } from './context.js'
import { admission } from './selection.js'

const STATES = ['observed_present','assessed_absent','measured','reported','unknown','not_assessed','not_applicable']
export function validateConfirmation(value) {
  const allowed=['key','source','sourceId','sourceToken','state','value','unit','protocol','side','effectiveAt','evidenceReference','supersedes','sessionAt']
  if (!value || typeof value!=='object' || Object.keys(value).some(key=>!allowed.includes(key))) throw new Error('invalid_confirmation')
  for (const key of ['key','source','sourceId','sourceToken','unit','protocol','evidenceReference']) {
    if (typeof value[key]!=='string' || !value[key].trim() || value[key].length>1000) throw new Error('invalid_confirmation')
  }
  if (!STATES.includes(value.state) || !['left','right','bilateral','midline','not_applicable'].includes(value.side) || !Number.isFinite(Date.parse(value.effectiveAt))) throw new Error('invalid_confirmation')
  if (!Object.hasOwn(value,'value') || (['unknown','not_assessed','not_applicable'].includes(value.state) && value.value!==null)) throw new Error('invalid_confirmation')
  if (['observed_present','assessed_absent'].includes(value.state) && (typeof value.value!=='boolean' || value.value!==(value.state==='observed_present'))) throw new Error('invalid_confirmation')
  if (['measured','reported'].includes(value.state) && value.value===null) throw new Error('invalid_confirmation')
  canonical(value)
  if (value.sessionAt!==undefined && !Number.isFinite(Date.parse(value.sessionAt))) throw new Error('invalid_confirmation')
  return structuredClone(value)
}

// Only use with a server-owned bundle. Legacy source values are NOT observations.
export function buildSourceSnapshot(bundle) {
  const {clientId,generation,manifest,modulePolicy,session,confirmations,sources,restrictions,cutoff}=bundle
  if (!admission(modulePolicy || {},manifest) || !Array.isArray(modulePolicy.requirements) || !Array.isArray(modulePolicy.requiredRoles)) throw new Error('unsupported_policy')
  if (!Number.isFinite(Date.parse(cutoff)) || !Number.isFinite(Date.parse(session?.sessionAt)) || !session?.timeZone || !Array.isArray(confirmations) || !Array.isArray(sources) || !Array.isArray(restrictions)) throw new Error('source_unavailable')
  const requirements=modulePolicy.requirements
  if (new Set(requirements.map(row=>row.key)).size!==requirements.length ||
    !['adult','purpose','health','equipment'].every(key=>requirements.some(row=>row.key===modulePolicy.authorityKeys?.[key] && row.required===true))) throw new Error('unsupported_policy')
  const observations=[],sourceStatus={}
  for (const requirement of requirements) {
    sourceStatus[requirement.source]=sources.some(row=>row.source===requirement.source && row.status==='loaded')?'loaded':'failed'
  }
  for (const row of confirmations) {
    const value=validateConfirmation(row.observation)
    const source=sources.find(item=>item.source===value.source && item.id===value.sourceId)
    if ([modulePolicy.authorityKeys.health,modulePolicy.authorityKeys.equipment].includes(value.key) && value.sessionAt!==session.sessionAt) continue
    // A changed/deleted legacy source cannot retain a confirmation of old data.
    if (row.clientId!==clientId || !source || source.status!=='loaded' || source.token!==value.sourceToken || !row.confirmedBy || !row.confirmedAt) continue
    observations.push({...value,id:String(row.id),clientId,quality:'confirmed',confirmedBy:row.confirmedBy,confirmedAt:row.confirmedAt,recordedAt:row.recordedAt})
  }
  const contextInput={clientId,generation,sessionAt:session.sessionAt,timeZone:session.timeZone,knowledgeCutoff:cutoff,
    scope:modulePolicy.scope,requirements,sourceStatus,observations,restrictions,adultConfirmed:false,purposePermitted:false,healthChange:'unknown'}
  const preliminary=resolveContext(contextInput)
  const relianceExpiries=requirements.filter(row=>row.required).flatMap(requirement=>
    (preliminary.facts[requirement.key]?.refs || []).map(id=>observations.find(row=>row.id===id)).filter(Boolean)
      .map(row=>Date.parse(row.effectiveAt)+requirement.maxAgeSeconds*1000)).filter(Number.isFinite)
  contextInput.relianceExpiresAt=relianceExpiries.length?new Date(Math.min(...relianceExpiries)).toISOString():null
  const authorityValue=key=>{
    const fact=preliminary.facts[modulePolicy.authorityKeys[key]]
    return fact?.state==='usable'?fact.value:null
  }
  contextInput.adultConfirmed=authorityValue('adult')===true
  contextInput.purposePermitted=authorityValue('purpose')===true
  contextInput.healthChange=authorityValue('health')
  const equipment=authorityValue('equipment')
  const sessionRequest={...structuredClone(session.request),scope:modulePolicy.scope,equipmentConfirmed:Array.isArray(equipment),equipment:Array.isArray(equipment)?equipment:[]}
  if (!modulePolicy.requiredRoles.every(id=>sessionRequest.roles?.some(role=>role.id===id && role.required))) throw new Error('required_role_missing')
  return {contextInput,sessionRequest}
}
