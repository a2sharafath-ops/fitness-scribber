import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { readCatalogueDrafts, readPooling, readBuilderDrafts, submitPoolingReport, readExtensionPolicies, readExtensionRequests, saveExtensionRequest,readSourceReview,confirmPoolingSource,readReviewWorkspace,reviewExtension } from '../api/pooling'
import { useModal } from '../store/ModalContext'
import WorkoutBuilderModal from '../components/organisms/program/WorkoutBuilderModal'
import { todayISO } from '../lib/dates'
import PoolingExtensionReview from '../components/organisms/program/PoolingExtensionReview'
import PoolingSourceReview from '../components/organisms/program/PoolingSourceReview'
import PoolingApprovalReview from '../components/organisms/program/PoolingApprovalReview'
import PoolingOperationRecovery from '../components/organisms/program/PoolingOperationRecovery'
import PoolingGovernance from '../components/organisms/program/PoolingGovernance'
import PoolingWeeklyReview from '../components/organisms/program/PoolingWeeklyReview'
import PoolingSuggestions from '../components/organisms/program/PoolingSuggestions'
import PoolingReassessment from '../components/organisms/program/PoolingReassessment'
import PoolingCatalogueAdmin from '../components/organisms/program/PoolingCatalogueAdmin'
import { hasBackend } from '../lib/supabase'
import { currentUnassignedDrafts } from '../lib/pooling/review'
import usePoolingRuntime from '../hooks/usePoolingRuntime'
import PoolingNavigation from '../components/organisms/PoolingNavigation'
import PoolingAction from '../components/molecules/PoolingAction'
import PoolingClientPreparation from '../components/organisms/program/PoolingClientPreparation'
import PoolingModeSwitch from '../components/organisms/program/PoolingModeSwitch'
import ClientSubnav from '../components/templates/ClientSubnav'

export default function ExercisePoolPage() {
  const { id } = useParams()
  return <ExercisePoolWorkspace key={id} id={id}/>
}

// Navigation must not carry a pending health answer, extension request or
// displayed private source state into another client's workspace.
function ExercisePoolWorkspace({id}) {
  const runtime=usePoolingRuntime(id)
  const { db } = useData()
  const { openModal } = useModal()
  const [refresh, setRefresh] = useState(0)
  const client = db.clients.find(row => row.id === id)
  const [catalogue, setCatalogue] = useState([])
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [healthChange, setHealthChange] = useState('')
  const [saveStatus, setSaveStatus] = useState('unsaved')
  const [pending, setPending] = useState(null)
  const [policies,setPolicies]=useState(null)
  const [requests,setRequests]=useState({daily:[],progression:[]})
  const [sourceReview,setSourceReview]=useState({sources:[],confirmations:[]})
  const [workspace,setWorkspace]=useState({manifests:[],decisions:[],assignments:[]})
  const readBlocked=loading?'Workspace data is loading. Wait for the current sources, drafts and policies.':error?'Workspace data could not be verified. Use Retry loading workspace after checking the error.':!state?'Current workspace data is unavailable. Retry loading before a new action.':''
  const online=hasBackend&&!readBlocked
  useEffect(() => {
    let active = true
    async function load() {
      if (!runtime.r1) { setLoading(false); return }
      setLoading(true)
      setError('')
      try {
        const records = await readCatalogueDrafts()
        const data = hasBackend ? await readPooling(id) : { context: null, drafts: await readBuilderDrafts(id) }
        const flags={r2:runtime.r2,r3:runtime.r3}
        const extensionPolicies=flags.r2 || flags.r3 ? await readExtensionPolicies() : null
        const extensionRequests={daily:flags.r2 ? await readExtensionRequests(id,'daily'):[],progression:flags.r3 ? await readExtensionRequests(id,'progression'):[]}
        const sourceData=await readSourceReview(db,id)
        const reviewWorkspace=await readReviewWorkspace(id)
        if (active) { setCatalogue(records); setState(data);setPolicies(extensionPolicies);setRequests(extensionRequests);setSourceReview(sourceData);setWorkspace(reviewWorkspace) }
      } catch (failure) { if (active) setError(failure.message) }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [id,refresh,db,runtime.r1,runtime.r2,runtime.r3])
  if (!runtime.r1) return <div className="pooling-workspace"><h1>{runtime.status==='loading'?'Checking client activation…':'Classic workflow is active'}</h1><p>{runtime.status==='unavailable'?'Client activation could not be verified. Retry when connected.':'Pooling drafts, assignments and results are preserved. Use the switch below to return to the integrated development workflow.'}</p><PoolingModeSwitch clientId={id} runtime={runtime}/><p><Link to={`/clients/${id}`}>Back to client and preserved sessions</Link></p></div>
  if (!client) return <div className="empty">Client not found.</div>
  async function report() {
    const operation = pending || { clientId: id, generation: state?.context?.generation || 1,
      operationKey: crypto.randomUUID(), field: 'healthChange', value: healthChange, effectiveAt: new Date().toISOString() }
    setPending(operation)
    setSaveStatus('saving')
    setError('')
    try {
      await submitPoolingReport(operation)
      setSaveStatus('saved')
      setPending(null)
      try { setState(await readPooling(id)) }
      catch { setError('Report saved. Updated context could not be loaded; refresh before another action.') }
    } catch (failure) {
      setSaveStatus(failure.code === 'outcome_unknown' ? 'outcome_unknown' : 'failed')
      setError(failure.message)
      if (failure.code !== 'outcome_unknown') setPending(null)
    }
  }
  const activeCatalogue=runtime.developmentEnabled?workspace.manifests.find(m=>m.document.manifest.audience==='development')?.document.catalogue||[]:catalogue
  const filtered = activeCatalogue.filter(row => `${row.name} ${row.roles.join(' ')} ${row.pattern}`.toLowerCase().includes(filter.toLowerCase()))
  const unassignedDrafts=currentUnassignedDrafts(state?.drafts || [],workspace.assignments)
  async function requestReview(kind,operation) {
    await saveExtensionRequest({clientId:id,kind,generation:state?.context?.generation || 1,...operation})
    setRefresh(value=>value+1)
  }
  return <div className="pooling-workspace">
    <div className="topbar"><div><h1>Exercise Pool · {client.name}</h1><p className="sub">Coach review workspace · never automatic assignment</p></div><Link className="btn ghost" to={`/clients/${id}`}>Back to client</Link></div>
    <ClientSubnav client={client}/>
    <PoolingModeSwitch clientId={id} runtime={runtime}/>
    <PoolingNavigation clientId={id} testOnly={false} r1={runtime.r1} r2={runtime.r2} r3={runtime.r3} ready={!loading} reviewReady={!loading&&!error&&!!state} extensionsReady={!!policies}/>
    {runtime.developmentEnabled&&<PoolingClientPreparation clientId={id} drafts={state?.drafts||[]} assignments={workspace.assignments||[]} onPrepared={()=>setRefresh(value=>value+1)}/>}
    {runtime.testOnly&&<p className="pooling-next-step">For a first test: prepare one fictional session in Test setup, then choose it under Generate &amp; swap. Generate or swap before final validation. Expand the newest draft under Validate &amp; approve, review it explicitly, then open Sessions &amp; results. Daily adjustment uses an approved but unstarted baseline; test it before starting that baseline. Progression follows saved baseline results, and weekly planning comes last.</p>}
    <section className="card" aria-labelledby="pool-status"><h2 id="pool-status">Review and availability</h2>
      <p>{hasBackend ? 'Online source checks are required for governed actions.' : 'Local preview only. Backend approval, assignment, start and resume are unavailable.'}</p>
      <p>{runtime.developmentEnabled?'Development catalogue is available for these test records. Generation, source checks and exact coach approval are required; production/clinical publication remains separate.':'Catalogue candidates below are review drafts. Only an admitted release can be used for generation.'}</p>
      {loading && <p role="status">Loading review data…</p>}
      {error && <p role="alert">{error}</p>}
      {readBlocked&&<p>{readBlocked}</p>}
      <PoolingAction className="btn ghost" reason={loading?'The current load is still in progress.':''} onClick={()=>setRefresh(value=>value+1)}>Retry loading workspace</PoolingAction>
      {!loading && hasBackend && <p>Context: {state?.context ? `generation ${state.context.generation} · ${state.context.held ? 'review hold' : 'requires current checks'}` : 'not yet collected; not assumed normal'}</p>}
    </section>
    <PoolingOperationRecovery clientId={id} refreshKey={refresh} onReconciled={()=>setRefresh(value=>value+1)}/>
    {hasBackend && !runtime.developmentEnabled && <PoolingGovernance clientId={id} onChanged={()=>setRefresh(value=>value+1)}/>}
    <section className="card" aria-labelledby="review-drafts"><h2 id="review-drafts" tabIndex={-1}>Unassigned review drafts</h2>
      <button className="btn" onClick={() => openModal(<WorkoutBuilderModal clientId={id} date={todayISO()} />, 'xl')}>Create review draft</button>
      <button className="btn ghost" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh drafts</button>
      <p>{hasBackend ? 'Canonical drafts require a current server decision and exact coach review below.' : 'Local drafts are stored separately from Classic prescriptions and have no server authority.'}</p>
      {loading || error ? <p>Current draft availability is not confirmed. Refresh after the reported issue is resolved.</p> : <>
        {unassignedDrafts.map(row => <p key={row.id || row.operationKey}>{row.proposal.date} · revision {row.revision} · unassigned draft</p>)}
        {!unassignedDrafts.length && <p>No current unassigned review drafts. Assigned and superseded revisions remain in the exact-revision history below.</p>}
      </>}
    </section>
    <PoolingApprovalReview key={`PoolingApprovalReview:${id}`} clientId={id} context={state?.context} drafts={state?.drafts || []} workspace={workspace} online={online} blockedReason={readBlocked} onRefresh={()=>setRefresh(value=>value+1)}/>
    <PoolingSuggestions key={`PoolingSuggestions:${id}:${refresh}`} clientId={id} context={state?.context} drafts={state?.drafts || []} workspace={workspace} online={online} onRefresh={()=>setRefresh(value=>value+1)}/>
    <section className="card" aria-labelledby="health-review"><h2 id="health-review" tabIndex={-1}>Current health change</h2>
      <p>This is separate from optional daily wellness. A no-change answer does not clear an existing restriction.</p>
      <label htmlFor="pool-health">Client-reported change</label>
      <select id="pool-health" value={healthChange} disabled={saveStatus === 'saving' || !!pending} onChange={event => { setHealthChange(event.target.value); setSaveStatus('unsaved') }}>
        <option value="">Select an explicit response</option><option value="no_change">No change reported</option><option value="changed">A change or concern was reported</option><option value="declined">Client declined to answer</option>
      </select>
      <PoolingAction reason={!hasBackend?'Sign in to the connected Preview to save an attributed report.':saveStatus==='saving'?'The health-change report is saving.':!healthChange?'Choose an explicit health-change response first.':!pending?readBlocked:''} onClick={report}>{pending ? 'Retry same report' : 'Save attributed report'}</PoolingAction>
      <p role="status">Report status: {saveStatus.replaceAll('_',' ')}</p>
    </section>
    {runtime.r2 && <PoolingExtensionReview kind="daily" policy={policies?.daily} requests={requests.daily} online={online} clientId={id} context={state?.context} workspace={workspace} drafts={state?.drafts} onRefresh={()=>setRefresh(value=>value+1)} onRequest={operation=>requestReview('daily',operation)} onReview={async operation=>{await reviewExtension({clientId:id,generation:state?.context?.generation,...operation});setRefresh(value=>value+1)}}/>}
    {runtime.r3 && <PoolingExtensionReview kind="progression" policy={policies?.progression} requests={requests.progression} online={online} clientId={id} context={state?.context} workspace={workspace} drafts={state?.drafts} onRefresh={()=>setRefresh(value=>value+1)} onRequest={operation=>requestReview('progression',operation)} onReview={async operation=>{await reviewExtension({clientId:id,generation:state?.context?.generation,...operation});setRefresh(value=>value+1)}}/>}
    <PoolingSourceReview key={`PoolingSourceReview:${id}`} sources={sourceReview.sources.filter(row=>row.id)} confirmations={sourceReview.confirmations} online={hasBackend} onConfirm={async operation=>{
      await confirmPoolingSource({clientId:id,generation:state?.context?.generation || 1,...operation});setRefresh(value=>value+1)
    }} blockedReason={readBlocked}/>
    {runtime.r3 && <PoolingWeeklyReview key={`PoolingWeeklyReview:${id}:${refresh}`} clientId={id} context={state?.context} workspace={workspace} drafts={state?.drafts || []} online={online} onRefresh={()=>setRefresh(value=>value+1)}/>}
    {runtime.r3 && <PoolingReassessment key={`PoolingReassessment:${id}`} clientId={id} online={online}/>}
    {!runtime.developmentEnabled&&<PoolingCatalogueAdmin key={`PoolingCatalogueAdmin:${id}`} clientId={id} online={hasBackend}/>}
    <section className="card" aria-labelledby="candidate-review"><h2 id="candidate-review" tabIndex={-1}>Candidate catalogue review</h2>
      <label htmlFor="pool-filter">Filter by name, role or movement pattern</label><input id="pool-filter" value={filter} onChange={event => setFilter(event.target.value)} />
      <p>{filtered.length} exercise records. {runtime.developmentEnabled?'Development release: eligibility is determined from this client’s confirmed inputs.':'Unpublished candidates: review required.'}</p>
      <div style={{ overflowX: 'auto' }}><table><thead><tr><th scope="col">Exercise</th><th scope="col">Roles</th><th scope="col">Equipment</th><th scope="col">Availability</th></tr></thead>
        <tbody>{filtered.map(row => <tr key={`${row.id}:${row.revision}`}><th scope="row">{row.name}</th><td>{row.roles.join(', ').replaceAll('_',' ')}</td><td>{row.equipment.length ? row.equipment.join(', ').replaceAll('_',' ') : 'No listed equipment; setup still needs confirmation'}</td><td>{runtime.developmentEnabled?'Development · prerequisites and dose checked at generation':'Unpublished · not assignable'}</td></tr>)}</tbody></table></div>
    </section>
  </div>
}
