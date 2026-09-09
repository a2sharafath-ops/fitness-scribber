export default function PoolingWorkoutPreview({blocks=[],catalogue=[]}) {
 return <div>{blocks.map(block=>{
  const exercise=catalogue.find(e=>e.id===block.exerciseId&&e.revision===block.exerciseRevision),dose=block.dose?.prescription||block.prescription
  return <article key={block.occurrenceId} style={{borderTop:'1px solid var(--border)',padding:'12px 0'}}>
   <h4>{block.role.replaceAll('_',' ')} · {exercise?.name||block.exerciseName||block.exerciseId}</h4>
   {dose&&<p>{dose.sets} sets × {dose.mode==='repetitions'?`${dose.reps} reps`:`${dose.workSeconds} seconds`}{dose.sideMultiplier===2?' each side':''} · rest {dose.restSeconds}s{dose.loadKg!=null?` · ${dose.loadKg} kg`:''}</p>}
   {exercise?.instructions?.map((text,index)=><p className="muted" key={index}>{text}</p>)}
   <small>{block.exerciseId} · revision {block.exerciseRevision}</small>
  </article>
 })}</div>
}
