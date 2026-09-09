import {useEffect,useMemo,useState} from 'react'
import {generateSuggestion,prepareClient,readDevelopmentContext,readPendingOperations,reviewContext} from '../../../api/pooling'
import {clientPreparation,findingReview,preparationDefaults,preparationSummary} from '../../../lib/pooling/client-preparation'
import {coachErrorMessage,coachLabel} from '../../../lib/pooling/coach-view'
import PoolingAction from '../../molecules/PoolingAction'

const GOALS=['general_fitness','strength','mobility','endurance']
const DURATIONS=[20,30,45,60]

function Choice({selected,onClick,children}){
 return <button type="button" className={`coach-choice${selected?' selected':''}`} aria-pressed={selected} onClick={onClick}>{children}</button>
}

export default function CoachWorkoutSetup({clientId,client,onPrepared}){
 const [context,setContext]=useState(null),[form,setForm]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('')
 const [instant,setInstant]=useState(()=>{const date=new Date();date.setMinutes(date.getMinutes()+5-date.getTimezoneOffset());return date.toISOString().slice(0,16)})
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone
 const change=(key,value)=>setForm(current=>({...current,[key]:value}))
 const toggle=(key,value)=>change(key,form[key].includes(value)?form[key].filter(item=>item!==value):[...form[key],value])
 useEffect(()=>{let active=true;readDevelopmentContext(clientId).then(value=>{if(active){setContext(value);setForm(preparationDefaults(value))}}).catch(failure=>{if(active)setError(coachErrorMessage(failure))});return()=>{active=false}},[clientId])
 const catalogue=useMemo(()=>context?.release?.catalogue||[],[context])
 const equipment=useMemo(()=>[...new Set(catalogue.flatMap(item=>item.equipment||[]))].sort(),[catalogue])
 const eligible=useMemo(()=>catalogue.filter(item=>(item.settings||[]).includes(form?.setting)&&(item.levels||[]).includes(form?.level)&&(item.equipment||[]).every(value=>form?.equipment.includes(value))),[catalogue,form])
 const capabilities=useMemo(()=>[...new Set(eligible.flatMap(item=>item.prerequisites))].filter(key=>key!=='external_load_prescription_reviewed').sort(),[eligible])
 const findings=context?findingReview(context):[]
 const records=context?preparationSummary(context):[]
 const confirmationsReady=form?.adult&&form?.equipmentReviewed&&form?.sourcesReviewed&&form?.health

 async function generate(){
  setBusy(true);setError('');setStatus('Preparing the workout…')
  try{
   const pending=await readPendingOperations(clientId)
   if(pending.some(row=>['preparation','context_review','suggestion','draft'].includes(row.kind)))throw Object.assign(Error('A previous save still needs to be checked. Open Help and recovery before preparing another workout.'),{code:'outcome_unknown'})
   const prepared=clientPreparation(context,form,new Date(instant).toISOString(),zone)
   const saved=await prepareClient({clientId,generation:context.generation,operationKey:crypto.randomUUID(),...prepared})
   setStatus('Checking the client information…')
   const reviewed=await reviewContext({clientId,draftId:saved.id,generation:saved.generation,reference:'Coach reviewed the displayed client summary, health response, session setting and available equipment.',operationKey:crypto.randomUUID()})
   setStatus('Choosing suitable exercises…')
   const result=await generateSuggestion({clientId,draftId:reviewed.draftId,generation:reviewed.generation,operationKey:crypto.randomUUID(),mode:'generate'})
   setStatus(result.draftId?'Workout prepared. Review it before assigning.':'More information is needed before a workout can be prepared.')
   await onPrepared({draftId:result.draftId||null,suggestionId:result.id||null})
  }catch(failure){setError(coachErrorMessage(failure));setStatus('Your completed steps are saved. Nothing was assigned.')}
  finally{setBusy(false)}
 }

 if(!context||!form)return <section className="coach-card coach-loading"><h2>Workout details</h2><p role={error?'alert':'status'}>{error||`Loading ${client?.name||'client'}’s information…`}</p></section>
 if(!context.release?.manifest||!catalogue.length)return <section className="coach-card coach-loading"><h2>Workout details</h2><p role="alert">The reviewed exercise catalogue is not available for this client. No workout can be prepared until it is restored.</p></section>
 return <section className="coach-card coach-setup" aria-labelledby="coach-workout-details">
  <div className="coach-section-heading"><span className="coach-step-number">1</span><div><h2 id="coach-workout-details">Workout details</h2><p>Confirm what applies to this session. Nothing will be assigned yet.</p></div></div>
  <fieldset disabled={busy} className="coach-fieldset">
   <legend>When is the workout?</legend>
   <label htmlFor="coach-session-time">Date and time</label>
   <input id="coach-session-time" type="datetime-local" value={instant} onChange={event=>setInstant(event.target.value)}/>
   <p className="coach-help">Shown in {zone.replaceAll('_',' ')}.</p>
  </fieldset>
  <div className="coach-form-grid">
   <fieldset disabled={busy} className="coach-fieldset"><legend>Where will the client train?</legend><div className="coach-choice-row">{['home','gym','travel'].map(value=><Choice key={value} selected={form.setting===value} onClick={()=>change('setting',value)}>{coachLabel(value)}</Choice>)}</div></fieldset>
   <fieldset disabled={busy} className="coach-fieldset"><legend>How much time is available?</legend><div className="coach-choice-row">{DURATIONS.map(value=><Choice key={value} selected={form.budget===value} onClick={()=>change('budget',value)}>{value} min</Choice>)}</div></fieldset>
   <fieldset disabled={busy} className="coach-fieldset"><legend>Main goal for this workout</legend><div className="coach-choice-row">{GOALS.map(value=><Choice key={value} selected={form.goals[0]===value} onClick={()=>change('goals',[value])}>{coachLabel(value)}</Choice>)}</div></fieldset>
   <div className="coach-fieldset"><label htmlFor="coach-training-level">Current training level</label><select id="coach-training-level" value={form.level} disabled={busy} onChange={event=>change('level',event.target.value)}><option value="">Choose a level</option>{['beginner','intermediate','advanced'].map(value=><option key={value} value={value}>{coachLabel(value)}</option>)}</select></div>
  </div>
  <details className="coach-disclosure"><summary>Equipment available <span>{form.equipment.length?`${form.equipment.length} selected`:'Bodyweight only'}</span></summary><p>Choose only equipment available for this session.</p><div className="coach-check-grid">{equipment.map(value=><label key={value}><input type="checkbox" checked={form.equipment.includes(value)} disabled={busy} onChange={()=>toggle('equipment',value)}/><span>{coachLabel(value)}</span></label>)}</div></details>
  <details className="coach-disclosure"><summary>Client movement needs and abilities <span>{form.requiredNeeds.length+form.prerequisites.length} confirmed</span></summary>
   {!!findings.length&&<div className="coach-notice"><strong>Movement assessment available</strong><p>{findings.length} recorded finding{findings.length===1?'':'s'} can guide this workout. Confirm only the needs that apply today.</p></div>}
   <h3>Needs this workout should cover</h3><div className="coach-check-grid">{(context.release.needs||[]).map(need=><label key={need.id}><input type="checkbox" checked={form.requiredNeeds.includes(need.id)} disabled={busy} onChange={()=>toggle('requiredNeeds',need.id)}/><span>{need.name}</span></label>)}</div>
   {!!capabilities.length&&<><h3>What the client can safely do</h3><p>Leave an item unchecked if it has not been reviewed.</p><div className="coach-check-grid">{capabilities.map(value=><label key={value}><input type="checkbox" checked={form.prerequisites.includes(value)} disabled={busy} onChange={()=>toggle('prerequisites',value)}/><span>{coachLabel(value)}</span></label>)}</div></>}
  </details>
  <fieldset disabled={busy} className="coach-fieldset coach-health-question"><legend>Has anything changed with the client’s health since the last review?</legend><select value={form.health} onChange={event=>change('health',event.target.value)} aria-label="Current health change"><option value="">Choose an answer</option><option value="no_change">No change reported</option><option value="changed">Something changed or there is a concern</option><option value="declined">Client preferred not to answer</option></select>{form.health==='changed'&&<p role="alert">Review the change before assigning a workout. The system will keep the client on hold.</p>}</fieldset>
  <div className="coach-review-summary"><h3>Information used</h3><p>{records.filter(group=>group.count).map(group=>`${group.count} ${coachLabel(group.source).toLowerCase()}`).join(' · ')||'No earlier assessment or wellness records found'}</p></div>
  <div className="coach-confirmations">
   <label><input type="checkbox" checked={form.adult} disabled={busy} onChange={event=>change('adult',event.target.checked)}/><span>I confirm this is an adult general-fitness workout.</span></label>
   <label><input type="checkbox" checked={form.sourcesReviewed&&form.equipmentReviewed} disabled={busy} onChange={event=>setForm(current=>({...current,sourcesReviewed:event.target.checked,equipmentReviewed:event.target.checked}))}/><span>I reviewed the client information above and confirmed the equipment for this session.</span></label>
  </div>
  <PoolingAction className="btn coach-primary" reason={busy?'The workout is being prepared.':!instant?'Choose the workout date and time.':!form.level?'Choose the client’s training level.':!confirmationsReady?'Answer the health question and complete both confirmations.':''} onClick={generate}>{busy?'Preparing workout…':'Prepare workout'}</PoolingAction>
  {status&&<p className="coach-save-status" role="status">{status}</p>}{error&&<div className="coach-error" role="alert"><strong>We couldn’t finish this step</strong><p>{error}</p></div>}
 </section>
}
