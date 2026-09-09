import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {readDevelopmentContext,prepareClient,reviewContext,generateSuggestion,readPendingOperations,saveRecoverableBuilderDraft} from '../../../api/pooling'
import {clientPreparation,preparationDefaults,preparationSummary,preparationRoles,readable,findingReview} from '../../../lib/pooling/client-preparation'
import PoolingAction from '../../molecules/PoolingAction'

export default function PoolingClientPreparation({clientId,onPrepared,drafts=[],assignments=[]}) {
 const [context,setContext]=useState(null),[form,setForm]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('')
 const [instant,setInstant]=useState(()=>{const now=new Date();now.setMinutes(now.getMinutes()+5-now.getTimezoneOffset());return now.toISOString().slice(0,16)})
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone
 const [additional,setAdditional]=useState([]),[baseline,setBaseline]=useState('')
 const change=(key,value)=>setForm(f=>({...f,[key]:value}))
 const toggle=(key,value)=>change(key,form[key].includes(value)?form[key].filter(v=>v!==value):[...form[key],value])
 useEffect(()=>{let active=true;readDevelopmentContext(clientId).then(value=>{if(active){setContext(value);setForm(preparationDefaults(value))}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[clientId])
 async function prepare() {
  setBusy(true);setError('');setStatus('Saving reviewed client inputs…')
  try {
   const pending=await readPendingOperations(clientId)
   if(pending.some(r=>['preparation','context_review','suggestion','draft'].includes(r.kind)))throw Error('Reconcile the pending preparation/review in Operation recovery before preparing another workout.')
   const prepared=[instant,...additional].map(value=>clientPreparation(context,form,new Date(value).toISOString(),zone))
   if(new Set(prepared.map(p=>p.proposal.session.sessionAt)).size!==prepared.length)throw Error('Each planned session needs its own date and time.')
   const original=baseline?drafts.find(d=>d.id===Number(baseline)):null
   if(baseline&&(!original?.proposal.selection?.length||original.proposal.manifestId!==context.release.manifest.id))throw Error('Choose a current release baseline, or generate a new selection.')
   if(original)for(const item of prepared)item.proposal.selection=structuredClone(original.proposal.selection)
   const payload=structuredClone(prepared[0])
   for(const item of prepared.slice(1))payload.observations.push(...item.observations.filter(o=>['health','equipment'].includes(o.key)))
   const saved=await prepareClient({clientId,generation:context.generation,operationKey:crypto.randomUUID(),...payload})
   setStatus(`Session inputs saved as draft ${saved.id}. Reviewing sources…`)
   const reviewed=await reviewContext({clientId,draftId:saved.id,generation:saved.generation,reference:'Coach explicitly reviewed the displayed existing test-client records and session inputs.',operationKey:crypto.randomUUID()})
   setStatus(`Source review saved as draft ${reviewed.draftId}. Generating exercises…`)
   const results=[]
   for(let i=0;i<prepared.length;i++){
    const seed=i===0?{id:reviewed.draftId}:await saveRecoverableBuilderDraft({clientId,generation:reviewed.generation,operationKey:crypto.randomUUID(),proposal:prepared[i].proposal,parentId:null})
    if(original)results.push({draftId:seed.id})
    else results.push(await generateSuggestion({clientId,draftId:seed.id,generation:reviewed.generation,operationKey:crypto.randomUUID(),mode:'generate'}))
   }
   setStatus(`Prepared ${results.length} session(s): ${results.map(r=>r.draftId?`draft ${r.draftId}`:`review ${r.id} with gaps`).join(', ')}. Inspect Validate & approve, or review these together in Weekly planning. Nothing was assigned. ${original?'Baseline occurrence identities were retained for comparable progression.':''}`)
   onPrepared()
   const refreshed=await readDevelopmentContext(clientId);setContext(refreshed)
  }catch(e){setError(e.message);setStatus('Preparation stopped. Completed steps remain saved; inspect drafts or Operation recovery before retrying.');onPrepared()}
  finally{setBusy(false)}
 }
 if(!context||!form)return <section className="card"><h2>Prepare workout from this client</h2><p role={error?'alert':'status'}>{error||'Loading existing client records…'}</p></section>
 const eligible=context.release?.catalogue.filter(e=>e.settings.includes(form.setting)&&e.levels.includes(form.level)&&e.equipment.every(q=>form.equipment.includes(q)))||[]
 const prerequisites=[...new Set(eligible.flatMap(e=>e.prerequisites))].filter(k=>k!=='external_load_prescription_reviewed').sort()
 const equipment=[...new Set(context.release?.catalogue.flatMap(e=>e.equipment)||[])].sort()
 return <section className="card" aria-labelledby="pool-prepare-title"><h2 id="pool-prepare-title" tabIndex={-1}>Prepare workout from this client</h2>
  <p>Uses this client's existing records. Review the inputs below, generate a draft, then validate and explicitly approve it. Development prescriptions are test parameters, not a clinical release.</p>
  <p><Link to={`/clients/${clientId}/assessments`}>Review or update assessments</Link> · <Link to={`/clients/${clientId}/profile`}>Client profile and onboarding</Link> · <Link to={`/monitor/${clientId}`}>Wellness and monitoring</Link></p>
  <details><summary>Existing records used for review</summary>{preparationSummary(context).map(group=><div key={group.source}><h3>{readable(group.source)} · {group.count}</h3>{group.records.length?group.records.map(row=><details key={row.id}><summary>{row.date||row.updatedAt||'Undated'} · {row.type||row.id}</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(row.data||row,null,2)}</pre></details>):<p>Not recorded; no normal finding is assumed.</p>}</div>)}</details>
  <fieldset disabled={busy}><legend>Session inputs</legend>
   <label htmlFor="client-session-time">Session date and time ({zone})</label><input id="client-session-time" type="datetime-local" value={instant} onChange={e=>setInstant(e.target.value)}/>
   {additional.map((value,i)=><div key={i}><label htmlFor={`client-session-extra-${i}`}>Additional session {i+2} ({zone})</label><input id={`client-session-extra-${i}`} type="datetime-local" value={value} onChange={e=>setAdditional(rows=>rows.map((v,n)=>n===i?e.target.value:v))}/><button className="btn ghost" onClick={()=>setAdditional(rows=>rows.filter((_,n)=>n!==i))}>Remove session {i+2}</button></div>)}
   <button className="btn ghost" disabled={additional.length>=4} onClick={()=>setAdditional(rows=>[...rows,''])}>Add another session for weekly planning</button>
   <label htmlFor="client-session-baseline">Exercise selection</label><select id="client-session-baseline" value={baseline} onChange={e=>setBaseline(e.target.value)}><option value="">Generate a new selection</option>{assignments.filter(a=>drafts.some(d=>d.id===a.draftId&&d.proposal.manifestId===context.release.manifest.id)).map(a=><option key={a.id} value={a.draftId}>Reuse approved draft {a.draftId} for progression / a later session</option>)}</select>
   <label htmlFor="client-session-level">Training level</label><select id="client-session-level" value={form.level} onChange={e=>change('level',e.target.value)}><option value="">Choose level</option>{['beginner','intermediate','advanced'].map(v=><option key={v}>{v}</option>)}</select>
   <label htmlFor="client-session-setting">Setting</label><select id="client-session-setting" value={form.setting} onChange={e=>change('setting',e.target.value)}>{['home','gym','travel'].map(v=><option key={v}>{v}</option>)}</select>
   <label htmlFor="client-session-budget">Available minutes</label><input id="client-session-budget" type="number" min="1" max="180" value={form.budget} onChange={e=>change('budget',+e.target.value)}/>
   <label htmlFor="client-session-goal">Priority goal</label><select id="client-session-goal" value={form.goals[0]} onChange={e=>change('goals',[e.target.value])}>{['general_fitness','strength','mobility','endurance'].map(v=><option value={v} key={v}>{readable(v)}</option>)}</select>
   <fieldset><legend>Available equipment (none checked means bodyweight only)</legend>{equipment.map(v=><label key={v} style={{display:'inline-block',marginRight:14}}><input type="checkbox" checked={form.equipment.includes(v)} onChange={()=>toggle('equipment',v)}/>{readable(v)}</label>)}</fieldset>
   <fieldset><legend>Workout sections</legend>{preparationRoles.map(v=><label key={v} style={{display:'inline-block',marginRight:14}}><input type="checkbox" checked={form.roles.includes(v)} disabled={context.release.modulePolicy.requiredRoles.includes(v)} onChange={()=>toggle('roles',v)}/>{readable(v)}</label>)}</fieldset>
   <fieldset><legend>Assessment findings and confirmed training needs</legend><p>Recorded findings are review prompts, not diagnoses. Choose only the task needs you confirm; selected needs become required coverage in the workout.</p>{findingReview(context).map(row=><p key={row.key}>{row.key} · {row.sides.join('/')} · assessment {row.sourceId}, {row.date}{row.pain?' · pain reported — review required':''}. Possible task needs: {row.needs.join(', ')||'requires individual review'}.</p>)}{(context.release.needs||[]).map(need=><label key={need.id} style={{display:'block'}}><input type="checkbox" checked={form.requiredNeeds.includes(need.id)} onChange={()=>toggle('requiredNeeds',need.id)}/>{need.name}</label>)}</fieldset>
   <fieldset><legend>Confirmed capabilities and setup</legend><p>Check only capabilities you have actually reviewed for this test client. Unchecked items stay unknown and exclude affected exercises. External-load variants remain excluded until a load-specific release exists.</p>{prerequisites.map(v=><label key={v} style={{display:'block'}}><input type="checkbox" checked={form.prerequisites.includes(v)} onChange={()=>toggle('prerequisites',v)}/>{readable(v)}</label>)}</fieldset>
   <label htmlFor="client-session-health">Current health response</label><select id="client-session-health" value={form.health} onChange={e=>change('health',e.target.value)}><option value="">Choose response</option><option value="no_change">No change reported</option><option value="changed">A change / concern was reported</option><option value="declined">Declined to answer</option></select>
   <label style={{display:'block'}}><input type="checkbox" checked={form.adult} onChange={e=>change('adult',e.target.checked)}/>Reviewed adult general-fitness scope for this test client</label>
   <label style={{display:'block'}}><input type="checkbox" checked={form.equipmentReviewed} onChange={e=>change('equipmentReviewed',e.target.checked)}/>Equipment and setup above are confirmed for this session</label>
   <label style={{display:'block'}}><input type="checkbox" checked={form.sourcesReviewed} onChange={e=>change('sourcesReviewed',e.target.checked)}/>I reviewed the existing onboarding, assessments, concerns and wellness; checked capabilities reflect that review</label>
  </fieldset>
  <PoolingAction reason={busy?'Preparation is saving; wait for the outcome.':!form.sourcesReviewed||!form.adult||!form.equipmentReviewed||!form.health?'Complete the explicit source, scope, health and equipment review above.':''} onClick={prepare}>Generate workout for this client</PoolingAction>
  {status&&<p role="status">{status}</p>}{error&&<p role="alert">{error}</p>}
 </section>
}
