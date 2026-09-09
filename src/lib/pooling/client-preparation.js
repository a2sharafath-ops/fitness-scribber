// Existing records become review inputs, never silent normal/cleared findings.
export const preparationRoles=['general_warmup','mobility_lengthening','activation','integration','main_accessory','conditioning','cooldown']
export const readable=value=>String(value).replaceAll('_',' ')
export function latestRecord(rows=[],predicate=()=>true,at=new Date().toISOString()) {
 return rows.filter(r=>predicate(r)&&r.date&&r.date<=at.slice(0,10)).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.id).localeCompare(String(a.id)))[0] || null
}
export function preparationDefaults(context) {
 const client=context.data.clients[0]
 return {level:['beginner','intermediate','advanced'].includes(client.level?.toLowerCase())?client.level.toLowerCase():'',
  setting:'home',budget:30,goals:['general_fitness'],equipment:[],prerequisites:[],roles:[...preparationRoles],
  adult:false,health:'',equipmentReviewed:false,sourcesReviewed:false,support:'none',requiredNeeds:[]}
}
export function preparationSummary(context) {
 const data=context.data
 return ['screenings','assessments','wellness','wearable','concerns','maxes'].map(source=>({source,records:data[source]||[],count:(data[source]||[]).length}))
}
export function findingReview(context) {
 const movement=latestRecord(context.data.assessments,r=>r.type==='movement',context.at)
 if(movement?.data?.protocol!=='nasm')return []
 const mapping={feetTurnOut:['NEED-03','NEED-09'],footEversion:['NEED-03'],kneesValgus:['NEED-08','NEED-09'],kneesVarus:['NEED-09'],
  forwardLean:['NEED-06','NEED-10'],lowBackArches:['NEED-06'],posteriorPelvicTilt:['NEED-10'],armsFallForward:['NEED-05'],armsAdductAnt:['NEED-05'],weightShift:['NEED-08','NEED-09']}
 return Object.entries(movement.data.findings||{}).filter(([,v])=>v&&[v.l,v.r,v.mid].some(x=>x===true)).map(([key,value])=>({
  key,sourceId:movement.id,date:movement.date,sides:['l','r','mid'].filter(side=>value[side]===true),pain:value.pain===true,needs:mapping[key]||[],
 }))
}
export function clientPreparation(context,form,sessionAt,timeZone) {
 const client=context.data.clients[0],doc=context.release
 if(!doc || doc.manifest.audience!=='development')throw Error('Development catalogue is unavailable.')
 if(!form.sourcesReviewed || !form.equipmentReviewed || !form.adult || !['no_change','changed','declined'].includes(form.health))throw Error('Review the source records, adult scope, current health response and equipment before preparing.')
 if(!['beginner','intermediate','advanced'].includes(form.level)||!['home','gym','travel'].includes(form.setting)||!Number.isFinite(+form.budget)||+form.budget<1||+form.budget>180)throw Error('Choose training level, setting and a time budget from 1 to 180 minutes.')
 if(!Number.isFinite(Date.parse(sessionAt)))throw Error('Choose a valid session date and time.')
 const source=context.sources.find(s=>s.source==='clients'&&s.id===client.id&&s.status==='loaded')
 if(!source)throw Error('The current client source could not be verified. Reload the inputs.')
 const base={source:'clients',sourceId:client.id,sourceToken:source.token,unit:'boolean',protocol:'coach-reviewed-v1',side:'not_applicable',effectiveAt:context.at,sessionAt,
  evidenceReference:'Coach reviewed existing client records and explicitly confirmed these session inputs in the client workflow.'}
 const values={adult:form.adult,purpose:true,health:form.health,equipment:form.equipment,support:form.support}
 const observations=Object.entries(values).map(([key,value])=>({...base,key,value,state:'reported',unit:key==='support'?'support':'boolean'}))
 for(const requirement of doc.modulePolicy.requirements.filter(r=>r.source==='clients'&&!Object.hasOwn(values,r.key))){
  const confirmed=form.prerequisites.includes(requirement.key)&&requirement.key!=='external_load_prescription_reviewed'
  observations.push({...base,key:requirement.key,value:confirmed?true:null,state:confirmed?'reported':'unknown'})
 }
 const wellness=latestRecord(context.data.wellness,()=>true,context.at)
 const wellnessSource=wellness&&context.sources.find(s=>s.source==='wellness'&&s.id===wellness.id&&s.status==='loaded')
 if(wellnessSource)for(const [key,field]of Object.entries({stress:'stress',fatigue:'fatigue',soreness:'soreness',sleepQuality:'sleep'})) {
  const value=wellness[field]
  if(typeof value==='number'&&value>=1&&value<=7)observations.push({...base,key,value,state:'measured',unit:'score_1_7',source:'wellness',sourceId:wellness.id,sourceToken:wellnessSource.token,
   effectiveAt:`${wellness.date}T00:00:00.000Z`,evidenceReference:`Existing wellness/${wellness.id}/${field}, reviewed by coach; original date retained.`})
 }
 const date=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(sessionAt))
 const required=doc.modulePolicy.requiredRoles
 return {observations,proposal:{date,manifestId:doc.manifest.id,session:{sessionAt,timeZone,request:{scope:'adult_general_fitness',setting:form.setting,level:form.level,budgetSeconds:+form.budget*60,
  goalPriority:form.goals,requiredNeeds:form.requiredNeeds||[],roles:preparationRoles.filter(r=>required.includes(r)||form.roles.includes(r)).map(id=>({id,required:required.includes(id)}))}},selection:[],
  notes:'Development client workflow: source records reviewed; explicit coach approval is required before assignment.'}}
}
