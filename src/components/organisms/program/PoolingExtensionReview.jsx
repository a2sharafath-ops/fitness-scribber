import { useState } from 'react'
import {generateExtension} from '../../../api/pooling'

export default function PoolingExtensionReview({kind,policy,requests,onRequest,onReview,online,context,clientId,workspace,drafts,onRefresh}) {
  const [date,setDate]=useState('')
  const [change,setChange]=useState('')
  const [status,setStatus]=useState('unsaved')
  const [error,setError]=useState('')
  const [pending,setPending]=useState(null)
  const title=kind==='daily'?'Daily adjustment review':'Progression and weekly review'
  const missing=policy.parameters.filter(parameter=>parameter.value===null)
  async function save() {
    const operation=pending || {operationKey:crypto.randomUUID(),proposal:{kind,date,requestedChange:change,blocks:[],authority:'none',state:'review_requested'}}
    setPending(operation);setStatus('saving');setError('')
    try { await onRequest(operation);setPending(null);setStatus('saved') }
    catch(failure){setStatus('failed');setError(failure.message)}
  }
  return <section className="card" aria-labelledby={`${kind}-review-title`}>
    <h2 id={`${kind}-review-title`}>{title}</h2>
    <p>Policy status: {policy.reviewStatus}. {missing.length} parameters have no approved value. Numerical suggestions and assignment remain disabled.</p>
    <details><summary>Unresolved policy parameters</summary><ul>{missing.map(parameter=><li key={parameter.name}>{parameter.name}: review required</li>)}</ul></details>
    <p>This saves a planning request, not a change to the original target, completed actuals or weekly schedule.</p>
    <label htmlFor={`${kind}-date`}>Session or week-start date</label><input id={`${kind}-date`} type="date" value={date} disabled={!!pending} onChange={event=>{setDate(event.target.value);setStatus('unsaved')}} />
    <label htmlFor={`${kind}-request`}>Requested change or review question</label><textarea id={`${kind}-request`} value={change} disabled={!!pending} onChange={event=>{setChange(event.target.value);setStatus('unsaved')}} />
    <button className="btn" disabled={!date || !change.trim() || status==='saving'} onClick={save}>{pending?'Retry original review request':`Save ${kind} review request`}</button>
    <p role="status">Request status: {status}. {online?'Attributed backend request; no assignment.':'Local only; no server authority.'}</p>
    {error && <p role="alert">{error}</p>}
    {requests.map(row=><ExtensionDisposition key={row.operationKey} row={row} onReview={onReview} online={online} context={context} clientId={clientId} workspace={workspace} drafts={drafts} onRefresh={onRefresh}/>)}
  </section>
}

function ExtensionDisposition({row,onReview,online,context,clientId,workspace,drafts,onRefresh}){
 const [reason,setReason]=useState(''),[amended,setAmended]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(null)
 const proposal=row.numericalProposals?.[0]
 const [target,setTarget]=useState(''),[baseline,setBaseline]=useState(''),[policyId,setPolicyId]=useState('')
 const targetDraft=(drafts || []).find(item=>item.id===Number(target)),release=workspace?.manifests?.find(item=>item.id===targetDraft?.proposal.manifestId)
 const policies=(release?.document.extensionPolicies || []).filter(item=>item.kind===row.proposal.kind)
 async function generate(){setBusy(true);setError('');try{await generateExtension({clientId,draftId:Number(target),expectedGeneration:context?.generation,requestId:row.id,baselineAssignmentId:Number(baseline),policyId});onRefresh()}catch(failure){setError(failure.message)}finally{setBusy(false)}}
 async function review(action){
  setBusy(true);setError('')
  try{const operation=pending || {operationKey:crypto.randomUUID(),requestId:row.id,action,reason,proposalId:proposal?.id || null,amendedDraft:action==='amend'?JSON.parse(amended):null};setPending(operation);await onReview(operation);setPending(null)}catch(failure){setError(failure.message);if(!['outcome_unknown','unavailable','failed_save'].includes(failure.code))setPending(null)}finally{setBusy(false)}
 }
 return <details><summary>{row.proposal.date} · {row.review?.action || 'review requested'} · no automatic assignment</summary><p>{row.proposal.requestedChange}</p>
  {proposal && <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(proposal.result,null,2)}</pre>}
  {!row.review && online && <><label>Review reason<textarea value={reason} disabled={!!pending} onChange={e=>setReason(e.target.value)}/></label>
   <fieldset disabled={busy || !!pending}><legend>Numerical proposal inputs</legend>
    <label htmlFor={`extension-target-${row.id}`}>Current canonical draft</label><select id={`extension-target-${row.id}`} value={target} onChange={e=>{setTarget(e.target.value);setPolicyId('')}}><option value="">Select exact target revision</option>{(drafts || []).filter(item=>item.id && item.proposal.selection?.length && item.proposal.date===row.proposal.date).map(item=><option key={item.id} value={item.id}>{item.proposal.date} · draft {item.id}, revision {item.revision}</option>)}</select>
    <label htmlFor={`extension-baseline-${row.id}`}>Original approved baseline</label><select id={`extension-baseline-${row.id}`} value={baseline} onChange={e=>setBaseline(e.target.value)}><option value="">Select original assignment</option>{(workspace?.assignments || []).map(item=><option key={item.id} value={item.id}>Assignment {item.id} · draft {item.draftId}</option>)}</select>
    <label htmlFor={`extension-policy-${row.id}`}>Admitted numerical policy</label><select id={`extension-policy-${row.id}`} value={policyId} onChange={e=>setPolicyId(e.target.value)}><option value="">Select policy</option>{policies.map(item=><option key={item.id} value={item.id}>{item.id} · revision {item.revision}</option>)}</select>
    {!policies.length && <p>No numerical policy is published for this release. A text review request remains valid.</p>}
    <button className="btn ghost" disabled={!target || !baseline || !policyId} onClick={generate}>Generate bounded review proposal</button>
   </fieldset>
   <label>Amended canonical draft (JSON, for advanced review)<textarea value={amended} disabled={!!pending} onChange={e=>setAmended(e.target.value)}/></label>
   <p>Accept or amend saves an unassigned draft. The exact revision still needs source validation and separate coach approval.</p>
   {pending?<button className="btn" disabled={busy} onClick={()=>review(pending.action)}>Reconcile original review</button>:<><button className="btn" disabled={busy || !reason.trim() || !proposal?.result?.suggestedDraft} onClick={()=>review('accept')}>Accept as draft</button><button className="btn ghost" disabled={busy || !reason.trim() || !amended.trim()} onClick={()=>review('amend')}>Save amended draft</button><button className="btn ghost" disabled={busy || !reason.trim()} onClick={()=>review('reject')}>Reject with reason</button></>}
  </>}{error && <p role="alert">{error}</p>}
 </details>
}
