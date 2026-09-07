import {useEffect,useState} from 'react'
import {generateWeek,approveWeek,readWeeks,readPendingOperations} from '../../../api/pooling'

export default function PoolingWeeklyReview({clientId,context,workspace,drafts,online,onRefresh}){
 const [rows,setRows]=useState([]),[start,setStart]=useState(''),[zone,setZone]=useState('UTC'),[release,setRelease]=useState(''),[policyId,setPolicyId]=useState(''),[split,setSplit]=useState(''),[goals,setGoals]=useState(''),[slots,setSlots]=useState([])
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[reviewed,setReviewed]=useState([])
 const manifest=workspace.manifests?.find(m=>m.id===release),policies=(manifest?.document.extensionPolicies || []).filter(p=>p.kind==='weekly'),policy=policies.find(p=>p.id===policyId)
 useEffect(()=>{let active=true;if(online)readWeeks(clientId).then(data=>{if(active)setRows(data)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[clientId,online,context?.generation])
 const candidates=drafts.filter(d=>d.id && d.proposal.selection?.length && d.proposal.manifestId===release && !drafts.some(c=>c.parent_id===d.id))
 async function run(action){setBusy(true);setError('');try{
  if((await readPendingOperations(clientId)).some(r=>['weekly','week_approve'].includes(r.kind)))throw Error('Reconcile the saved weekly operation in Operation recovery before creating another.')
  await action();setRows(await readWeeks(clientId));setReviewed([]);onRefresh()
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="card" aria-labelledby="weekly-review-title"><h2 id="weekly-review-title">Constrained weekly plan</h2>
  <p>Assemble exact session drafts into an explicit seven-day window. No extra training day or catch-up volume is added. Numerical limits and recovery spacing must come from an admitted weekly policy.</p>
  {!online && <p>Local preview: server validation, weekly saving and assignment are unavailable.</p>}
  <fieldset disabled={!online || busy}><legend>Explicit weekly constraints</legend>
   <label htmlFor="week-release">Published weekly release</label><select id="week-release" value={release} onChange={e=>{setRelease(e.target.value);setPolicyId('');setSlots([])}}><option value="">Choose release</option>{workspace.manifests?.map(m=><option key={m.id}>{m.id}</option>)}</select>
   <label htmlFor="week-policy">Reviewed weekly policy</label><select id="week-policy" value={policyId} onChange={e=>{setPolicyId(e.target.value);setSplit('')}}><option value="">Choose policy</option>{policies.map(p=><option key={p.id} value={p.id}>{p.id} · revision {p.revision}</option>)}</select>
   {!policies.length && <p>No weekly policy is published for this release; constraints are not invented.</p>}
   <label htmlFor="week-start">First date of the seven-day window</label><input id="week-start" type="date" value={start} onChange={e=>setStart(e.target.value)}/>
   <label htmlFor="week-zone">Timezone for this week</label><input id="week-zone" value={zone} onChange={e=>setZone(e.target.value)}/>
   <label htmlFor="week-split">Accepted structure</label><select id="week-split" value={split} onChange={e=>setSplit(e.target.value)}><option value="">Choose structure</option>{(policy?.splits || []).map(s=><option key={s}>{s}</option>)}</select>
   <label htmlFor="week-goals">Priority goal IDs, in order (comma separated)</label><input id="week-goals" value={goals} onChange={e=>setGoals(e.target.value)}/>
   <p>Each selected draft fixes its date, time, setting, inventory and dose. To move or edit one, save a new canonical session revision first.</p>
   {candidates.map(d=>{const slot=slots.find(s=>s.draftId===d.id);return <fieldset key={d.id}><legend>{d.proposal.date} · draft {d.id} · {d.proposal.session.request.setting}</legend>
    <label><input type="checkbox" checked={!!slot} onChange={e=>setSlots(s=>e.target.checked?[...s,{id:`slot-${d.id}`,draftId:d.id,budgetSeconds:d.proposal.session.request.budgetSeconds,support:''}]:s.filter(v=>v.draftId!==d.id))}/>Include this exact session ({d.proposal.session.request.budgetSeconds} seconds budget)</label>
    {slot && <><label htmlFor={`week-support-${d.id}`}>Confirmed support value for this slot</label><input id={`week-support-${d.id}`} value={slot.support} placeholder="Match the reviewed source, including explicit none" onChange={e=>setSlots(s=>s.map(v=>v.draftId===d.id?{...v,support:e.target.value}:v))}/></>}
   </fieldset>})}
  </fieldset>
  <button className="btn" disabled={!online || busy || !policyId || !slots.length || !start || !split || !goals.trim() || slots.some(s=>!s.support)} onClick={()=>run(async()=>{const receipt=await generateWeek({clientId,generation:context?.generation,operationKey:crypto.randomUUID(),week:{manifestId:release,policyId,constraints:{startDate:start,timeZone:zone,split,goalPriority:goals.split(',').map(g=>g.trim()).filter(Boolean),slots}}});setStatus(`Saved weekly review ${receipt.id}. Nothing assigned.`)})}>Validate and save weekly draft</button>
  {rows.map((w,i)=><details key={w.id}><summary>Week {w.request.constraints.startDate} · review {w.id} · {w.approval?'assigned':w.result.state}</summary>
   <p>Policy {w.result.policyId} revision {w.result.policyRevision}. Generation {w.generation}.</p>
   <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify({constraints:w.request.constraints,gaps:w.result.gaps,sessions:w.result.sessions},null,2)}</pre>
   {rows.slice(0,i).some(n=>n.request.constraints.startDate===w.request.constraints.startDate) && <p>Superseded weekly review. Revalidate the latest plan.</p>}
   {!w.approval && <><label><input type="checkbox" checked={reviewed.includes(w.id)} disabled={busy} onChange={e=>setReviewed(ids=>e.target.checked?[...ids,w.id]:ids.filter(id=>id!==w.id))}/>I reviewed every selected session, constraint, dose and required gap.</label>
   <button className="btn" disabled={busy || !reviewed.includes(w.id) || w.generation!==context?.generation || context?.held!==false || w.result.state!=='ready_for_coach_review' || rows.slice(0,i).some(n=>n.request.constraints.startDate===w.request.constraints.startDate)} onClick={()=>run(async()=>{await approveWeek({clientId,weekId:w.id,generation:context.generation,operationKey:crypto.randomUUID()});setStatus(`Weekly review ${w.id} assigned atomically.`)})}>Approve all sessions in review {w.id}</button></>}
  </details>)}
  {status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
 </section>
}
