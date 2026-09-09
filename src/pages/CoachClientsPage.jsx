import {useMemo,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import {ClientForm} from '../components/organisms/forms/ClientForms'
import {useData} from '../store/DataContext'
import {useModal} from '../store/ModalContext'
import useCoachSessions from '../hooks/useCoachSessions'
import {todayISO} from '../lib/dates'
import {openConcerns} from '../lib/calc'
import {coachSessionStatus} from '../lib/pooling/coach-view'

export default function CoachClientsPage(){
 const {db,tz}=useData(),{openModal}=useModal(),navigate=useNavigate(),sessions=useCoachSessions(),[query,setQuery]=useState(''),[filter,setFilter]=useState('active'),today=todayISO(tz)
 const rows=useMemo(()=>db.clients.map(client=>{
  const workouts=sessions.rows.filter(row=>row.clientId===client.id).sort((a,b)=>String(b.date).localeCompare(String(a.date)))
  const next=workouts.filter(row=>row.date>=today&&!['complete','stop'].includes(row.status)).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0]
  const latest=next||workouts[0],status=coachSessionStatus(latest,today),concerns=openConcerns(db,client.id).length
  return {client,next,latest,status,concerns}
 }),[db,sessions.rows,today])
 const filtered=rows.filter(row=>(filter==='all'||filter==='active'&&row.client.status==='Active'||filter==='attention'&&(row.concerns||row.status.tone==='attention'))&&`${row.client.name} ${row.client.email||''} ${row.client.goal||''}`.toLowerCase().includes(query.trim().toLowerCase()))
 return <div className="coach-page">
  <div className="topbar"><div><p className="coach-eyebrow">People you coach</p><h1>Clients</h1><p className="sub">Open a client to see their next step, assessments and workouts.</p></div><Button onClick={()=>openModal(<ClientForm/>)}>Add client</Button></div>
  <div className="coach-client-tools"><div className="coach-search"><Icon name="search" size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search by client name" aria-label="Search clients"/></div><div className="coach-filter" aria-label="Filter clients">{[['active','Active'],['attention','Needs attention'],['all','All']].map(([value,label])=><button key={value} className={filter===value?'selected':''} onClick={()=>setFilter(value)}>{label}</button>)}</div></div>
  <div className="coach-client-list">{filtered.map(({client,next,status,concerns})=><article key={client.id} className="coach-client-card"><button className="coach-client-main" onClick={()=>navigate(`/clients/${client.id}`)}><Avatar name={client.name} size={48}/><span className="coach-client-name"><strong>{client.name}</strong><small>{client.goal||'Goal not added'} · {client.level||'Level not added'}</small></span><span className={`coach-status ${concerns?'attention':status.tone}`}>{concerns?`${concerns} concern${concerns===1?'':'s'}`:status.label}</span><Icon name="chevronRight"/></button><div className="coach-client-next"><span>{next?<><strong>Next workout</strong>{next.date}</>:<><strong>Next step</strong>Prepare a workout</>}</span><button className="btn ghost" onClick={()=>navigate(next?`/clients/${client.id}#workouts`:`/clients/${client.id}/pool`)}>{next?'Open workout':'Create workout'}</button></div></article>)}
   {!filtered.length&&<div className="coach-card coach-empty-state"><Icon name="users" size={34}/><strong>No clients found</strong><p>Try a different search or filter.</p></div>}
  </div>
  {sessions.error&&<p className="coach-inline-warning" role="alert">Workout status is temporarily unavailable. Client profiles are still accessible.</p>}
 </div>
}
