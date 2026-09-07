import {useEffect,useState} from 'react'
import {readPendingOperations,retryPendingOperation} from '../../../api/pooling'
export default function PoolingOperationRecovery({clientId,refreshKey,onReconciled}){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{let active=true;readPendingOperations(clientId).then(value=>{if(active)setRows(value)}).catch(failure=>{if(active)setError(failure.message)});return()=>{active=false}},[clientId,refreshKey])
 async function retry(row){setBusy(true);setError('');try{await retryPendingOperation(row);setRows(await readPendingOperations(clientId));onReconciled()}catch(failure){setError(failure.message)}finally{setBusy(false)}}
 if(!rows.length && !error)return null
 return <section className="card"><h2>Pending-operation recovery</h2><p>These exact requests survived reload. Retrying retains the original identity and payload; it never substitutes new approval or source data.</p>{error && <p role="alert">{error}</p>}{rows.map(row=><p key={row.request.operationKey}>{row.kind} · {row.request.operationKey} <button className="btn ghost" disabled={busy} onClick={()=>retry(row)}>Reconcile {row.kind}</button></p>)}</section>
}
