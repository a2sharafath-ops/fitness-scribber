import React,{useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {supabase} from '../../src/lib/supabase'
import {readPendingOperations,retryPendingOperation,saveRecoverableBuilderDraft} from '../../src/api/pooling'
import '../../src/index.css'
export function Controls(){
 const [status,setStatus]=useState(null),[actor,setActor]=useState(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[result,setResult]=useState(''),[pending,setPending]=useState([])
 const run=async action=>{try{setResult(JSON.stringify(await action()))}catch(e){setResult(JSON.stringify({error:e.message,code:e.code}))}}
 const control=async action=>{const r=await fetch('/__a33/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});const data=await r.json();setStatus(data);return data}
 useEffect(()=>{control('status');supabase.auth.getSession().then(({data})=>setActor(data.session?.user?.id??null));const {data}=supabase.auth.onAuthStateChange((_event,s)=>setActor(s?.user?.id??null));return()=>data.subscription.unsubscribe()},[])
 const workspace=status?.workspaces.find(w=>w.coachId===actor&&w.slot===1)
 const loadPending=async()=>{const rows=await readPendingOperations(workspace.clientId);setPending(rows);return rows.map(r=>({kind:r.kind,key:r.operationKey,scope:r.scope}))}
 return <main style={{maxWidth:900,padding:24,margin:'auto'}}><h1>Private A33 fictional test controls</h1><p>No real clients. Real provider authentication and database; only transport faults are injected.</p>
 <p>Current authenticated actor: {actor||'signed out'}</p>
 <label>Email<input autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)}/></label>
 <button onClick={()=>run(async()=>{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;setPassword('');return {signedIn:data.user.id}})}>Authenticate account</button>{' '}
 <button onClick={()=>run(async()=>{const {data,error}=await supabase.auth.refreshSession();if(error)throw error;return {refreshed:true,actor:data.user.id,expiresAt:data.session.expires_at}})}>Refresh real provider session</button>{' '}
 <button onClick={()=>run(async()=>{const {error}=await supabase.auth.signOut();if(error)throw error;return {signedOut:true}})}>Sign out globally</button>
 <h2>Transport faults</h2>{['status','normal','drop_review','drop_draft','offline_draft','hold_draft','release','expired_draft','verify','expiry'].map(action=><button style={{margin:4}} key={action} onClick={()=>run(()=>control(action))}>{action}</button>)}
 <h2>Original scoped operation</h2><button disabled={!workspace} onClick={()=>run(async()=>{const r=await fetch('/__a33/pending-fixture');const f=await r.json();const target=f.find(x=>x.coachId===actor);if(!target)throw Error('Fictional actor required');return saveRecoverableBuilderDraft(target.request)})}>Submit fictional pending draft</button>{' '}
 <button disabled={!workspace} onClick={()=>run(loadPending)}>Read own pending journal</button>
 {pending.map(r=><div key={r.operationKey}><p>{r.kind} · {r.scope}</p><button onClick={()=>run(async()=>{const result=await retryPendingOperation(r);await loadPending();return result})}>Reconcile {r.kind}</button></div>)}
 <h2>Fixture links</h2>{status?.workspaces.map(w=><p key={w.clientId}>{w.label} slot {w.slot}: <a href={`/clients/${w.clientId}/pool`}>Open {w.label} slot {w.slot} pool</a></p>)}
 <p role="status" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{result}</p>
 <h2>Sanitized evidence</h2><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(status,null,2)}</pre>
 </main>
}
createRoot(document.getElementById('root')).render(<Controls/> )
