import {Link} from 'react-router-dom'
export default function PoolingSessionList({sessions,clients,title='Client workouts',clientId}) {
 const rows=sessions.rows.filter(r=>!clientId||r.clientId===clientId)
 return <section className="card"><div className="flex between"><h2>{title}</h2><button className="btn ghost" onClick={sessions.refresh}>Refresh client workouts</button></div>
  {sessions.loading&&<p role="status">Loading client workouts…</p>}{sessions.error&&<p role="alert">{sessions.error}</p>}
  {!sessions.loading&&!sessions.error&&!rows.length&&<p>No approved pooling workouts yet. Open a client, choose Exercise Pool and generate a workout for review.</p>}
  <div style={{overflowX:'auto'}}><table><thead><tr><th>Client</th><th>Date</th><th>Workout</th><th>Status</th><th>Results</th><th>Open</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{clients.find(c=>c.id===row.clientId)?.name||'Client'}</td><td>{row.date}</td><td>{row.blocks.map(b=>b.exerciseName||b.exerciseId).join(' · ')}</td><td>{row.status}{row.stale&&!['stop','complete'].includes(row.status)?' · needs current review':''}</td><td>{row.actuals.filter(a=>!row.actuals.some(c=>c.supersedes===a.id)).length} recorded sets</td><td><Link className="btn ghost" style={{whiteSpace:'nowrap'}} to={`/clients/${row.clientId}#governed-workouts`}>Session &amp; results</Link></td></tr>)}</tbody></table></div>
 </section>
}
