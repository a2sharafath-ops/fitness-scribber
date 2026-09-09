import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {useData} from '../store/DataContext'
import {poolingConfig} from '../lib/pooling/config'
import {readTestStatus,createTestWorkspace,revokeTestWorkspace} from '../api/pooling'
import {prepareTestDrafts} from '../api/pooling-test'
import PoolingNavigation from '../components/organisms/PoolingNavigation'
import PoolingAction from '../components/molecules/PoolingAction'
import {workspaceCreateBlock} from '../lib/pooling/action-readiness'

export default function PoolingTestPage(){
 const {refresh}=useData()
 const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ack,setAck]=useState(false),[result,setResult]=useState('')
 async function load(){try{setState(await readTestStatus());setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{if(poolingConfig().r1)load()},[])
 async function run(action){setBusy(true);setError('');try{await action();await refresh();await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 if(!poolingConfig().r1)return <section className="card"><h1>Coach testing is unavailable in this build</h1><p>Use the authorized protected Preview; existing clients remain unchanged.</p></section>
 const active=state?.runtime?.r1,clientId=state?.clientId
 const setup=count=>run(async()=>{const value=await prepareTestDrafts(clientId,count);setResult(`${value.drafts.length} unassigned draft${count===1?'':'s'} prepared: ${value.drafts.map(d=>d.id).join(', ')}. Session time: ${value.sessionAt}. Open Exercise Pool, inspect these exact drafts and obtain a current decision before explicit approval.`)})
 return <div className="pooling-workspace">
  <h1>Fictional coach-testing workspace</h1>
  <p>Test-readiness update · A34. Use your own saved fictional workspace; no new account is needed.</p>
  <p>Try the new pooling workflow with your existing coach login. All exercises here are software placeholders: <strong>do not perform them or enter real client information.</strong></p>
  <p className="pooling-next-step">{!clientId ? 'Start here: read the acknowledgement under Test setup, tick it and create your fictional workspace. The other client steps unlock afterward.' : active ? 'Next: prepare one fictional session, wait for its draft ID, then open Generate & swap. Preparation already confirms the software-only source records; you do not need to fill the advanced source form again.' : 'This workspace is read-only for new testing actions. Open the fictional client to inspect preserved sessions and results.'}</p>
  <PoolingNavigation clientId={clientId} r1={!!active} r2={poolingConfig().r2&&!!state?.runtime?.r2} r3={poolingConfig().r3&&!!state?.runtime?.r3} ready={!!state||!!error}/>
  <section className="card"><h2 id="test-setup" tabIndex={-1}>Test scope and availability</h2>
   <p>Existing client records retain Classic behavior. Your test workspace is a separate, conspicuously fictional record. It does not give you clinical, publication or administrator permissions.</p>
   {state?.endsAt&&<p>Test window ends: <time dateTime={state.endsAt}>{new Date(state.endsAt).toLocaleString()} ({state.endsAt})</time>. Expiry blocks new actions; records and Stop remain available.</p>}
   {!state&&!error&&<p role="status">Checking your existing coach access…</p>}
   {error&&<p role="alert">{error}</p>}
   <button className="btn ghost" disabled={busy} onClick={load}>Refresh test availability</button>
   {!clientId&&<><label style={{display:'block',marginTop:16}}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} disabled={busy}/> I understand this is fictional software testing under my own login, not training or another person's consent.</label>
    <PoolingAction reason={workspaceCreateBlock({state,acknowledged:ack,busy,error})} onClick={()=>run(async()=>{await createTestWorkspace(true);setResult('Your new fictional workspace was created. No existing client was enrolled or changed.')})}>Create my fictional test workspace</PoolingAction></>}
   {clientId&&<><p>Workspace: {clientId}</p><p>{active?'Ready for fictional testing':state.runtime?.revoked?'Test access revoked; history retained':'Test access expired or unavailable; history retained'}. {state.runtime?.remainingWrites} test writes remain, with a reserve for stopping and preserving results.</p>
    <Link className="btn" to={`/clients/${clientId}/pool`}>Open Exercise Pool</Link>{' '}<Link className="btn ghost" to={`/clients/${clientId}`}>Open fictional client and sessions</Link></>}
  </section>
  {clientId&&<section className="card"><h2 id="test-prepare" tabIndex={-1}>Prepare an explicit software scenario</h2>
   <p>These buttons confirm backend-provided fictional sources for the current UTC date and save unassigned drafts. They do not assign sessions, complete results or clear a real client's restriction. Preparing another scenario can stale earlier drafts: finish the current test first.</p>
   <PoolingAction reason={busy?'Preparation is saving. Wait for its exact draft IDs; do not start another scenario.':!active?'This workspace is inactive or expired. Its history remains available.':''} onClick={()=>setup(1)}>Prepare one fictional session</PoolingAction>
   <PoolingAction className="btn ghost" reason={busy?'Preparation is saving. Wait for its exact draft IDs; do not start another scenario.':!active?'This workspace is inactive or expired. Its history remains available.':''} onClick={()=>setup(2)}>Prepare two fictional weekly slots</PoolingAction>
   {active&&<p><Link className="pooling-step-link" to={`/clients/${encodeURIComponent(clientId)}/pool#pool-suggestions-title`}>After preparation: open Generate &amp; swap →</Link></p>}
   {result&&<p role="status">{result}</p>}{busy&&<p role="status">Saving the fictional scenario through the backend… Do not close this page.</p>}
  </section>}
  <section className="card"><h2 id="test-walkthrough" tabIndex={-1}>Coach walkthrough</h2><ol>
   <li>Create your workspace and prepare one fictional session.</li>
   <li>Open Exercise Pool. Inspect the exact draft and source context. Generate a pool draft or swap the compatible placeholder.</li>
   <li>Validate the current draft, inspect its full dose, check the explicit review box and approve. Nothing is assigned automatically.</li>
   <li>Optional Daily adjustment comes before starting the baseline. In Validate &amp; approve, expand its assigned draft and choose Copy draft for separate review. Save a daily review question for that date, select the new unassigned copy as target, the original assignment as baseline and policy <code>fictional-daily</code>. Generate, inspect and accept with a reason. Acceptance saves an unassigned draft; it does not change or assign the baseline.</li>
   <li>Open Sessions &amp; results. For the original approved baseline, choose an explicit health-change response and start. Record zero or a small fictional seconds value, pause/resume, then stop or complete. Do not exercise. For progression testing, save both required sets with explicit effort and method <code>fictional-effort</code>.</li>
   <li>After completing the baseline, prepare a later fictional draft. In Progression, save a question for the new target date, choose that unassigned target, the completed baseline and policy <code>fictional-progression</code>. Inspect the evidence and proposed change before accepting. A missing or mismatched baseline remains a gap, not an assumed result.</li>
   <li>Prepare two weekly slots. In the weekly section choose the fictional release, <code>fictional-weekly</code>, UTC, structure <code>fictional</code>, goal <code>fictional</code>, both new drafts and explicitly no support. Validate, review both sessions and approve the batch explicitly.</li>
  </ol><p>This coach-operated scenario does not certify independent client-role or human usability acceptance. Actual catalogue, clinical, privacy and launch reviews remain separate.</p></section>
  {clientId&&<details><summary>End my testing early</summary><p>Revocation cannot be undone from this screen. New test actions stop; existing results are not deleted.</p><button className="btn ghost" disabled={!active||busy} onClick={()=>run(()=>revokeTestWorkspace(clientId))}>Revoke my test workspace</button></details>}
 </div>
}
