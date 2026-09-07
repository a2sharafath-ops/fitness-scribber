import {useEffect,useState} from 'react'
import {readCatalogueAdmin,submitCatalogue,applyPublication,readPendingOperations} from '../../../api/pooling'
import {validateRelease} from '../../../lib/pooling/catalogue'
export default function PoolingCatalogueAdmin({clientId,online}){
 const [source,setSource]=useState(''),[note,setNote]=useState(''),[validation,setValidation]=useState(null),[data,setData]=useState({submissions:[],events:[],canRelease:false}),[acceptance,setAcceptance]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('')
 useEffect(()=>{let active=true;if(online)readCatalogueAdmin(clientId).then(v=>{if(active)setData(v)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[clientId,online])
 function validate(){try{setValidation(validateRelease(JSON.parse(source)));setError('')}catch{setValidation({valid:false,errors:['Valid JSON is required.']})}}
 async function run(action){setBusy(true);setError('');try{
  if((await readPendingOperations(clientId)).some(r=>['catalogue_submission','publication'].includes(r.kind)))throw Error('Reconcile the pending catalogue operation before another submission or release action.')
  await action();setData(await readCatalogueAdmin(clientId))
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="card"><h2>Catalogue validation and controlled release</h2>
  <p>Draft JSON, review notes and validation do not publish content or supply professional acceptance. Exact acceptance records and release-operator permission are separately provisioned; no real candidate is enabled by this screen alone.</p>
  <label htmlFor="catalogue-json">Versioned release document (JSON)</label><textarea id="catalogue-json" rows="8" value={source} disabled={busy} onChange={e=>{setSource(e.target.value);setValidation(null)}}/>
  <button className="btn ghost" disabled={!source || busy} onClick={validate}>Check release structure and evidence fields</button>
  {validation && <div role="status"><p>{validation.valid?'Structure checks pass. Separate acceptance and release permission are still required.':'Release is not ready.'}</p><ul>{validation.errors.map((v,i)=><li key={i}>{v}</li>)}</ul></div>}
  <label htmlFor="catalogue-note">Review note / remaining changes</label><textarea id="catalogue-note" value={note} disabled={busy} onChange={e=>setNote(e.target.value)}/>
  <button className="btn" disabled={!online || busy || !source || !note.trim()} onClick={()=>run(async()=>{const receipt=await submitCatalogue({clientId,operationKey:crypto.randomUUID(),document:JSON.parse(source),note});setStatus(`Submission ${receipt.id} saved, not published. Digest: ${receipt.digest}`)})}>Save immutable review submission</button>
  {!data.canRelease && <p>Release actions are unavailable: no current release-operator authorization.</p>}
  {data.canRelease && <><label htmlFor="catalogue-acceptance">Registered exact acceptance ID</label><input id="catalogue-acceptance" value={acceptance} disabled={busy} onChange={e=>setAcceptance(e.target.value)}/><label htmlFor="catalogue-release-reason">Release or withdrawal reason</label><textarea id="catalogue-release-reason" value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></>}
  {data.submissions.map(s=><details key={s.id}><summary>Submission {s.id} · {s.document.manifest?.id || 'unmapped draft'}</summary><p>{s.note}</p><p>Exact document digest: {s.digest}</p><button className="btn ghost" disabled={busy} onClick={()=>{setSource(JSON.stringify(s.document,null,2));setNote('');setValidation(null)}}>Use as basis for a new review revision</button>
   {data.canRelease && ['publish','revoke'].map(action=><button className="btn ghost" key={action} disabled={busy || !acceptance || !reason.trim()} onClick={()=>run(async()=>{await applyPublication({clientId,submissionId:s.id,acceptanceId:acceptance,action,reason,operationKey:crypto.randomUUID()});setStatus(`${action} confirmed for ${s.document.manifest?.id}.`)})}>{action==='publish'?'Publish exact accepted submission':'Withdraw from future use'}</button>)}
  </details>)}
  {!!data.events.length && <details><summary>Release audit history</summary>{data.events.map(e=><p key={e.id}>{e.manifest_id} · {e.action} · {e.recorded_at} · {e.reason}</p>)}</details>}
  {status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
 </section>
}
