import {useEffect,useState} from 'react'
import {readGovernance,recordConsent} from '../../../api/pooling'
export default function PoolingGovernance({clientId,clientView=false,onChanged}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[ack,setAck]=useState({}),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[pending,setPending]=useState(null)
 useEffect(()=>{let active=true;readGovernance(clientId).then(value=>{if(active)setData(value)}).catch(failure=>{if(active)setError(failure.message)});return()=>{active=false}},[clientId,revision])
 async function record(documentId,decision){
  setBusy(true);setError('');const request=pending || {clientId,documentId,decision,operationKey:crypto.randomUUID()};setPending(request)
  try{await recordConsent(request);setPending(null);setAck({});setRevision(v=>v+1);onChanged?.()}catch(failure){setError(failure.message);if(!['outcome_unknown','unavailable','failed_save'].includes(failure.code))setPending(null)}finally{setBusy(false)}
 }
 const current=new Map();for(const row of data?.recordedConsents || [])if(!current.has(row.documentId))current.set(row.documentId,row)
 return <section className="card pooling-workspace"><h2>Purpose permissions and review records</h2><p>Recorded agreement is separate from health clearance. Only published documents for a reviewed service scope are offered; missing business/privacy review is not assumed complete.</p>
  {error && <p role="alert">{error}</p>}{!data?.documents.length && <p>No reviewed policy document is currently available for this service scope.</p>}
  {data?.documents.map(document=><article key={document.id}><h3>{document.title} · {document.id}</h3><p>{document.scope} · {document.market}</p><div style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{document.body}</div><p>Recorded decision: {document.decision || 'not recorded'}</p>
   {clientView && document.decision!=='accepted' && <><label><input type="checkbox" checked={ack[document.id]===true} disabled={busy || !!pending} onChange={e=>setAck({...ack,[document.id]:e.target.checked})}/>I have read this exact document and choose to record my agreement.</label><button className="btn" disabled={!ack[document.id] || busy || !!pending} onClick={()=>record(document.id,'accepted')}>Record agreement to {document.id}</button></>}
  </article>)}
  {clientView && [...current.values()].filter(row=>row.decision==='accepted').map(row=><button className="btn ghost" key={row.documentId} disabled={busy || !!pending} onClick={()=>record(row.documentId,'withdrawn')}>Withdraw agreement to {row.documentId}</button>)}
  {pending && <button className="btn" disabled={busy} onClick={()=>record(pending.documentId,pending.decision)}>Reconcile original permission record</button>}
  {!clientView && !!data?.restrictions.length && <details><summary>Scoped restriction/reassessment records</summary>{data.restrictions.map(row=><p key={row.id}>{row.field_key} · {row.side} · {row.protocol} · {row.resolution?'scoped resolution recorded — broader context still needs review':'unresolved'} · evidence {row.evidence_reference}</p>)}</details>}
 </section>
}
