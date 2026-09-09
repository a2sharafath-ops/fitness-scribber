import {coachLabel} from '../../../lib/pooling/coach-view'

function doseText(prescription={}){
 if(!Number.isFinite(prescription.sets))return 'Targets will appear after the workout check'
 const work=prescription.mode==='repetitions'?`${prescription.reps} repetitions`:`${prescription.workSeconds} seconds`
 return `${prescription.sets} set${prescription.sets===1?'':'s'} × ${work}${prescription.sideMultiplier===2?' each side':''}`
}

export default function CoachWorkoutPreview({blocks=[],catalogue=[]}){
 return <div className="coach-workout-preview">{blocks.map((block,index)=>{
  const exercise=catalogue.find(item=>item.id===block.exerciseId&&item.revision===block.exerciseRevision)
  const prescription=block.dose?.prescription||block.prescription||{}
  return <article className="coach-exercise" key={block.occurrenceId}>
   <span className="coach-exercise-number">{index+1}</span>
   <div className="coach-exercise-body"><div className="coach-exercise-role">{coachLabel(block.role)}</div><h3>{exercise?.name||block.exerciseName||'Exercise'}</h3>
    <p><strong>{doseText(prescription)}</strong>{Number.isFinite(prescription.sets)?` · Rest ${prescription.restSeconds||0} sec`:''}{prescription.loadKg!=null?` · ${prescription.loadKg} kg`:''}</p>
    {!!exercise?.instructions?.length&&<details><summary>How to do it</summary>{exercise.instructions.map((line,i)=><p key={i}>{line}</p>)}</details>}
    {!!block.matchedNeeds?.length&&<p className="coach-rationale">Included for: {block.matchedNeeds.map(coachLabel).join(', ')}</p>}
   </div>
  </article>
 })}</div>
}
