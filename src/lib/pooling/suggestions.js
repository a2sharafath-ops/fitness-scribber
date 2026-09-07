import {selectPool,compatibleAlternatives} from './selection.js'
import {evaluateDraft} from './decision.js'
export function suggestSelection(input,request){
 if(request.mode==='generate')return selectPool(input)
 const original=input.selection.find(row=>row.occurrenceId===request.occurrenceId)
 if(!original)return {completeness:'blocked',blocks:[],gaps:[{reason:'unknown_occurrence'}],assignment:null}
 const alternatives=compatibleAlternatives(input,original.exerciseId)
 if(!alternatives.some(row=>row.id===request.exerciseId))return {completeness:'blocked',blocks:[],gaps:[{reason:'no_compatible_alternative'}],assignment:null}
 const record=input.catalogue.find(row=>row.id===request.exerciseId)
 for(const dose of input.doses.filter(d=>record.doseRefs.includes(d.id)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)){
  const selection=input.selection.map(row=>row.occurrenceId===original.occurrenceId?{...row,exerciseId:record.id,exerciseRevision:record.revision,doseId:dose.id,doseRevision:dose.revision}:row)
  const result=evaluateDraft({...input,selection})
  if(result.completeness==='ready_for_coach_review')return result
 }
 return {completeness:'blocked',blocks:[],gaps:[{reason:'no_compatible_dose_within_budget'}],assignment:null}
}
