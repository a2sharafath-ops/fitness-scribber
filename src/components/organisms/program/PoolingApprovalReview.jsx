import {useState} from 'react'
import {approveDraft,approveBatch,decideDraft,readPendingOperations,readBuilderDraftState,saveRecoverableBuilderDraft,reviewContext} from '../../../api/pooling'
import {canonicalProposal,selectionDiff,independentReviewProposal,draftReviewDecision} from '../../../lib/pooling/review'
import PoolingBudgetNotice from '../../molecules/PoolingBudgetNotice'
import PoolingAction from '../../molecules/PoolingAction'
import {approvalBlock} from '../../../lib/pooling/action-readiness'

function CanonicalEditor({clientId,context,manifests,onSaved,blockedReason}){
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
   <PoolingAction className="btn ghost" reason={!document?'Choose a published release to see its exercises and dose revisions.':''} onClick={()=>setSelection(rows=>[...rows,{occurrenceId:crypto.randomUUID(),role:'',exerciseId:'',doseId:''}])}>Add canonical occurrence</PoolingAction>
  </fieldset>
  <p>With no occurrences selected, this saves session inputs for source-checked pool generation. Empty inputs cannot be approved as a workout.</p>
  <PoolingAction reason={status==='saving'?'The draft is saving. Wait for confirmation.':pending?'':blockedReason||(!release?'Choose a published release before saving.':'')} onClick={save}>{pending?'Retry original canonical draft':'Save canonical draft or session inputs'}</PoolingAction>
  <p role="status">Canonical draft: {status}. Saving never assigns.</p>{error && <p role="alert">{error}</p>}
 </details>
}

export default function PoolingApprovalReview({clientId,context,drafts,workspace,online,onRefresh,blockedReason=''}){
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
 const block=row=>approvalBlock({row,context,decision:decisions.find(v=>v.draftId===row.id),drafts,assignments,online})
 const ready=row=>!block(row)
 return <section className="card" aria-labelledby="pool-exact-title"><h2 id="pool-exact-title" tabIndex={-1}>Exact-revision review and assignment</h2>
  <CanonicalEditor clientId={clientId} context={context} manifests={workspace.manifests || []} onSaved={onRefresh} blockedReason={blockedReason}/>
  {!drafts.length&&<p className="pooling-next-step">{blockedReason||'No saved drafts yet. Prepare a fictional session in Test setup, then generate a pool draft. Its Validate and Approve buttons will appear here.'}</p>}
  {!!drafts.length&&<p className="pooling-next-step">Current unassigned revisions are expanded below. Validate your chosen draft, read its decision and full dose, tick the exact-review acknowledgement, then explicitly approve it. Historical or already-assigned drafts remain available in their dated rows.</p>}
  <p>Only the owning coach can assign a currently valid decision. Selecting several reviewed revisions uses one transaction: all succeed, or none do.</p>
  {context?.held && <><label htmlFor="context-review-reference">Current coach review reference</label><input id="context-review-reference" value={contextReference} onChange={e=>setContextReference(e.target.value)}/><p>Context review requires recorded scope/consent and complete current observations. Unresolved concerns or restrictions remain held. A successful review creates a new unassigned revision, not an assignment.</p></>}
  {drafts.map(row=>{
   const key=row.id || row.operationKey,decision=draftReviewDecision(row.id,decisions,assignments),parent=drafts.find(p=>p.id===row.parent_id),diff=selectionDiff(parent?.proposal.selection,row.proposal.selection)
   const assigned=assignments.some(a=>a.draftId===row.id),superseded=drafts.some(child=>child.parent_id===row.id)
   return <details key={key} open={!assignments.some(a=>a.draftId===row.id)&&!drafts.some(child=>child.parent_id===row.id)}><summary>{row.proposal.date} · draft {row.id || 'local'} · revision {row.revision}{assignments.some(a=>a.draftId===row.id)?' · assigned':''}</summary>
    <p>{row.proposal.session?.timeZone || 'Timezone not yet confirmed'} · {row.proposal.session?.request?.budgetSeconds ?? 'Unknown'} seconds budget · goals: {row.proposal.session?.request?.goalPriority?.join(', ') || 'not specified'}</p>
    {row.proposal.session?.sessionAt && <p>Session instant: <time dateTime={row.proposal.session.sessionAt}>{row.proposal.session.sessionAt}</time></p>}
    <p>Planning note: {row.proposal.notes || 'None recorded'}</p>
    <p>{diff.length} canonical occurrence changes relative to the previous revision.</p>
    <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(diff,null,2)}</pre>
    {!row.proposal.selection?.length && <p>Use source-checked generation or map canonical variants and doses before requesting an assignment decision.</p>}
    {context?.held && <button className="btn ghost" disabled={!online || !row.id || !row.proposal.session || !row.proposal.manifestId || !contextReference.trim() || busy || !!pending} onClick={()=>run(async()=>{if((await readPendingOperations(clientId)).some(op=>op.kind==='context_review'))throw Error('Reconcile the saved context review in operation recovery before requesting another.');const receipt=await reviewContext({clientId,draftId:row.id,generation:context.generation,reference:contextReference,operationKey:crypto.randomUUID()});setStatus(`Context review recorded; inspect new unassigned draft ${receipt.draftId}.`)})}>Request source-bound context review</button>}
    <PoolingAction className="btn ghost" reason={!online?'Wait for connected workspace data, or retry loading after the error.':busy?'An operation is saving. Wait for confirmation.':pending?'Reconcile the original approval before a new validation.':assigned?'This draft is assigned. Copy it for separate review instead of refreshing its approved source snapshot.':superseded?'A newer revision replaces this draft. Validate the current unassigned revision.':!row.id||!row.proposal.selection?.length?'Generate an exercise selection for this saved draft first.':''} onClick={()=>run(async()=>{const result=await decideDraft({clientId,draftId:row.id,generation:context?.generation});setStatus(`Decision ${result.receipt.decisionId}: ${result.result.completeness}.`)})}>Validate exact draft {row.id || 'local'}</PoolingAction>
    {row.id&&row.proposal.selection?.length>0&&<><PoolingAction className="btn ghost" reason={!online?'Load current workspace data before making a separate review copy.':busy?'An operation is saving. Wait for confirmation.':pending?'Reconcile the original pending approval before copying.':''} onClick={()=>run(async()=>{
      if((await readPendingOperations(clientId)).some(operation=>operation.kind==='draft'))throw Error('Reconcile the saved draft operation in Operation recovery before making another copy.')
      const receipt=await saveRecoverableBuilderDraft({clientId,generation:context?.generation,operationKey:crypto.randomUUID(),parentId:null,proposal:independentReviewProposal(row.proposal)})
      setStatus(`Separate unassigned review copy saved: draft ${receipt.id}. Original draft ${row.id}, its assignments and results are unchanged. Use the new ID as a review target; validate and approve separately if assignment is intended.`)
    })}>Copy draft {row.id} for separate review</PoolingAction><p>A separate copy retains the exact date, selection and doses, but no approval or results. It does not supersede this draft.</p></>}
    {decision && <><p>Decision {decision.id} · {decision.result.completeness} · expires {decision.validUntil}</p><PoolingBudgetNotice result={decision.result}/><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify({blocks:decision.result.blocks,gaps:decision.result.gaps,durationSeconds:decision.result.durationSeconds},null,2)}</pre></>}
    {assigned&&!decision&&<p>The decision pinned to this assignment is not loaded. Open Sessions &amp; results to inspect the assignment; a newer validation is not a substitute for its original approval.</p>}
    <label><input type="checkbox" disabled={!ready(row) || busy || !!pending} checked={checked.includes(key)} onChange={e=>setChecked(ids=>e.target.checked?[...ids,key]:ids.filter(id=>id!==key))}/>I reviewed this exact client/date, full dose, source gaps and revision changes.</label>
    <PoolingAction reason={busy?'An operation is saving. Wait for confirmation.':pending?'Reconcile the original pending approval first.':block(row)||(!checked.includes(key)?'Read the exact decision and dose, then tick the review acknowledgement above.':'')} onClick={()=>run(()=>approve([row]))}>Approve &amp; assign draft {row.id || 'local'}</PoolingAction>
   </details>
  })}
  <PoolingAction reason={busy?'An approval is saving.':pending?'Reconcile the original pending approval first.':checked.length<2?'Optional batch action: validate and explicitly review at least two current revisions. For one draft, use its individual Approve button above.':!checked.every(id=>drafts.some(row=>row.id===id&&ready(row)))?'At least one selected revision needs a fresh validation or review.':''} onClick={()=>run(()=>approve(drafts.filter(row=>checked.includes(row.id))))}>Approve selected revisions atomically ({checked.length})</PoolingAction>
  {pending && <button className="btn" disabled={busy} onClick={()=>run(()=>approve([]))}>Reconcile original approval</button>}
  {status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
 </section>
}
