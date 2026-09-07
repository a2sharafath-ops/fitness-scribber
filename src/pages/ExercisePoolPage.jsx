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
import { poolingConfig } from '../lib/pooling/config'

export default function ExercisePoolPage() {
  const { id } = useParams()
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
  useEffect(() => {
    let active = true
    async function load() {
      if (!poolingConfig().r1) { setLoading(false); return }
      setLoading(true)
      setError('')
      try {
        const records = await readCatalogueDrafts()
        const data = hasBackend ? await readPooling(id) : { context: null, drafts: await readBuilderDrafts(id) }
        const flags=poolingConfig()
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
  }, [id,refresh,db])
  if (!poolingConfig().r1) return <div className="empty"><h1>Exercise pooling is disabled</h1><p>The Classic workflow is unchanged.</p><Link to={`/clients/${id}`}>Back to client</Link></div>
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
  const filtered = catalogue.filter(row => `${row.name} ${row.roles.join(' ')} ${row.pattern}`.toLowerCase().includes(filter.toLowerCase()))
  async function requestReview(kind,operation) {
    await saveExtensionRequest({clientId:id,kind,generation:state?.context?.generation || 1,...operation})
    setRefresh(value=>value+1)
  }
  return <div className="pooling-workspace">
    <div className="topbar"><div><h1>Exercise Pool · {client.name}</h1><p className="sub">Coach review workspace · never automatic assignment</p></div><Link className="btn ghost" to={`/clients/${id}`}>Back to client</Link></div>
    <section className="card" aria-labelledby="pool-status"><h2 id="pool-status">Review and availability</h2>
      <p>{hasBackend ? 'Online source checks are required for governed actions.' : 'Local preview only. Backend approval, assignment, start and resume are unavailable.'}</p>
      <p>Catalogue candidates below are unpublished drafts, not an eligible exercise pool. Professional evidence and release admission remain pending.</p>
      {loading && <p role="status">Loading review data…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && hasBackend && <p>Context: {state?.context ? `generation ${state.context.generation} · ${state.context.held ? 'review hold' : 'requires current checks'}` : 'not yet collected; not assumed normal'}</p>}
    </section>
    <PoolingOperationRecovery clientId={id} refreshKey={refresh} onReconciled={()=>setRefresh(value=>value+1)}/>
    {hasBackend && <PoolingGovernance clientId={id} onChanged={()=>setRefresh(value=>value+1)}/>}
    <section className="card" aria-labelledby="review-drafts"><h2 id="review-drafts">Unassigned review drafts</h2>
      <button className="btn" onClick={() => openModal(<WorkoutBuilderModal clientId={id} date={todayISO()} />, 'xl')}>Create review draft</button>
      <button className="btn ghost" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh drafts</button>
      <p>{hasBackend ? 'Canonical drafts require a current server decision and exact coach review below.' : 'Local drafts are stored separately from Classic prescriptions and have no server authority.'}</p>
      {(state?.drafts || []).map(row => <p key={row.id || row.operationKey}>{row.proposal.date} · revision {row.revision} · unassigned draft</p>)}
      {!state?.drafts?.length && <p>No saved review drafts.</p>}
    </section>
    {!loading && <PoolingApprovalReview key={`PoolingApprovalReview:${id}:${refresh}`} clientId={id} context={state?.context} drafts={state?.drafts || []} workspace={workspace} online={hasBackend} onRefresh={()=>setRefresh(value=>value+1)}/>}
    <PoolingSuggestions key={`PoolingSuggestions:${id}:${refresh}`} clientId={id} context={state?.context} drafts={state?.drafts || []} workspace={workspace} online={hasBackend} onRefresh={()=>setRefresh(value=>value+1)}/>
    <section className="card" aria-labelledby="health-review"><h2 id="health-review">Current health change</h2>
      <p>This is separate from optional daily wellness. A no-change answer does not clear an existing restriction.</p>
      <label htmlFor="pool-health">Client-reported change</label>
      <select id="pool-health" value={healthChange} disabled={saveStatus === 'saving' || !!pending} onChange={event => { setHealthChange(event.target.value); setSaveStatus('unsaved') }}>
        <option value="">Select an explicit response</option><option value="no_change">No change reported</option><option value="changed">A change or concern was reported</option><option value="declined">Client declined to answer</option>
      </select>
      <button className="btn" disabled={!hasBackend || !healthChange || saveStatus === 'saving'} onClick={report}>{pending ? 'Retry same report' : 'Save attributed report'}</button>
      <p role="status">Report status: {saveStatus.replaceAll('_',' ')}</p>
    </section>
    {policies && poolingConfig().r2 && <PoolingExtensionReview kind="daily" policy={policies.daily} requests={requests.daily} online={hasBackend} clientId={id} context={state?.context} workspace={workspace} drafts={state?.drafts} onRefresh={()=>setRefresh(value=>value+1)} onRequest={operation=>requestReview('daily',operation)} onReview={async operation=>{await reviewExtension({clientId:id,generation:state?.context?.generation,...operation});setRefresh(value=>value+1)}}/>}
    {policies && poolingConfig().r3 && <PoolingExtensionReview kind="progression" policy={policies.progression} requests={requests.progression} online={hasBackend} clientId={id} context={state?.context} workspace={workspace} drafts={state?.drafts} onRefresh={()=>setRefresh(value=>value+1)} onRequest={operation=>requestReview('progression',operation)} onReview={async operation=>{await reviewExtension({clientId:id,generation:state?.context?.generation,...operation});setRefresh(value=>value+1)}}/>}
    <PoolingSourceReview key={`PoolingSourceReview:${id}`} sources={sourceReview.sources.filter(row=>row.id)} confirmations={sourceReview.confirmations} online={hasBackend} onConfirm={async operation=>{
      await confirmPoolingSource({clientId:id,generation:state?.context?.generation || 1,...operation});setRefresh(value=>value+1)
    }} />
    {poolingConfig().r3 && <PoolingWeeklyReview key={`PoolingWeeklyReview:${id}:${refresh}`} clientId={id} context={state?.context} workspace={workspace} drafts={state?.drafts || []} online={hasBackend} onRefresh={()=>setRefresh(value=>value+1)}/>}
    {poolingConfig().r3 && <PoolingReassessment key={`PoolingReassessment:${id}`} clientId={id} online={hasBackend}/>}
    <PoolingCatalogueAdmin key={`PoolingCatalogueAdmin:${id}`} clientId={id} online={hasBackend}/>
    <section className="card" aria-labelledby="candidate-review"><h2 id="candidate-review">Candidate catalogue review</h2>
      <label htmlFor="pool-filter">Filter by name, role or movement pattern</label><input id="pool-filter" value={filter} onChange={event => setFilter(event.target.value)} />
      <p>{filtered.length} candidate records. Eligibility: review required.</p>
      <div style={{ overflowX: 'auto' }}><table><thead><tr><th scope="col">Exercise</th><th scope="col">Roles</th><th scope="col">Equipment</th><th scope="col">Availability</th></tr></thead>
        <tbody>{filtered.map(row => <tr key={`${row.id}:${row.revision}`}><th scope="row">{row.name}</th><td>{row.roles.join(', ').replaceAll('_',' ')}</td><td>{row.equipment.length ? row.equipment.join(', ').replaceAll('_',' ') : 'No listed equipment; setup still needs confirmation'}</td><td>Unpublished · not assignable</td></tr>)}</tbody></table></div>
    </section>
  </div>
}
