import {useEffect,useState} from 'react'
import PoolingBudgetNotice from '../../molecules/PoolingBudgetNotice'
import {generateSuggestion,readSuggestions,readPendingOperations} from '../../../api/pooling'
export default function PoolingSuggestions({clientId,context,drafts,workspace,online,onRefresh}){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[target,setTarget]=useState(''),[occurrence,setOccurrence]=useState(''),[alternative,setAlternative]=useState('')
 const draft=drafts.find(d=>d.id===Number(target)),doc=workspace.manifests?.find(m=>m.id===draft?.proposal.manifestId)?.document
 const original=draft?.proposal.selection?.find(s=>s.occurrenceId===occurrence),record=doc?.catalogue.find(e=>e.id===original?.exerciseId && e.revision===original?.exerciseRevision)
 const alternatives=record?.familyId && record.laterality?doc.catalogue.filter(e=>e.id!==record.id && e.familyId===record.familyId && e.laterality===record.laterality):[]
 useEffect(()=>{let active=true;if(online)readSuggestions(clientId).then(data=>{if(active)setRows(data)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[clientId,online,context?.generation])
 async function generate(mode){setBusy(true);setError('');try{
  if((await readPendingOperations(clientId)).some(r=>r.kind==='suggestion'))throw Error('Reconcile the existing suggestion operation before generating another.')
  const receipt=await generateSuggestion({clientId,draftId:draft.id,generation:context.generation,operationKey:crypto.randomUUID(),mode,...(mode==='swap'?{occurrenceId:occurrence,exerciseId:alternative}:{})})
  setStatus(receipt.draftId?`New unassigned draft ${receipt.draftId}. Review its full diff and validate it before approval.`:`Review ${receipt.id} saved with required gaps; no draft assigned.`);setRows(await readSuggestions(clientId));onRefresh()
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="card" aria-labelledby="pool-suggestions-title"><h2 id="pool-suggestions-title" tabIndex={-1}>Generate a pool draft or compatible swap</h2><p>Uses the selected session's confirmed sources and published exercise/dose revisions. Required gaps stay visible; pins, convenience and preferences cannot override exclusions.</p>
  <label htmlFor="suggestion-draft">Session inputs or canonical draft</label><select id="suggestion-draft" disabled={!online || busy} value={target} onChange={e=>{setTarget(e.target.value);setOccurrence('');setAlternative('')}}><option value="">Choose a current draft</option>{drafts.filter(d=>d.id && d.proposal.manifestId && !drafts.some(c=>c.parent_id===d.id)).map(d=><option key={d.id} value={d.id}>{d.proposal.date} · draft {d.id}</option>)}</select>
  <button className="btn" disabled={!online || busy || !draft} onClick={()=>generate('generate')}>Generate unassigned pool draft</button>
  <details><summary>Swap one occurrence within compatible boundaries</summary><label htmlFor="suggestion-occurrence">Occurrence to replace</label><select id="suggestion-occurrence" value={occurrence} disabled={busy || !draft} onChange={e=>{setOccurrence(e.target.value);setAlternative('')}}><option value="">Choose occurrence</option>{draft?.proposal.selection?.map(s=><option key={s.occurrenceId} value={s.occurrenceId}>{s.role} · {s.exerciseId}</option>)}</select>
   <label htmlFor="suggestion-alternative">Candidate in the same family and laterality</label><select id="suggestion-alternative" value={alternative} disabled={busy || !occurrence} onChange={e=>setAlternative(e.target.value)}><option value="">Choose candidate for server revalidation</option>{alternatives.map(e=><option key={e.id} value={e.id}>{e.name || e.id}</option>)}</select>
   <p>Family similarity is not clearance. The complete replacement dose, session coverage and budget are revalidated.</p><button className="btn ghost" disabled={!online || busy || !alternative} onClick={()=>generate('swap')}>Propose reviewed swap</button>
  </details>
  {rows.map(r=><details key={r.id}><summary>Suggestion {r.id} · {r.result.completeness} · {r.draft_id?`draft ${r.draft_id}`:'no ready draft'}</summary><PoolingBudgetNotice result={r.result}/><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(r.result,null,2)}</pre></details>)}
  {status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
 </section>
}
