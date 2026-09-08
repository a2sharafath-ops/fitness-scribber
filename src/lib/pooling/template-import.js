import {builderDraft} from './drafts.js'

// A saved template supplies draft content only, never a client, completed work,
// clearance or current loading authority. Legacy defaults are not filled in.
export function templateReviewBlocks(template,exercises=[],uuid=()=>crypto.randomUUID()){
  let blocks
  if(Array.isArray(template?.blocks)&&template.blocks.length)blocks=builderDraft({date:'2000-01-01',blocks:template.blocks,crossClient:true}).blocks
  else if(Array.isArray(template?.items)&&template.items.length){
    blocks=[{blockId:uuid(),blockType:'Main Lifts',order:1,exercises:template.items.map((item,i)=>{
      const count=Number(item.sets)
      if(!Number.isSafeInteger(count)||count<1||count>100)throw Error('Template set counts need explicit review before import.')
      const library=exercises.find(e=>e.id===(item.exId??item.exerciseDbRef))
      const name=library?.name || item.name || item.exercise
      if(typeof name!=='string'||!name.trim())throw Error('Template exercise names are missing. Review the saved template first.')
      const reps=item.reps==null||item.reps===''?null:Number(item.reps)
      if(reps!==null&&(!Number.isFinite(reps)||reps<0))throw Error('This legacy timed/text template needs explicit dose review. Use the manual draft editor; no repetition default was substituted.')
      const rest=item.rest==null?null:typeof item.rest==='number'?item.rest:/^\d+(?:\.\d+)?s$/.test(item.rest)?Number(item.rest.slice(0,-1)):null
      if(item.rest!=null&&(rest===null||!Number.isFinite(rest)||rest<0))throw Error('Template rest units need explicit review before import.')
      return {exerciseId:uuid(),exerciseDbRef:library?.id??null,exerciseName:name,unmapped:!library,order:i+1,intensityType:'Load',sets:Array.from({length:count},(_,index)=>({setId:uuid(),setNumber:index+1,prescribedReps:reps,prescribedLoadKg:item.loadKg??null,prescribedIntensityValue:null,prescribedTempo:item.tempo??'',prescribedRestSeconds:rest,completedReps:null,completedLoadKg:null,status:'Pending'}))}
    })}]
  }else throw Error('This template has no supported exercise content.')
  const links=new Map()
  const freshLink=id=>{if(!id)return null;if(!links.has(id))links.set(id,uuid());return links.get(id)}
  return blocks.map((block,i)=>({...block,blockId:uuid(),order:i+1,exercises:block.exercises.map((exercise,j)=>({...exercise,exerciseId:uuid(),order:j+1,supersetLinkId:freshLink(exercise.supersetLinkId),sets:exercise.sets.map((set,k)=>({...set,setId:uuid(),setNumber:k+1}))}))}))
}
