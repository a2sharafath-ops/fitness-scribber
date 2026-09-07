import {canonical} from './context.js'

// A canonical proposal is still untrusted. Only a server decision can authorize it.
export function canonicalProposal({date,sessionAt,timeZone,manifestId,request,selection,notes=''}) {
  const at=Date.parse(sessionAt)
  if(!Number.isFinite(at) || !/(Z|[+-]\d{2}:\d{2})$/.test(sessionAt) || !/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('An explicit session date and time with UTC offset are required.')
  let localDate
  try{localDate=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at))}catch{throw new Error('Choose a valid IANA timezone.')}
  if(localDate!==date)throw new Error('Session time and date must agree in the selected timezone.')
  if(typeof manifestId!=='string' || !manifestId)throw new Error('Select a catalogue release.')
  if(!request || !['gym','home','travel'].includes(request.setting) || !['beginner','intermediate','advanced'].includes(request.level) || !Number.isFinite(request.budgetSeconds) || request.budgetSeconds<=0 || !Array.isArray(request.roles) || !request.roles.length || new Set(request.roles.map(row=>row.id)).size!==request.roles.length)throw new Error('Complete the setting, level, time budget and required roles.')
  if(!Array.isArray(selection) || !selection.length || new Set(selection.map(row=>row.occurrenceId)).size!==selection.length)throw new Error('Add distinct exercise occurrences.')
  for(const row of selection){
    if(!row.occurrenceId || !row.exerciseId || !Number.isSafeInteger(row.exerciseRevision) || row.exerciseRevision<1 || !row.doseId || !Number.isSafeInteger(row.doseRevision) || row.doseRevision<1 || !request.roles.some(role=>role.id===row.role))throw new Error('Every exercise needs an exact variant, dose revision and role.')
  }
  return {date,manifestId,source:'canonical_coach_review',session:{sessionAt:new Date(at).toISOString(),timeZone,request:structuredClone(request)},selection:structuredClone(selection),notes}
}

export function selectionDiff(before=[],after=[]) {
  const ids=[...new Set([...before,...after].map(row=>row.occurrenceId))]
  return ids.flatMap(id=>{
    const from=before.find(row=>row.occurrenceId===id),to=after.find(row=>row.occurrenceId===id)
    return canonical(from ?? null)===canonical(to ?? null)?[]:[{occurrenceId:id,kind:!from?'added':!to?'removed':'changed',from:from || null,to:to || null}]
  })
}
