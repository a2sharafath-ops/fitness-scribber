import {useState} from 'react'
export default function GovernedWorkoutPanel({workflow}){
 const [health,setHealth]=useState({}),[actual,setActual]=useState({})
 return <section className="card" aria-labelledby="governed-workouts"><h2 id="governed-workouts">Coach-approved pooling sessions</h2>
   <p>Only server-approved revisions appear here. Stopping is immediate; confirmation that records were saved is shown separately.</p>
   <button className="btn ghost" onClick={workflow.refresh} disabled={workflow.status==='saving'}>Refresh approved sessions</button>
   <p role="status">{workflow.status.replaceAll('_',' ')}</p>{workflow.error && <p role="alert">{workflow.error}</p>}
   {workflow.pending && <button className="btn" disabled={workflow.status==='saving'} onClick={workflow.retry}>Reconcile original pending operation</button>}
   {!workflow.assignments.length && <p>No approved pooling sessions available. Legacy history is unchanged.</p>}
   {workflow.assignments.map(assignment=>{
     const active=['start','resume','pause'].includes(assignment.status),localStop=workflow.stopped.includes(assignment.id)
     const allowed=!assignment.stale && !assignment.held && !localStop && workflow.status!=='saving'
     return <article key={assignment.id}><h3>{assignment.date} · revision {assignment.draftId}</h3><p>{assignment.status} · {assignment.held?'review hold':assignment.stale?'stale — coach review required':'current checks required'}</p>
       {localStop && <p role="status">Stop requested. Do not continue; check the server save status above.</p>}
       {['assigned','pause'].includes(assignment.status) && <><label>Current health-change response<select value={health[assignment.id] || ''} onChange={e=>setHealth({...health,[assignment.id]:e.target.value})}><option value="">Choose explicitly for this session</option><option value="no_change">No change reported</option><option value="changed">Something changed — coach review needed</option><option value="declined">Prefer not to answer</option></select></label>
         {['changed','declined'].includes(health[assignment.id]) && <button className="btn" disabled={workflow.status==='saving'} onClick={()=>workflow.reportHealth(assignment,health[assignment.id])}>Save report for coach review</button>}
         <button className="btn" disabled={!allowed || health[assignment.id]!=='no_change'} onClick={()=>workflow.execute(assignment,assignment.status==='pause'?'resume':'start',{healthChange:health[assignment.id]})}>{assignment.status==='pause'?'Resume':'Start'} approved session</button></>}
       {active && <><button className="btn" onClick={()=>workflow.execute(assignment,'stop')}>Stop now</button><button className="btn ghost" disabled={!allowed || assignment.status==='pause'} onClick={()=>workflow.execute(assignment,'pause')}>Pause</button><button className="btn ghost" disabled={workflow.status==='saving'} onClick={()=>workflow.execute(assignment,'complete')}>Complete session</button></>}
       {assignment.blocks.map(block=><div key={block.occurrenceId}><p>{block.role} · {block.exerciseId} · {block.prescription.sets} sets · {block.prescription.workSeconds} seconds per set</p>
         {active && !localStop && Array.from({length:block.prescription.sets},(_,index)=>{
           const field=`${assignment.id}:${block.occurrenceId}:${index}`,unit=block.prescription.mode==='repetitions'?'repetitions':'seconds'
           return <div key={index}><label>Actual {unit} for set {index+1}<input type="number" min="0" value={actual[field] ?? ''} onChange={e=>setActual({...actual,[field]:e.target.value})} /></label><button className="btn ghost" disabled={workflow.status==='saving' || actual[field]===undefined || actual[field]===''} onClick={()=>workflow.execute(assignment,'actual',{occurrenceId:block.occurrenceId,setIndex:index+1,actual:Number(actual[field]),unit})}>Save performed result</button></div>
         })}
       </div>)}
       <p>{assignment.actuals.length} recorded results preserved.</p>
       {workflow.pending?.assignmentId===assignment.id && <button className="btn" disabled={workflow.status==='saving'} onClick={()=>workflow.execute(assignment,workflow.pending.kind,workflow.pending.payload)}>Retry original operation</button>}
     </article>
   })}
 </section>
}
