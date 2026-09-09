import {Link} from 'react-router-dom'
import {coachSessionStatus} from '../../../lib/pooling/coach-view'
export default function PoolingSessionList({sessions,clients,title='Client workouts',clientId}) {
 const rows=sessions.rows.filter(r=>!clientId||r.clientId===clientId)
 return <section className="coach-card"><div className="coach-card-head"><div><p className="coach-eyebrow">Assigned and completed</p><h2>{title}</h2></div><button className="coach-text-button" onClick={sessions.refresh}>Refresh</button></div>
  {sessions.loading&&<p role="status">Loading client workouts…</p>}{sessions.error&&<p role="alert">{sessions.error}</p>}
  {!sessions.loading&&!sessions.error&&!rows.length&&<div className="coach-empty-state"><strong>No workouts yet</strong><p>Choose a client, prepare their workout and approve it.</p>{!clientId&&<Link className="btn" to="/clients">Choose a client</Link>}</div>}
  <div className="coach-workout-list">{rows.map(row=>{const client=clients.find(c=>c.id===row.clientId),status=coachSessionStatus(row);return <article key={row.id}><div><strong>{client?.name||'Client'}</strong><span>{row.date} · {row.blocks.length} exercises</span><small>{row.blocks.slice(0,3).map(block=>block.exerciseName||'Exercise').join(' · ')}{row.blocks.length>3?' · …':''}</small></div><span className={`coach-status ${status.tone}`}>{status.label}</span><Link className="btn ghost" to={`/clients/${row.clientId}#workouts`}>{status.action}</Link></article>})}</div>
 </section>
}
