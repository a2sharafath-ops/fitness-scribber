import { useState } from 'react'

export default function PoolingExtensionReview({kind,policy,requests,onRequest,online}) {
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
    <button className="btn" disabled={online || !date || !change.trim() || status==='saving'} onClick={save}>{pending?'Retry original review request':`Save ${kind} review request`}</button>
    <p role="status">Request status: {status}. {online?'Backend extension verification is pending.':'Local only; no server authority.'}</p>
    {error && <p role="alert">{error}</p>}
    {requests.map(row=><p key={row.operationKey}>{row.proposal.date} · review requested · no assignment</p>)}
  </section>
}
