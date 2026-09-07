import {useCallback,useEffect,useState} from 'react'
import {readClientHome,submitPoolingReport,stopLegacy} from '../../../api/pooling'
import PoolingOperationRecovery from '../program/PoolingOperationRecovery'
const scales={sleep:'1 terrible · 7 excellent',stress:'1 none · 7 extreme',fatigue:'1 fresh · 7 exhausted',soreness:'1 none · 7 severe'}
export default function PoolingClientReports({clientId,onChanged}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[status,setStatus]=useState('loading'),[field,setField]=useState(''),[value,setValue]=useState(''),[pending,setPending]=useState(null),[revision,setRevision]=useState(0)
 const load=useCallback(async()=>{try{setData(await readClientHome(clientId));setStatus('ready')}catch(failure){setError(failure.message);setStatus('unavailable')}},[clientId])
 useEffect(()=>{load()},[load])
 async function save(){
  setStatus('saving');setError('')
  try{
   let request=pending
   if(!request){
    let reportValue=value
    if(field==='equipment')reportValue=value.trim().toLowerCase()==='none'?[]:value.split(',').map(v=>v.trim()).filter(Boolean)
    else if(field!=='healthChange')reportValue=Number(value)
    request={clientId,generation:data.context?.generation || 1,operationKey:crypto.randomUUID(),field,value:reportValue,effectiveAt:new Date().toISOString()}
   }
   setPending(request);await submitPoolingReport(request);setPending(null);setValue('');await load();setStatus('saved');setRevision(v=>v+1);onChanged?.()
  }catch(failure){setError(failure.message);setStatus('failed');if(!['outcome_unknown','unavailable','failed_save'].includes(failure.code))setPending(null)}
 }
 async function stop(workoutId){try{await stopLegacy({clientId,workoutId,operationKey:crypto.randomUUID()});await load();setRevision(v=>v+1)}catch(failure){setError(failure.message)}}
 return <section className="card pooling-workspace"><h2>Your reports and previous sessions</h2><p>Optional wellness is separate from the health-change check. Blank answers are not saved or assumed normal. A report never clears a restriction or changes your approved targets.</p>
  <PoolingOperationRecovery clientId={clientId} refreshKey={revision} onReconciled={()=>{setRevision(v=>v+1);load();onChanged?.()}}/>
  <fieldset disabled={!!pending || status==='saving'} onChange={()=>setStatus('unsaved')}><legend>Report one explicit item</legend>
   <label htmlFor="client-report-field">Item to report</label><select id="client-report-field" value={field} onChange={e=>{setField(e.target.value);setValue('')}}><option value="">Choose an item</option><option value="healthChange">Health change</option>{Object.keys(scales).map(key=><option key={key}>{key}</option>)}<option value="equipment">Available equipment IDs</option><option value="budgetSeconds">Available time in seconds</option></select>
   {field==='healthChange'?<><label htmlFor="client-report-value">Explicit response</label><select id="client-report-value" value={value} onChange={e=>setValue(e.target.value)}><option value="">Choose a response</option><option value="no_change">No change reported</option><option value="changed">A change or concern</option><option value="declined">Prefer not to answer</option></select></>:field && <><label htmlFor="client-report-value">{scales[field] || (field==='equipment'?'Comma-separated reviewed equipment IDs; type none for no equipment':'Available seconds')}</label><input id="client-report-value" type={field==='equipment'?'text':'number'} min={scales[field]?1:0} max={scales[field]?7:undefined} value={value} onChange={e=>setValue(e.target.value)}/></>}
  </fieldset>
  <button className="btn" disabled={status==='saving' || (!pending && (!data || !field || value===''))} onClick={save}>{pending?'Reconcile original report':'Save attributed report'}</button>
  <p role="status">Report status: {status}</p>{error && <p role="alert">{error}</p>}
  <details><summary>Your saved reports ({data?.reports.length || 0})</summary>{data?.reports.map(row=><p key={row.id}>{row.field}: {JSON.stringify(row.value)} · {row.effectiveAt} · {row.reporterKind}</p>)}</details>
  <details><summary>Classic session history ({data?.classicHistory.length || 0})</summary><p>These records remain separate from pooling assignments. Stopping preserves existing targets and actuals.</p>{data?.classicHistory.map(row=><p key={row.id}>{row.date} · {row.status} · {row.durationSeconds ?? 'unrecorded'} seconds {row.status==='in_progress' && <button className="btn" onClick={()=>stop(row.id)}>Stop Classic session</button>}</p>)}</details>
 </section>
}
