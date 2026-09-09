import {useCallback,useEffect,useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {approveDraft,decideDraft,generateSuggestion,readPendingOperations,readPooling,readReviewWorkspace,readSuggestions,retryPendingOperation} from '../api/pooling'
import CoachWorkoutPreview from '../components/organisms/program/CoachWorkoutPreview'
import CoachWorkoutSetup from '../components/organisms/program/CoachWorkoutSetup'
import ClientSubnav from '../components/templates/ClientSubnav'
import PoolingAction from '../components/molecules/PoolingAction'
import {useData} from '../store/DataContext'
import usePoolingRuntime from '../hooks/usePoolingRuntime'
import {approvalBlock} from '../lib/pooling/action-readiness'
import {coachDraftStatus,coachErrorMessage,coachGapText,currentCoachDraft} from '../lib/pooling/coach-view'

const STEPS=['Details','Review workout','Approve','Assigned']

export default function CoachWorkoutPage(){
 const {id}=useParams(),{db}=useData(),client=db.clients.find(item=>item.id===id),runtime=usePoolingRuntime(id)
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[reviewed,setReviewed]=useState(false),[revision,setRevision]=useState(0),[showSetup,setShowSetup]=useState(false),[justAssigned,setJustAssigned]=useState(false)
 const refresh=useCallback(async()=>{if(!runtime.r1)return;setLoading(true);setError('');try{const [pool,workspace,suggestions,pending]=await Promise.all([readPooling(id),readReviewWorkspace(id),readSuggestions(id),readPendingOperations(id)]);setData({pool,workspace,suggestions,pending})}catch(failure){setError(coachErrorMessage(failure))}finally{setLoading(false)}},[id,runtime.r1])
 useEffect(()=>{refresh()},[refresh,revision])
 const pool=data?.pool||{},workspace=data?.workspace||{}
 const assignments=Array.isArray(workspace.assignments)?workspace.assignments:[],drafts=Array.isArray(pool.drafts)?pool.drafts:[],decisions=Array.isArray(workspace.decisions)?workspace.decisions:[],manifests=Array.isArray(workspace.manifests)?workspace.manifests:[],suggestions=Array.isArray(data?.suggestions)?data.suggestions:[]
 const draft=currentCoachDraft(drafts,assignments)
 const decision=draft&&decisions.find(item=>item.draftId===draft.id)
 const assigned=!!(draft&&assignments.some(item=>item.draftId===draft.id))
 const progress=coachDraftStatus({draft,decision,assigned:assigned||justAssigned})
 const manifest=draft&&manifests.find(item=>item.id===draft.proposal?.manifestId)
 const latestSuggestion=[...suggestions].sort((a,b)=>b.id-a.id)[0]
 const gaps=decision?.result?.gaps||latestSuggestion?.result?.gaps||[]
 const currentAssignments=[...assignments].sort((a,b)=>String(b.sessionAt||b.date).localeCompare(String(a.sessionAt||a.date)))
 const pendingOperation=Array.isArray(data?.pending)?data.pending[0]:null
 const block=draft?approvalBlock({row:draft,context:pool.context,decision,drafts,assignments,online:!loading&&!error}):''

 async function run(name,action){setBusy(name);setError('');setNotice('');try{await action();setRevision(value=>value+1)}catch(failure){setError(coachErrorMessage(failure))}finally{setBusy('')}}
 async function validate(){await run('validate',async()=>{await decideDraft({clientId:id,draftId:draft.id,generation:pool.context.generation});setNotice('Checks complete. Review the workout and approve it when you are happy.')})}
 async function approve(){await run('approve',async()=>{const result=await approveDraft({clientId:id,draftId:draft.id,decisionId:decision.id,generation:pool.context.generation,operationKey:crypto.randomUUID()});setNotice(`Workout assigned to ${client.name}.`);setReviewed(false);setJustAssigned(true);return result})}
 async function recover(){await run('recover',async()=>{await retryPendingOperation(pendingOperation);setNotice('The original save has been checked.')})}
 async function swap(occurrenceId,exerciseId){await run('swap',async()=>{const result=await generateSuggestion({clientId:id,draftId:draft.id,generation:pool.context.generation,operationKey:crypto.randomUUID(),mode:'swap',occurrenceId,exerciseId});if(!result.draftId)throw Error('That alternative could not satisfy the complete workout. The current draft is unchanged.');setReviewed(false);setNotice('Alternative prepared. Review the updated workout.')})}

 if(!client)return <div className="coach-empty"><h1>Client not found</h1><Link className="btn" to="/clients">Back to clients</Link></div>
 if(runtime.status==='loading')return <div className="coach-empty" role="status">Opening {client.name}’s workout…</div>
 if(!runtime.r1)return <><div className="topbar"><div><h1>{client.name} · Workouts</h1><p className="sub">The Classic workflow is active for this account.</p></div></div><ClientSubnav client={client}/><div className="coach-card"><h2>Classic workout planning</h2><p>Your saved pooling workouts and results are still preserved.</p><Link className="btn" to="/workouts">Open workout plans</Link></div></>
 const readyDraft=draft?.proposal?.selection?.length>0
 return <div className="coach-page">
  <div className="topbar"><div><Link className="coach-back" to={`/clients/${id}`}>← {client.name}</Link><h1>Create workout</h1><p className="sub">Prepare, review and assign in one guided flow.</p></div></div>
  <ClientSubnav client={client}/>
  <ol className="coach-steps" aria-label={`Workout progress: ${progress.label}`}>{STEPS.map((label,index)=><li key={label} className={index+1<progress.step?'done':index+1===progress.step?'current':''}><span>{index+1<progress.step?'✓':index+1}</span>{label}</li>)}</ol>
  {error&&<div className="coach-error" role="alert"><strong>Something needs attention</strong><p>{error}</p><button className="btn ghost" onClick={refresh}>Try again</button></div>}
  {notice&&<div className="coach-success" role="status">{notice}</div>}
  {pendingOperation&&<div className="coach-card coach-action-card"><div><h2>Check the last save</h2><p>We kept the original request so it cannot create a duplicate or lose your work.</p></div><button className="btn" disabled={!!busy} onClick={recover}>{busy==='recover'?'Checking…':'Check save'}</button></div>}
  {loading&&!data&&<div className="coach-card" role="status">Loading current workout information…</div>}
  {!loading&&!justAssigned&&(!readyDraft||showSetup)&&<CoachWorkoutSetup clientId={id} client={client} onPrepared={async()=>{setShowSetup(false);setReviewed(false);setJustAssigned(false);setRevision(value=>value+1)}}/>}
  {!loading&&!justAssigned&&draft&&!readyDraft&&!showSetup&&<section className="coach-card coach-needs-attention"><div className="coach-section-heading"><span className="coach-step-number">!</span><div><h2>We need a little more information</h2><p>No workout has been assigned.</p></div></div>{gaps.length?<ul>{gaps.map((gap,index)=><li key={index}>{coachGapText(gap)}</li>)}</ul>:<p>The available exercises do not yet cover every required workout section. Review the equipment, client abilities and confirmed movement needs.</p>}<button className="btn" onClick={()=>setShowSetup(true)}>Review workout details</button></section>}
  {!loading&&readyDraft&&<section className="coach-card" aria-labelledby="coach-review-workout"><div className="coach-section-heading"><span className="coach-step-number">2</span><div><h2 id="coach-review-workout">Review workout</h2><p>Check that the exercises and targets suit {client.name}. This is still a draft.</p></div></div>
   <div className="coach-session-summary"><span><strong>{draft.proposal.date}</strong>Date</span><span><strong>{Math.round((draft.proposal.session?.request?.budgetSeconds||0)/60)} min</strong>Available time</span><span><strong>{draft.proposal.session?.request?.setting||'—'}</strong>Location</span><span><strong>{draft.proposal.selection.length}</strong>Exercises</span></div>
   <CoachWorkoutPreview blocks={decision?.result?.blocks||draft.proposal.selection} catalogue={manifest?.document?.catalogue||[]}/>
   {!decision&&<PoolingAction className="btn coach-primary" reason={busy?'Checking this workout…':''} onClick={validate}>{busy==='validate'?'Checking workout…':'Check workout and continue'}</PoolingAction>}
   {decision&&decision.result?.completeness!=='ready_for_coach_review'&&<div className="coach-error"><strong>This workout is not ready</strong><ul>{(decision.result.gaps||[]).map((gap,index)=><li key={index}>{coachGapText(gap)}</li>)}</ul><button className="btn ghost" disabled={!!busy} onClick={()=>setShowSetup(true)}>Change details</button></div>}
   {decision?.result?.completeness==='ready_for_coach_review'&&<div className="coach-approval"><div className="coach-section-heading"><span className="coach-step-number">3</span><div><h2>Approve and assign</h2><p>Assignment happens only after you confirm this final review.</p></div></div><label className="coach-approval-check"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/><span>I reviewed the exercises, targets and client information for this workout.</span></label><PoolingAction className="btn coach-primary" reason={busy?'Saving the assignment…':block||(!reviewed?'Complete the review confirmation above.':'')} onClick={approve}>{busy==='approve'?'Assigning workout…':`Approve and assign to ${client.name}`}</PoolingAction></div>}
   <details className="coach-disclosure"><summary>Want to change an exercise?</summary><p>Compatible alternatives still receive the same eligibility and safety checks.</p>{(Array.isArray(decision?.result?.blocks)?decision.result.blocks:[]).map(block=>{const catalogue=Array.isArray(manifest?.document?.catalogue)?manifest.document.catalogue:[],source=catalogue.find(item=>item.id===block.exerciseId&&item.revision===block.exerciseRevision),alternatives=catalogue.filter(item=>item.id!==source?.id&&item.familyId&&item.familyId===source?.familyId&&item.laterality===source?.laterality);return alternatives.length?<div className="coach-swap" key={block.occurrenceId}><span>{source?.name||'Exercise'}</span><select defaultValue="" aria-label={`Alternative for ${source?.name||'exercise'}`} onChange={event=>event.target.value&&swap(block.occurrenceId,event.target.value)} disabled={!!busy}><option value="">Choose an alternative</option>{alternatives.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></div>:null})}</details>
   <button className="btn ghost" onClick={()=>setShowSetup(true)}>Start a different workout</button>
  </section>}
  {!!currentAssignments.length&&<section className="coach-card"><div className="coach-card-head"><div className="coach-section-heading"><span className="coach-step-number">✓</span><div><h2>Assigned workouts</h2><p>Open the client summary to start a session or record results.</p></div></div>{justAssigned&&<button className="btn ghost" onClick={()=>{setJustAssigned(false);setShowSetup(true)}}>Create another</button>}</div>{currentAssignments.slice(0,3).map(item=><div className="coach-assigned-row" key={item.id}><div><strong>{item.date}</strong><span>{Array.isArray(item.blocks)?item.blocks.length:0} exercises · {item.status==='complete'?'Completed':'Assigned'}</span></div><Link className="btn ghost" to={`/clients/${id}#workouts`}>Open</Link></div>)}</section>}
  <details className="coach-support"><summary>Help and recovery</summary><p>Technical records are hidden from the normal coaching flow. Use this area only for troubleshooting.</p><Link to={`/clients/${id}/pool/advanced`}>Open technical workspace</Link></details>
 </div>
}
