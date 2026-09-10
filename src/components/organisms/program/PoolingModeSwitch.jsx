import {useState} from 'react'
import {setDevelopment,readPendingOperations} from '../../../api/pooling'
import {confirmDialog} from '../../../lib/toast'
import PoolingAction from '../../molecules/PoolingAction'
export default function PoolingModeSwitch({clientId,runtime}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 if(!runtime.development)return null
 async function change() {
  if(busy)return
  setBusy(true);setError('')
  const toClassic=runtime.developmentEnabled
  const confirmed=await confirmDialog({
   title:toClassic?'Switch to Fitness Scribber Classic?':'Turn on the coach-first workout workflow?',
   message:toClassic
    ?'This changes workout preparation for every development client in your coach account. Existing clients, assessments, drafts, assigned workouts and results stay saved. You can turn the coach-first workflow back on here later.'
    :'This turns the guided pooling workflow back on for every development client in your coach account. Existing Classic plans and all saved records stay available. Workouts will still require your review and explicit approval.',
   confirmLabel:toClassic?'Switch to Classic':'Turn on coach-first workflow',
  })
  if(!confirmed){setBusy(false);return}
  try {
   const saved=(await readPendingOperations(clientId)).find(r=>r.kind==='development_mode')
   await setDevelopment(saved?.request||{clientId,enabled:!runtime.developmentEnabled,operationKey:crypto.randomUUID()})
   window.location.reload()
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <section className="card settings-workflow-card" aria-labelledby="workout-workflow-title"><div className="flex between" style={{alignItems:'flex-start',gap:12}}><div><div className="section-title" id="workout-workflow-title" style={{margin:'0 0 5px'}}>Workout workflow</div><p className="muted" style={{fontSize:12}}>Current: <strong>{runtime.developmentEnabled?'Coach-first guided workflow':'Fitness Scribber Classic'}</strong></p></div><span className={`coach-status ${runtime.developmentEnabled?'success':'neutral'}`}>{runtime.developmentEnabled?'On':'Classic'}</span></div>
  <p className="muted" style={{fontSize:13,margin:'10px 0 6px'}}>{runtime.developmentEnabled?'Uses client information to prepare a guided workout draft. You review and approve every assignment.':'Uses the earlier workout-planning workflow. Pooling drafts, assigned workouts and results remain saved.'}</p>
  <p className="muted" style={{fontSize:12,marginBottom:12}}>This changes workout preparation for your development clients. It does not delete data or change the rest of the app design.</p>
  <PoolingAction className="btn ghost" reason={busy?'Confirm the open choice or wait for the workflow setting to save.':''} onClick={change}>{busy?'Updating workflow…':runtime.developmentEnabled?'Switch to Fitness Scribber Classic':'Turn on coach-first workout workflow'}</PoolingAction>{error&&<p role="alert" className="coach-inline-warning">{error}</p>}
 </section>
}
