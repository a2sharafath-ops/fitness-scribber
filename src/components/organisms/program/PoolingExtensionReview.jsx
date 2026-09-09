import { useState } from 'react'
import {generateExtension} from '../../../api/pooling'
import PoolingPrescriptionDiff from '../../molecules/PoolingPrescriptionDiff'
import PoolingBudgetNotice from '../../molecules/PoolingBudgetNotice'
import PoolingAction from '../../molecules/PoolingAction'
import {currentUnassignedDrafts} from '../../../lib/pooling/review'

export default function PoolingExtensionReview({kind,policy,requests,onRequest,onReview,online,context,clientId,workspace,drafts,onRefresh}) {
  const [date,setDate]=useState('')
  const [change,setChange]=useState('')
  const [status,setStatus]=useState('unsaved')
  const [error,setError]=useState('')
  const [pending,setPending]=useState(null)
  const title=kind==='daily'?'Daily adjustment review':'Progression review'
  const missing=(policy?.parameters || []).filter(parameter=>parameter.value===null)
  const admitted=(workspace?.manifests || []).flatMap(release=>(release.document.extensionPolicies || []).filter(item=>item.kind===kind).map(item=>`${item.id} · revision ${item.revision}`))
  async function save() {
    const operation=pending || {operationKey:crypto.randomUUID(),proposal:{kind,date,requestedChange:change,blocks:[],authority:'none',state:'review_requested'}}
    setPending(operation);setStatus('saving');setError('')
    try { await onRequest(operation);setPending(null);setStatus('saved') }
    catch(failure){setStatus('failed');setError(failure.message)}
  }
  return <section className="card" aria-labelledby={`${kind}-review-title`}>
    <h2 id={`${kind}-review-title`} tabIndex={-1}>{title}</h2>
    <p>{admitted.length?`Policies available in this workspace’s admitted releases: ${[...new Set(admitted)].join(', ')}. Choose the matching policy inside a saved request below.`:'No numerical policy is currently available in this workspace. You can save a review question once connected, but cannot generate a numerical change without an admitted policy.'} Assignment always requires separate coach approval.</p>
    <p>Separate draft catalogue status: {policy?.reviewStatus || 'not loaded'}; {missing.length} unresolved draft parameters. Draft catalogue entries do not override the admitted release above.</p>
    <details><summary>Unresolved policy parameters</summary><ul>{missing.map(parameter=><li key={parameter.name}>{parameter.name}: review required</li>)}</ul></details>
    <p>This saves a planning request, not a change to the original target, completed actuals or weekly schedule.</p>
    <p className="pooling-next-step">{kind==='daily'?'Use an approved but unstarted baseline. Save a review question first; its expanded review card then offers target draft, baseline, policy and Generate bounded review proposal.':'Complete and save the baseline’s required performed-set and effort evidence first. Prepare a later target session, then save a review question for that target date.'} Accepting a proposal creates an unassigned draft, which still needs Validate &amp; approve.</p>
    {!!drafts?.length&&<p>Saved draft dates: {[...new Set(drafts.map(item=>item.proposal.date))].join(', ')}. Use the date of the exact target draft.</p>}
    <label htmlFor={`${kind}-date`}>Session or week-start date</label><input id={`${kind}-date`} type="date" value={date} disabled={!!pending} onChange={event=>{setDate(event.target.value);setStatus('unsaved')}} />
    <label htmlFor={`${kind}-request`}>Requested change or review question</label><textarea id={`${kind}-request`} value={change} disabled={!!pending} onChange={event=>{setChange(event.target.value);setStatus('unsaved')}} />
    <PoolingAction reason={status==='saving'?'The review request is saving.':!online?'Wait for connected workspace data, or retry loading after the error.':!date?'Choose the exact target session date.':!change.trim()?'Enter the requested change or review question.':''} onClick={save}>{pending?'Retry original review request':`Save ${kind} review request`}</PoolingAction>
    <p role="status">Request status: {status}. {online?'Attributed backend request; no assignment.':'Local only; no server authority.'}</p>
    {error && <p role="alert">{error}</p>}
    {!requests.length&&<p>No review request has been saved yet. Save the question above to reveal the proposal and review controls.</p>}
    {requests.map(row=><ExtensionDisposition key={row.operationKey} row={row} onReview={onReview} online={online} context={context} clientId={clientId} workspace={workspace} drafts={drafts} onRefresh={onRefresh}/>)}
  </section>
}

function ExtensionDisposition({row,onReview,online,context,clientId,workspace,drafts,onRefresh}){
 const [reason,setReason]=useState(''),[amended,setAmended]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(null)
 const proposal=row.numericalProposals?.[0]
 const [target,setTarget]=useState(''),[baseline,setBaseline]=useState(''),[policyId,setPolicyId]=useState('')
 const targets=currentUnassignedDrafts(drafts,workspace?.assignments).filter(item=>item.id && item.proposal.selection?.length && item.proposal.date===row.proposal.date)
 const targetDraft=targets.find(item=>item.id===Number(target)),release=workspace?.manifests?.find(item=>item.id===targetDraft?.proposal.manifestId)
 const policies=(release?.document.extensionPolicies || []).filter(item=>item.kind===row.proposal.kind)
 async function generate(){setBusy(true);setError('');try{await generateExtension({clientId,draftId:Number(target),expectedGeneration:context?.generation,requestId:row.id,baselineAssignmentId:Number(baseline),policyId});onRefresh()}catch(failure){setError(failure.message)}finally{setBusy(false)}}
 async function review(action){
  setBusy(true);setError('')
  try{const operation=pending || {operationKey:crypto.randomUUID(),requestId:row.id,action,reason,proposalId:proposal?.id || null,amendedDraft:action==='amend'?JSON.parse(amended):null};setPending(operation);await onReview(operation);setPending(null)}catch(failure){setError(failure.message);if(!['outcome_unknown','unavailable','failed_save'].includes(failure.code))setPending(null)}finally{setBusy(false)}
 }
 return <details open={!row.review}><summary>{row.proposal.date} · {row.review?.action || 'review requested'} · no automatic assignment</summary><p>{row.proposal.requestedChange}</p>
  {proposal && <><PoolingPrescriptionDiff changes={proposal.result?.prescriptionChanges}/><PoolingBudgetNotice result={proposal.result}/><details><summary>Full proposal and evidence</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(proposal.result,null,2)}</pre></details></>}
  {!row.review && <><label>Review reason<textarea value={reason} disabled={!!pending} onChange={e=>setReason(e.target.value)}/></label>
   {!online&&<p>Review controls are locked until current connected workspace data is available.</p>}
   <fieldset disabled={!online || busy || !!pending}><legend>Numerical proposal inputs</legend>
    <p>Use a separate current unassigned target. In Validate &amp; approve, open the baseline’s dated row and choose Copy draft for separate review. Return here and select the new ID. An assigned baseline is never revalidated as the target.</p>
    <label htmlFor={`extension-target-${row.id}`}>Current canonical draft</label><select id={`extension-target-${row.id}`} value={targetDraft?target:''} onChange={e=>{setTarget(e.target.value);setPolicyId('')}}><option value="">Select exact target revision</option>{targets.map(item=><option key={item.id} value={item.id}>{item.proposal.date} · draft {item.id}, revision {item.revision}</option>)}</select>
    <label htmlFor={`extension-baseline-${row.id}`}>Original approved baseline</label><select id={`extension-baseline-${row.id}`} value={baseline} onChange={e=>setBaseline(e.target.value)}><option value="">Select original assignment</option>{(workspace?.assignments || []).map(item=><option key={item.id} value={item.id}>Assignment {item.id} · draft {item.draftId}</option>)}</select>
    <label htmlFor={`extension-policy-${row.id}`}>Admitted numerical policy</label><select id={`extension-policy-${row.id}`} value={policyId} onChange={e=>setPolicyId(e.target.value)}><option value="">Select policy</option>{policies.map(item=><option key={item.id} value={item.id}>{item.id} · revision {item.revision}</option>)}</select>
    {!policies.length && <p>{!targetDraft?'Choose the exact target draft to load its admitted numerical policies.':'No numerical policy is published for this release. A text review request remains valid.'}</p>}
    <PoolingAction className="btn ghost" reason={!online?'Retry loading current workspace data before generating a proposal.':busy?'A review operation is saving.':pending?'Reconcile the original review before generating another.':!targetDraft?'Choose a current unassigned target draft for this request’s date; assigned and superseded drafts cannot be revalidated.':!baseline?'Choose the original approved baseline.':!policyId?'Choose an admitted numerical policy for the target release.':''} onClick={generate}>Generate bounded review proposal</PoolingAction>
   </fieldset>
   <label>Amended canonical draft (JSON, for advanced review)<textarea value={amended} disabled={!!pending} onChange={e=>setAmended(e.target.value)}/></label>
   <p>Accept or amend saves an unassigned draft. The exact revision still needs source validation and separate coach approval.</p>
   {pending?<PoolingAction reason={busy?'The original review is being reconciled.':''} onClick={()=>review(pending.action)}>Reconcile original review</PoolingAction>:<><PoolingAction reason={!online?'Load current connected workspace data first.':busy?'A review operation is saving.':!proposal?.result?.suggestedDraft?'Generate a bounded proposal with a suggested draft first; unresolved gaps cannot be accepted as a change.':!reason.trim()?'Enter the coach’s review reason.':''} onClick={()=>review('accept')}>Accept as draft</PoolingAction><PoolingAction className="btn ghost" reason={!online?'Load current connected workspace data first.':busy?'A review operation is saving.':!reason.trim()?'Enter the coach’s review reason.':!amended.trim()?'Advanced option: provide an amended canonical draft. For an unchanged generated proposal, use Accept as draft.':''} onClick={()=>review('amend')}>Save amended draft</PoolingAction><PoolingAction className="btn ghost" reason={!online?'Load current connected workspace data first.':busy?'A review operation is saving.':!reason.trim()?'Enter a reason for rejecting this review request.':''} onClick={()=>review('reject')}>Reject with reason</PoolingAction></>}
  </>}{error && <p role="alert">{error}</p>}
 </details>
}
