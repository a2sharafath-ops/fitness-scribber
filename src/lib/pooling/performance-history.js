import {canonical} from './context.js'

// A policy must state both the evidence unit and aggregation. No target is ever
// copied into a missing actual, and multiple sets do not become multiple sessions.
export function aggregatePerformances({performances,policy,sessionAt,knowledgeCutoff}){
 if(policy.performanceUnit!=='completed_occurrence' || !['minimum_actual','maximum_actual'].includes(policy.aggregation))return {state:'unsupported_policy',performances:[]}
 const groups=new Map(),cutoff=Date.parse(knowledgeCutoff),session=Date.parse(sessionAt)
 for(const row of performances){
  if(!row.assignmentId || !row.occurrenceId || !row.side || !Number.isFinite(Date.parse(row.recordedAt)) || !Number.isFinite(Date.parse(row.effectiveAt)) || Date.parse(row.recordedAt)>cutoff || Date.parse(row.effectiveAt)>session)continue
  const key=canonical([row.assignmentId,row.occurrenceId,row.side])
  if(!groups.has(key))groups.set(key,[])
  groups.get(key).push(row)
 }
 const results=[]
 for(const [lineageId,rows] of groups){
  const first=rows[0],sets=first.expectedSets,indexes=new Set(rows.map(r=>r.setIndex))
  const signature=r=>canonical(['variantId','variantRevision','side','range','equipment','unit','method','assistance','loadBasis','expectedSets'].map(k=>r[k]??null))
  const complete=Number.isSafeInteger(sets) && sets>0 && rows.length===sets && indexes.size===sets && [...indexes].every(i=>Number.isSafeInteger(i) && i>=1 && i<=sets) && rows.every(r=>r.complete===true && r.quality==='confirmed' && Number.isFinite(r.actual)) && rows.every(r=>signature(r)===signature(first))
  results.push({...first,id:rows.map(r=>r.id).sort().join(','),lineageId,complete,effortConfirmed:rows.every(r=>r.effortConfirmed===true),actual:complete?(policy.aggregation==='minimum_actual'?Math.min:Math.max)(...rows.map(r=>r.actual)):null,
   recordedAt:new Date(Math.max(...rows.map(r=>Date.parse(r.recordedAt)))).toISOString(),effectiveAt:Number.isFinite(Date.parse(first.effectiveAt))?new Date(Math.max(...rows.map(r=>Date.parse(r.effectiveAt)))).toISOString():null,sourceIds:rows.map(r=>r.id).sort()})
 }
 return {state:'compiled',performances:results}
}
