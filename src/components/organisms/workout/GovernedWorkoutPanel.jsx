import {useState} from 'react'

function PerformedSet({assignment,block,setIndex,side,workflow,latest,active}){
 const [value,setValue]=useState(latest?.actual ?? ''),[load,setLoad]=useState(latest?.loadKg ?? ''),[effort,setEffort]=useState(latest?.effort ?? ''),[method,setMethod]=useState(latest?.effortMethod || '')
 const [performedAt,setPerformedAt]=useState(latest?.performedAt || latest?.recordedAt || ''),[reason,setReason]=useState('')
 const unit=block.prescription.mode==='repetitions'?'repetitions':'seconds',prefix=`${assignment.id}-${block.occurrenceId}-${setIndex}-${side}`
 function changed(){if(active && !performedAt)setPerformedAt(new Date().toISOString())}
 const valid=value!=='' && Number.isFinite(Number(value)) && Number(value)>=0 && (unit!=='repetitions' || Number.isInteger(Number(value))) && Number.isFinite(Date.parse(performedAt)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(performedAt) && (load==='' || (Number.isFinite(Number(load)) && Number(load)>=0)) && (effort==='' || (Number.isFinite(Number(effort)) && method.trim())) && (!latest || reason.trim())
 return <fieldset><legend>Set {setIndex}{side==='not_applicable'?'':` · ${side}`}{latest?' · correction':' · performed result'}</legend>
  <label htmlFor={prefix+'actual'}>Actual {unit}</label><input id={prefix+'actual'} type="number" min="0" value={value} onChange={e=>{setValue(e.target.value);changed()}}/>
  <label htmlFor={prefix+'load'}>Actual load (kg), if measured</label><input id={prefix+'load'} type="number" min="0" value={load} onChange={e=>{setLoad(e.target.value);changed()}}/>
  <label htmlFor={prefix+'effort'}>Reported effort, optional</label><input id={prefix+'effort'} type="number" value={effort} onChange={e=>{setEffort(e.target.value);changed()}}/>
  <label htmlFor={prefix+'method'}>Effort scale / method</label><input id={prefix+'method'} value={method} onChange={e=>setMethod(e.target.value)}/>
  <label htmlFor={prefix+'at'}>Time performed, with UTC offset</label><input id={prefix+'at'} value={performedAt} placeholder="2026-09-07T12:00:00+05:30" onChange={e=>setPerformedAt(e.target.value)}/>
  {latest && <><label htmlFor={prefix+'reason'}>Correction reason</label><textarea id={prefix+'reason'} value={reason} onChange={e=>setReason(e.target.value)}/></>}
  <button className="btn ghost" disabled={!valid || workflow.status==='saving' || !!workflow.pending} onClick={()=>workflow.execute(assignment,'actual',{occurrenceId:block.occurrenceId,setIndex,side,actual:Number(value),unit,performedAt:new Date(performedAt).toISOString(),...(load!==''?{loadKg:Number(load)}:{}),...(effort!==''?{effort:Number(effort),effortMethod:method}:{}),...(latest?{supersedes:latest.id,correctionReason:reason}:{})})}>{latest?'Save attributed correction':'Save performed result'}</button>
 </fieldset>
}

export default function GovernedWorkoutPanel({workflow}){
 const [health,setHealth]=useState({})
 return <section className="card pooling-workspace" aria-labelledby="governed-workouts"><h2 id="governed-workouts" tabIndex={-1}>Coach-approved pooling sessions</h2>
  <p>Only server-approved revisions appear here. Stop exercising immediately when needed; record-save confirmation is separate. Targets and performed results are kept distinct.</p>
  <button className="btn ghost" onClick={workflow.refresh} disabled={workflow.status==='saving'}>Refresh approved sessions</button>
  <p role="status">{workflow.status.replaceAll('_',' ')}</p>{workflow.error && <p role="alert">{workflow.error}</p>}
  {workflow.pending && <button className="btn" disabled={workflow.status==='saving'} onClick={workflow.retry}>Reconcile original pending operation</button>}
  {!workflow.assignments.length && <p>No approved pooling sessions available. Legacy history is unchanged.</p>}
  {workflow.assignments.map(assignment=>{
   const active=['start','resume','pause'].includes(assignment.status),localStop=workflow.stopped.includes(assignment.id)
   const allowed=!assignment.stale && !assignment.held && !localStop && workflow.status==='ready' && !workflow.pending
   const superseded=new Set(assignment.actuals.map(row=>row.supersedes).filter(Boolean))
   return <article key={assignment.id}><h3>{assignment.date} · approved draft {assignment.draftId}</h3><p>{assignment.status} · {assignment.held?'review hold':assignment.stale?'stale — coach review required':'current checks required'}</p>
    {localStop && <p role="status">Stop requested. Do not continue; check the server save status above.</p>}
    {['assigned','start','resume','pause'].includes(assignment.status) && <><label htmlFor={`health-${assignment.id}`}>Current health-change response</label><select id={`health-${assignment.id}`} value={health[assignment.id] || ''} onChange={e=>setHealth({...health,[assignment.id]:e.target.value})}><option value="">Choose explicitly for this session</option><option value="no_change">No change reported</option><option value="changed">Something changed — coach review needed</option><option value="declined">Prefer not to answer</option></select>
     {['changed','declined'].includes(health[assignment.id]) && <button className="btn" disabled={workflow.status==='saving'} onClick={()=>workflow.reportHealth(assignment,health[assignment.id])}>Save report for coach review</button>}
     {['assigned','pause'].includes(assignment.status) && <button className="btn" disabled={!allowed || workflow.startAllowed===false || health[assignment.id]!=='no_change'} onClick={()=>{const value=health[assignment.id];setHealth({...health,[assignment.id]:''});workflow.execute(assignment,assignment.status==='pause'?'resume':'start',{healthChange:value})}}>{assignment.status==='pause'?'Resume':'Start'} approved session</button>}
    </>}
    {active && <><button className="btn" onClick={()=>workflow.execute(assignment,'stop')}>Stop now</button><button className="btn ghost" disabled={!allowed || assignment.status==='pause'} onClick={()=>workflow.execute(assignment,'pause')}>Pause</button><button className="btn ghost" disabled={workflow.status==='saving' || !!workflow.pending} onClick={()=>workflow.execute(assignment,'complete')}>Complete session</button></>}
    {assignment.blocks.map(block=><div key={block.occurrenceId}><h4>{block.role} · {block.exerciseId}</h4><p>Target: {block.prescription.sets} sets · {block.prescription.mode==='repetitions'?`${block.prescription.reps} repetitions`:`${block.prescription.workSeconds} seconds`}{block.prescription.sideMultiplier===2?' per side':''}{block.prescription.loadKg!==null && block.prescription.loadKg!==undefined?` · ${block.prescription.loadKg} kg`:''} · rest {block.prescription.restSeconds} seconds</p>
     {assignment.status!=='assigned' && <details><summary>Record or correct performed sets</summary><p>Late entries require the actual time performed before stop/completion. Corrections append a new attributed record; they do not erase the original.</p>{Array.from({length:block.prescription.sets},(_,index)=>(block.prescription.sideMultiplier===2?['left','right']:['not_applicable']).map(side=>{
      const latest=assignment.actuals.find(row=>row.occurrenceId===block.occurrenceId && row.setIndex===index+1 && (row.side || 'not_applicable')===side && !superseded.has(row.id))
      return <PerformedSet key={`${index}:${side}:${latest?.id || 'new'}`} assignment={assignment} block={block} setIndex={index+1} side={side} latest={latest} workflow={workflow} active={active && !localStop}/>
     }))}</details>}
    </div>)}
    <details><summary>{assignment.actuals.length} preserved result records</summary><div style={{overflowX:'auto'}}><table><thead><tr><th>Set / side</th><th>Actual</th><th>Load</th><th>Effort</th><th>Record status</th></tr></thead><tbody>{assignment.actuals.map(row=><tr key={row.id}><td>{row.occurrenceId} · {row.setIndex} · {row.side || 'not applicable'}</td><td>{row.actual} {row.unit}</td><td>{row.loadKg===null || row.loadKg===undefined?'not reported':`${row.loadKg} kg`}</td><td>{row.effort===null || row.effort===undefined?'not reported':`${row.effort} (${row.effortMethod})`}</td><td>{superseded.has(row.id)?'superseded — retained':row.supersedes?'current correction':'current'} · {row.recordedAt}</td></tr>)}</tbody></table></div></details>
   </article>
  })}
 </section>
}
