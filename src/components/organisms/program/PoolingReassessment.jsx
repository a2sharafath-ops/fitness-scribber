import {useEffect,useState} from 'react'
import {readReassessments,requestReassessment,readPendingOperations} from '../../../api/pooling'
import PoolingAction from '../../molecules/PoolingAction'
export default function PoolingReassessment({clientId,online=true}){
 const [rows,setRows]=useState([]),[field,setField]=useState(''),[side,setSide]=useState(''),[protocol,setProtocol]=useState(''),[source,setSource]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('')
 useEffect(()=>{let active=true;if(online)readReassessments(clientId).then(data=>{if(active)setRows(data)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[clientId,online])
 async function save(){setBusy(true);setError('');try{
  if((await readPendingOperations(clientId)).some(r=>r.kind==='reassessment'))throw Error('Reconcile the existing reassessment request in Operation recovery first.')
  await requestReassessment({clientId,operationKey:crypto.randomUUID(),review:{field,side,protocol,sourceReference:source,reason}});setRows(await readReassessments(clientId));setStatus('Scoped request saved. No restriction was resolved and no session assigned.')
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="card" aria-labelledby="pool-reassessment-title"><h2 id="pool-reassessment-title" tabIndex={-1}>Scoped reassessment request</h2><p>Identify the exact field, side, protocol and source needing review. A request, good workout or new no-change answer cannot clear a restriction. Resolution requires separately authorized, matching review evidence.</p>
  <fieldset disabled={!online || busy}><legend>Exact review scope</legend>
   <label htmlFor="reassessment-field">Field or task key</label><input id="reassessment-field" value={field} onChange={e=>setField(e.target.value)}/>
   <label htmlFor="reassessment-side">Side needing review</label><select id="reassessment-side" value={side} onChange={e=>setSide(e.target.value)}><option value="">Choose explicitly</option>{['left','right','bilateral','midline','not_applicable'].map(s=><option key={s}>{s}</option>)}</select>
   <label htmlFor="reassessment-protocol">Protocol and version</label><input id="reassessment-protocol" value={protocol} onChange={e=>setProtocol(e.target.value)}/>
   <label htmlFor="reassessment-source">Source reference</label><input id="reassessment-source" value={source} onChange={e=>setSource(e.target.value)}/>
   <label htmlFor="reassessment-reason">Why review is needed</label><textarea id="reassessment-reason" value={reason} onChange={e=>setReason(e.target.value)}/>
  </fieldset>
  <PoolingAction reason={!online?'Load the current connected workspace before saving a reassessment request.':busy?'The scoped request is saving.':![field,side,protocol,source,reason].every(v=>v.trim())?'Specify the exact field, side, protocol, source reference and review reason.':''} onClick={save}>Save scoped review request</PoolingAction>
  {rows.map(r=><p key={r.id}>Request {r.id} · {r.request.field} · {r.request.side} · {r.request.protocol} · {r.state.replaceAll('_',' ')}</p>)}
  {status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
 </section>
}
