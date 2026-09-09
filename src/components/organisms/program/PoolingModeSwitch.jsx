import {useState} from 'react'
import {setDevelopment,readPendingOperations} from '../../../api/pooling'
import PoolingAction from '../../molecules/PoolingAction'
export default function PoolingModeSwitch({clientId,runtime}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 if(!runtime.development)return null
 async function change() {
  setBusy(true);setError('')
  try {
   const saved=(await readPendingOperations(clientId)).find(r=>r.kind==='development_mode')
   await setDevelopment(saved?.request||{clientId,enabled:!runtime.developmentEnabled,operationKey:crypto.randomUUID()})
   window.location.reload()
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <section className="card"><h2>{runtime.developmentEnabled?'Integrated pooling':'Fitness Scribber Classic workflow'}</h2><p>This switch applies to your account's development clients only. It keeps every workout, result and source record. Existing active pooling sessions can still be stopped after switching back.</p>
  <PoolingAction className="btn ghost" reason={busy?'Saving the workflow setting…':''} onClick={change}>{runtime.developmentEnabled?'Switch my account to Classic workflow':'Enable integrated pooling for my account'}</PoolingAction>{error&&<p role="alert">{error}</p>}
 </section>
}
