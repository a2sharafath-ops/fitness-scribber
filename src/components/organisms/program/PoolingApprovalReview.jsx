import {useState} from 'react'
import {approveDraft,approveBatch,decideDraft,readPendingOperations,readBuilderDraftState,saveRecoverableBuilderDraft,reviewContext} from '../../../api/pooling'
import {canonicalProposal,selectionDiff} from '../../../lib/pooling/review'
import PoolingBudgetNotice from '../../molecules/PoolingBudgetNotice'

function CanonicalEditor({clientId,context,manifests,onSaved}){
 const [release,setRelease]=useState(''),[date,setDate]=useState(''),[instant,setInstant]=useState(''),[zone,setZone]=useState('UTC')
 const [setting,setSetting]=useState(''),[level,setLevel]=useState(''),[budget,setBudget]=useState(''),[goals,setGoals]=useState(''),[selection,setSelection]=useState([])
 const [note,setNote]=useState('')
 const [status,setStatus]=useState('unsaved'),[error,setError]=useState(''),[pending,setPending]=useState(null)
 const document=manifests.find(row=>row.id===release)?.document,roles=document?.modulePolicy?.requiredRoles || []
 function edit(index,changes){setSelection(rows=>rows.map((row,i)=>i===index?{...row,...changes}:row));setStatus('unsaved')}
 async function save(){
  setError('')
  try{
   let request=pending
   if(!request){
    const proposal=canonicalProposal({date,sessionAt:instant,timeZone:zone,manifestId:release,request:{setting,level,budgetSeconds:Number(budget)*60,goalPriority:goals.split(',').map(v=>v.trim()).filter(Boolean),roles:roles.map(id=>({id,required:true}))},selection,notes:note,allowEmpty:true})
    const current=await readBuilderDraftState(clientId,date)
    request={clientId,operationKey:crypto.randomUUID(),proposal,...current,generation:context?.generation || current.generation}
    // A canonical review is a new exact revision, not an edit of saved authority.
    delete request.initialProposal
   }
   setPending(request);setStatus('saving');await saveRecoverableBuilderDraft(request);setPending(null);setStatus('saved');onSaved()
  }catch(failure){setError(failure.message);setStatus(failure.code==='outcome_unknown'?'outcome unknown':'failed');if(['draft_conflict','stale_context'].includes(failure.code))setPending(null)}
 }
 return <details><summary>Canonical exercise and dose editor</summary>
  <p>Choose exact published revisions. Missing publication or source checks cannot be replaced by legacy display names. Equipment is read from confirmed session evidence.</p>
  {!manifests.length && <p>No admitted release is available. Candidate review and manual draft saving remain available; approval is blocked.</p>}
  <fieldset disabled={!manifests.length || !!pending || status==='saving'} onChange={()=>setStatus('unsaved')}>
   <legend>Session and selected revisions</legend>
   <label htmlFor="canonical-release">Published release</label><select id="canonical-release" value={release} onChange={e=>{setRelease(e.target.value);setSelection([])}}><option value="">Choose release</option>{manifests.map(row=><option key={row.id}>{row.id}</option>)}</select>
   <label htmlFor="canonical-date">Session date</label><input id="canonical-date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
   <label htmlFor="canonical-instant">Session instant with UTC offset</label><input id="canonical-instant" placeholder="2026-09-07T10:00:00+05:30" value={instant} onChange={e=>setInstant(e.target.value)}/>
   <label htmlFor="canonical-zone">Session timezone</label><input id="canonical-zone" value={zone} placeholder="Asia/Kolkata" onChange={e=>setZone(e.target.value)}/>
   <label htmlFor="canonical-setting">Confirmed setting for this proposal</label><select id="canonical-setting" value={setting} onChange={e=>setSetting(e.target.value)}><option value="">Choose setting</option>{['gym','home','travel'].map(v=><option key={v}>{v}</option>)}</select>
   <label htmlFor="canonical-level">Reviewed training level</label><select id="canonical-level" value={level} onChange={e=>setLevel(e.target.value)}><option value="">Choose level</option>{['beginner','intermediate','advanced'].map(v=><option key={v}>{v}</option>)}</select>
   <label htmlFor="canonical-budget">Time budget (minutes)</label><input id="canonical-budget" type="number" min="1" value={budget} onChange={e=>setBudget(e.target.value)}/>
   <label htmlFor="canonical-goals">Priority goal IDs, in order (comma separated)</label><input id="canonical-goals" value={goals} onChange={e=>setGoals(e.target.value)}/>
   <label htmlFor="canonical-note">Planning note or travel reason (optional)</label><textarea id="canonical-note" maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/><p>This note records context only; it cannot supply clearance, approved doses or extra catch-up sessions.</p>
   {selection.map((item,index)=>{
    const exercise=document.catalogue.find(row=>row.id===item.exerciseId && row.revision===item.exerciseRevision)
    const doses=(document.doses || []).filter(row=>exercise?.doseRefs?.includes(row.id))
    return <fieldset key={item.occurrenceId}><legend>Occurrence {index+1}</legend>
     <label htmlFor={`canonical-role-${index}`}>Role {index+1}</label><select id={`canonical-role-${index}`} value={item.role} onChange={e=>edit(index,{role:e.target.value})}><option value="">Choose role</option>{roles.map(role=><option key={role}>{role}</option>)}</select>
     <label htmlFor={`canonical-exercise-${index}`}>Exercise revision {index+1}</label><select id={`canonical-exercise-${index}`} value={exercise?`${exercise.id}@${exercise.revision}`:''} onChange={e=>{const row=document.catalogue.find(row=>`${row.id}@${row.revision}`===e.target.value);edit(index,{exerciseId:row?.id,exerciseRevision:row?.revision,doseId:'',doseRevision:null})}}><option value="">Choose variant</option>{document.catalogue.map(row=><option key={`${row.id}@${row.revision}`} value={`${row.id}@${row.revision}`}>{row.name || row.id} · revision {row.revision}</option>)}</select>
     <label htmlFor={`canonical-dose-${index}`}>Dose revision {index+1}</label><select id={`canonical-dose-${index}`} value={item.doseId?`${item.doseId}@${item.doseRevision}`:''} onChange={e=>{const row=doses.find(row=>`${row.id}@${row.revision}`===e.target.value);edit(index,{doseId:row?.id,doseRevision:row?.revision})}}><option value="">Choose reviewed dose</option>{doses.map(row=><option key={`${row.id}@${row.revision}`} value={`${row.id}@${row.revision}`}>{row.id} · revision {row.revision}</option>)}</select>
     <button className="btn ghost" onClick={()=>setSelection(rows=>rows.filter((_,i)=>i!==index))}>Remove occurrence {index+1}</button>
    </fieldset>
   })}
   <button className="btn ghost" disabled={!document} onClick={()=>setSelection(rows=>[...rows,{occurrenceId:crypto.randomUUID(),role:'',exerciseId:'',doseId:''}])}>Add canonical occurrence</button>
  </fieldset>
  <p>With no occurrences selected, this saves session inputs for source-checked pool generation. Empty inputs cannot be approved as a workout.</p>
  <button className="btn" disabled={status==='saving' || (!pending && !release)} onClick={save}>{pending?'Retry original canonical draft':'Save canonical draft or session inputs'}</button>
  <p role="status">Canonical draft: {status}. Saving never assigns.</p>{error && <p role="alert">{error}</p>}
 </details>
}

export default function PoolingApprovalReview({clientId,context,drafts,workspace,online,onRefresh}){
 const [checked,setChecked]=useState([]),[status,setStatus]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(null)
 const [contextReference,setContextReference]=useState('')
 const decisions=workspace.decisions || [],assignments=workspace.assignments || []
 async function run(action){setBusy(true);setError('');try{await action();setChecked([]);onRefresh()}catch(failure){setError(failure.message)}finally{setBusy(false)}}
 async function approve(rows){
  let operation=pending
  if(!operation){
   const recovered=(await readPendingOperations(clientId)).filter(row=>['approve','batch'].includes(row.kind))
   if(recovered.length){operation=recovered[0];setPending(operation);setStatus('An earlier approval needs reconciliation. Retry it before making another assignment.');return}
   const batch=rows.length>1,request={clientId,generation:context.generation,operationKey:crypto.randomUUID(),...(batch?{selection:rows.map(row=>({draftId:row.id,decisionId:decisions.find(v=>v.draftId===row.id).id}))}:{draftId:rows[0].id,decisionId:decisions.find(v=>v.draftId===rows[0].id).id})}
   operation={kind:batch?'batch':'approve',request};setPending(operation)
  }
  try{const receipt=await (operation.kind==='batch'?approveBatch:approveDraft)(operation.request);setPending(null);setStatus(`Assignment confirmed: ${receipt.batchId?`batch ${receipt.batchId}`:receipt.assignmentId}.`)}
  catch(failure){if(failure.code!=='outcome_unknown' && failure.code!=='unavailable' && failure.code!=='failed_save')setPending(null);throw failure}
 }
 const ready=row=>{
  const decision=decisions.find(v=>v.draftId===row.id)
  return online && context?.held===false && decision?.generation===context.generation && decision.manifestState==='published' && Date.parse(decision.validUntil)>Date.now() && decision.result.completeness==='ready_for_coach_review' && decision.result.sessionState==='eligible_for_coach_review' && !drafts.some(child=>child.parent_id===row.id) && !assignments.some(a=>a.draftId===row.id)
 }
 return <section className="card" aria-labelledby="pool-exact-title"><h2 id="pool-exact-title">Exact-revision review and assignment</h2>
  <CanonicalEditor clientId={clientId} context={context} manifests={workspace.manifests || []} onSaved={onRefresh}/>
  <p>Only the owning coach can assign a currently valid decision. Selecting several reviewed revisions uses one transaction: all succeed, or none do.</p>
  {context?.held && <><label htmlFor="context-review-reference">Current coach review reference</label><input id="context-review-reference" value={contextReference} onChange={e=>setContextReference(e.target.value)}/><p>Context review requires recorded scope/consent and complete current observations. Unresolved concerns or restrictions remain held. A successful review creates a new unassigned revision, not an assignment.</p></>}
  {drafts.map(row=>{
   const key=row.id || row.operationKey,decision=decisions.find(v=>v.draftId===row.id),parent=drafts.find(p=>p.id===row.parent_id),diff=selectionDiff(parent?.proposal.selection,row.proposal.selection)
   return <details key={key}><summary>{row.proposal.date} · draft {row.id || 'local'} · revision {row.revision}{assignments.some(a=>a.draftId===row.id)?' · assigned':''}</summary>
    <p>{row.proposal.session?.timeZone || 'Timezone not yet confirmed'} · {row.proposal.session?.request?.budgetSeconds ?? 'Unknown'} seconds budget · goals: {row.proposal.session?.request?.goalPriority?.join(', ') || 'not specified'}</p>
    {row.proposal.session?.sessionAt && <p>Session instant: <time dateTime={row.proposal.session.sessionAt}>{row.proposal.session.sessionAt}</time></p>}
    <p>Planning note: {row.proposal.notes || 'None recorded'}</p>
    <p>{diff.length} canonical occurrence changes relative to the previous revision.</p>
    <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(diff,null,2)}</pre>
    {!row.proposal.selection?.length && <p>Use source-checked generation or map canonical variants and doses before requesting an assignment decision.</p>}
    {context?.held && <button className="btn ghost" disabled={!online || !row.id || !row.proposal.session || !row.proposal.manifestId || !contextReference.trim() || busy || !!pending} onClick={()=>run(async()=>{if((await readPendingOperations(clientId)).some(op=>op.kind==='context_review'))throw Error('Reconcile the saved context review in operation recovery before requesting another.');const receipt=await reviewContext({clientId,draftId:row.id,generation:context.generation,reference:contextReference,operationKey:crypto.randomUUID()});setStatus(`Context review recorded; inspect new unassigned draft ${receipt.draftId}.`)})}>Request source-bound context review</button>}
    <button className="btn ghost" disabled={!online || !row.id || !row.proposal.selection?.length || busy || !!pending} onClick={()=>run(async()=>{const result=await decideDraft({clientId,draftId:row.id,generation:context?.generation});setStatus(`Decision ${result.receipt.decisionId}: ${result.result.completeness}.`)})}>Validate exact draft {row.id || 'local'}</button>
    {decision && <><p>Decision {decision.id} · {decision.result.completeness} · expires {decision.validUntil}</p><PoolingBudgetNotice result={decision.result}/><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify({blocks:decision.result.blocks,gaps:decision.result.gaps,durationSeconds:decision.result.durationSeconds},null,2)}</pre></>}
    <label><input type="checkbox" disabled={!ready(row) || busy || !!pending} checked={checked.includes(key)} onChange={e=>setChecked(ids=>e.target.checked?[...ids,key]:ids.filter(id=>id!==key))}/>I reviewed this exact client/date, full dose, source gaps and revision changes.</label>
    <button className="btn" disabled={!ready(row) || !checked.includes(key) || busy || !!pending} onClick={()=>run(()=>approve([row]))}>Approve &amp; assign draft {row.id || 'local'}</button>
   </details>
  })}
  <button className="btn" disabled={busy || !!pending || checked.length<2 || !checked.every(id=>drafts.some(row=>row.id===id && ready(row)))} onClick={()=>run(()=>approve(drafts.filter(row=>checked.includes(row.id))))}>Approve selected revisions atomically ({checked.length})</button>
  {pending && <button className="btn" disabled={busy} onClick={()=>run(()=>approve([]))}>Reconcile original approval</button>}
  {status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
 </section>
}
