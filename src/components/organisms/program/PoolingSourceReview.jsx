import {useState} from 'react'

export default function PoolingSourceReview({sources,confirmations,onConfirm,online}){
 const [sourceIndex,setSourceIndex]=useState(''),[key,setKey]=useState(''),[state,setState]=useState('unknown'),[value,setValue]=useState('null')
 const [unit,setUnit]=useState(''),[protocol,setProtocol]=useState(''),[side,setSide]=useState('not_applicable'),[effectiveAt,setEffectiveAt]=useState(''),[sessionAt,setSessionAt]=useState(''),[evidence,setEvidence]=useState('')
 const [status,setStatus]=useState('unsaved'),[error,setError]=useState(''),[pending,setPending]=useState(null)
 async function save(){
   try{
     let operation=pending
     if(!operation){
     const source=sources[Number(sourceIndex)]
     if(sourceIndex==='' || !source)throw new Error('Choose a current source record.')
     if(!/(Z|[+-]\d{2}:\d{2})$/.test(effectiveAt) || (sessionAt && !/(Z|[+-]\d{2}:\d{2})$/.test(sessionAt)))throw new Error('Include the UTC offset, such as +05:30 or Z, in each date/time.')
     const observation={key,state,value:['unknown','not_assessed','not_applicable'].includes(state)?null:state==='observed_present'?true:state==='assessed_absent'?false:JSON.parse(value),unit,protocol,side,
       source:source.source,sourceId:source.id,sourceToken:source.token,effectiveAt:new Date(effectiveAt).toISOString(),evidenceReference:evidence,...(sessionAt?{sessionAt:new Date(sessionAt).toISOString()}:{})}
     operation={operationKey:crypto.randomUUID(),observation}
     }
     setPending(operation);setStatus('saving');setError('');await onConfirm(operation);setPending(null);setStatus('saved')
   }catch(failure){setError(failure.message);setStatus(failure.code==='outcome_unknown'?'outcome unknown':'failed');if(['source_changed','stale_context','invalid_confirmation'].includes(failure.code))setPending(null)}
 }
 return <section className="card" aria-labelledby="pool-source-title">
   <h2 id="pool-source-title" tabIndex={-1}>Explicit source review</h2>
   <p>Confirm an observation against its source revision. Untouched form defaults remain unknown. This does not clear restrictions, grant consent or assign a workout.</p>
   <fieldset disabled={!!pending || status==='saving'} onChange={()=>setStatus('unsaved')}>
     <legend>Observation and evidence</legend>
     <label htmlFor="source-record">Source record</label><select id="source-record" value={sourceIndex} onChange={e=>setSourceIndex(e.target.value)}><option value="">Select a source</option>{sources.map((row,index)=><option key={`${row.source}:${row.id}`} value={index}>{row.source} · {row.id}</option>)}</select>
     <label>Canonical field key<input value={key} onChange={e=>setKey(e.target.value)} placeholder="Use the reviewed module field key" /></label>
     <label htmlFor="source-state">Observation state</label><select id="source-state" value={state} onChange={e=>setState(e.target.value)}>{['unknown','not_assessed','not_applicable','observed_present','assessed_absent','measured','reported'].map(item=><option key={item}>{item}</option>)}</select>
     {['measured','reported'].includes(state) && <label>Explicit value (JSON)<input value={value} onChange={e=>setValue(e.target.value)} /></label>}
     <label>Unit<input value={unit} onChange={e=>setUnit(e.target.value)} /></label>
     <label>Protocol and version<input value={protocol} onChange={e=>setProtocol(e.target.value)} /></label>
     <label htmlFor="source-side">Side</label><select id="source-side" value={side} onChange={e=>setSide(e.target.value)}>{['not_applicable','left','right','bilateral','midline'].map(item=><option key={item}>{item}</option>)}</select>
     <label>Effective date and time with UTC offset<input placeholder="2026-09-07T12:00:00+05:30" value={effectiveAt} onChange={e=>setEffectiveAt(e.target.value)} /></label>
     <label>Session date and time with UTC offset, when session-specific<input placeholder="2026-09-07T12:00:00+05:30" value={sessionAt} onChange={e=>setSessionAt(e.target.value)} /></label>
     <label>Actual evidence reference<input value={evidence} onChange={e=>setEvidence(e.target.value)} /></label>
   </fieldset>
   <button className="btn" disabled={status==='saving' || (!pending && (sourceIndex==='' || !key || !unit || !protocol || !effectiveAt || !evidence))} onClick={save}>{pending?'Retry original confirmation':'Save source review'}</button>
   <p role="status">{status} · {online?'Server checks apply.':'Local record only; no approval authority.'}</p>
   {error && <p role="alert">{error}</p>}
   <p>{confirmations.length} saved confirmation records. Changed sources require a new review.</p>
   {!!confirmations.length && <details><summary>Saved observations and provenance</summary>{confirmations.map(row=>{
     const observation=row.observation || row.proposal?.observation
     return <p key={row.id || row.operationKey}>{observation?.key} · {observation?.state} · value: {JSON.stringify(observation?.value ?? null)} {observation?.unit} · {observation?.side} · effective {observation?.effectiveAt} · source {observation?.source}/{observation?.sourceId} · evidence {observation?.evidenceReference}</p>
   })}</details>}
 </section>
}
