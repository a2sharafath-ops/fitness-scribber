const fields=[['sets','Sets'],['mode','Mode'],['reps','Repetitions'],['sideMultiplier','Sides'],['loadKg','Load (kg)'],['workSeconds','Work per set (seconds)'],['restSeconds','Rest (seconds)'],['setupSeconds','Setup (seconds)'],['transitionSeconds','Transition (seconds)'],['durationSeconds','Total duration (seconds)']]
const value=v=>v===null||v===undefined?'Not specified':String(v)
export default function PoolingPrescriptionDiff({changes=[]}) {
 if(!changes.length)return null
 return <section aria-label="Exact prescription comparison"><h3>Original and proposed prescription</h3>
  <p>These are the exact reviewed-dose values. The original assignment is unchanged; accepting creates an unassigned draft.</p>
  {changes.map(change=><div key={change.occurrenceId} style={{overflowX:'auto'}}><table><caption>Occurrence {change.occurrenceId}</caption>
   <thead><tr><th scope="col">Field</th><th scope="col">Original</th><th scope="col">Proposed</th></tr></thead>
   <tbody>{fields.map(([key,label])=><tr key={key}><th scope="row">{label}</th><td>{value(change.from?.[key])}</td><td>{value(change.to?.[key])}{change.from?.[key]!==change.to?.[key]?' (changed)':''}</td></tr>)}</tbody>
  </table></div>)}
 </section>
}
