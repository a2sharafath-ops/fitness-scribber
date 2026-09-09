import {useNavigate} from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import Avatar from '../components/atoms/Avatar'
import BulkWellnessForm from '../components/organisms/forms/BulkWellnessForm'
import SessionForm from '../components/organisms/forms/SessionForm'
import {ClientForm} from '../components/organisms/forms/ClientForms'
import {useData} from '../store/DataContext'
import {useModal} from '../store/ModalContext'
import useCoachSessions from '../hooks/useCoachSessions'
import {todayISO} from '../lib/dates'
import {openConcerns} from '../lib/calc'
import {baselineProgress,forClient} from '../lib/assessment'
import {coachSessionStatus} from '../lib/pooling/coach-view'

function Task({tone='neutral',title,description,action,onClick}){
 return <button className={`coach-task ${tone}`} onClick={onClick}><span className="coach-task-mark" aria-hidden="true"/><span><strong>{title}</strong><small>{description}</small></span><span className="coach-task-action">{action} →</span></button>
}

export default function CoachDashboardPage(){
 const {db,tz}=useData(),{openModal}=useModal(),navigate=useNavigate(),pooling=useCoachSessions(),today=todayISO(tz)
 const firstName=(db.settings?.trainerName||'Coach').trim().split(/\s+/)[0]
 const legacyToday=db.sessions.filter(row=>row.date===today)
 const pooledToday=pooling.rows.filter(row=>row.date===today)
 const open=openConcerns(db)
 const tasks=[]
 for(const concern of open){const client=db.clients.find(item=>item.id===concern.clientId);if(client)tasks.push({tone:concern.severity==='High'?'urgent':'attention',title:`Review ${client.name}’s concern`,description:concern.category||'A concern needs follow-up',action:'Open',to:`/clients/${client.id}`})}
 for(const client of db.clients.filter(item=>item.status==='Active')){
  const progress=baselineProgress(forClient(db.assessments,client.id))
  if(progress.done<progress.total)tasks.push({tone:'neutral',title:`Finish ${client.name}’s assessment`,description:`${progress.done} of ${progress.total} baseline sections complete`,action:'Continue',to:`/clients/${client.id}/assessments`})
  const future=pooling.rows.find(row=>row.clientId===client.id&&row.date>=today&&!['complete','stop'].includes(row.status))
  if(!future&&!client.planId)tasks.push({tone:'neutral',title:`Prepare ${client.name}’s next workout`,description:'No upcoming workout is assigned',action:'Create',to:`/clients/${client.id}/pool`})
 }
 const schedule=[...legacyToday.map(row=>({...row,kind:'appointment'})),...pooledToday.map(row=>({...row,kind:'workout'}))].sort((a,b)=>String(a.time||a.sessionAt||'').localeCompare(String(b.time||b.sessionAt||'')))
 const attentionClients=new Set(tasks.map(task=>task.to.split('/')[2]).filter(Boolean)).size
 const dateLabel=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})
 return <div className="coach-page">
  <div className="coach-welcome"><div><p className="coach-eyebrow">{dateLabel}</p><h1>Good day, {firstName}</h1><p>Here’s what needs your attention today.</p></div><Button onClick={()=>navigate('/clients')}>Choose a client</Button></div>
  <div className="coach-overview">
   <button onClick={()=>navigate('/clients')}><span className="coach-overview-icon blue"><Icon name="users"/></span><strong>{db.clients.filter(item=>item.status==='Active').length}</strong><small>Active clients</small></button>
   <button onClick={()=>navigate('/schedule')}><span className="coach-overview-icon purple"><Icon name="calendar"/></span><strong>{schedule.length}</strong><small>Items today</small></button>
   <button onClick={()=>navigate('/clients')}><span className="coach-overview-icon amber"><Icon name="alert"/></span><strong>{attentionClients}</strong><small>Clients needing attention</small></button>
  </div>
  <div className="coach-dashboard-grid">
   <section className="coach-card"><div className="coach-card-head"><div><p className="coach-eyebrow">Priority</p><h2>What to do next</h2></div><span className="coach-count">{tasks.length}</span></div>
    <div className="coach-task-list">{tasks.length?tasks.slice(0,6).map((task,index)=><Task key={`${task.to}:${index}`} {...task} onClick={()=>navigate(task.to)}/>):<div className="coach-empty-state"><Icon name="check" size={30}/><strong>You’re all caught up</strong><p>No client follow-ups need attention right now.</p></div>}</div>
   </section>
   <section className="coach-card"><div className="coach-card-head"><div><p className="coach-eyebrow">Today</p><h2>Schedule and workouts</h2></div><button className="coach-text-button" onClick={()=>navigate('/schedule')}>View calendar</button></div>
    <div className="coach-day-list">{schedule.length?schedule.slice(0,6).map(item=>{const client=db.clients.find(row=>row.id===item.clientId),status=item.kind==='workout'?coachSessionStatus(item,today):{label:item.status||'Scheduled',tone:'neutral'};return <button key={`${item.kind}:${item.id}`} onClick={()=>item.kind==='workout'?navigate(`/clients/${item.clientId}#workouts`):openModal(<SessionForm session={item}/>) }><Avatar name={client?.name||'Client'} size={38}/><span><strong>{client?.name||'Client'}</strong><small>{item.kind==='workout'?'Workout':item.type} · {item.time||'Time in workout details'}</small></span><em className={`coach-status ${status.tone}`}>{status.label}</em></button>}):<div className="coach-empty-state"><Icon name="calendar" size={30}/><strong>Nothing scheduled today</strong><p>Choose a client to prepare a workout, or book a coaching session.</p></div>}</div>
   </section>
  </div>
  <section className="coach-card"><div className="coach-card-head"><div><p className="coach-eyebrow">Common actions</p><h2>What would you like to do?</h2></div></div><div className="coach-quick-actions">
   <button onClick={()=>openModal(<ClientForm/>)}><Icon name="users"/><span><strong>Add a client</strong><small>Create their profile</small></span></button>
   <button onClick={()=>navigate('/clients')}><Icon name="dumbbell"/><span><strong>Create a workout</strong><small>Choose a client first</small></span></button>
   <button onClick={()=>openModal(<SessionForm/>)}><Icon name="calendar"/><span><strong>Book a session</strong><small>Add it to the calendar</small></span></button>
   <button onClick={()=>openModal(<BulkWellnessForm/>,true)}><Icon name="clipboard"/><span><strong>Record check-ins</strong><small>Update client wellness</small></span></button>
  </div></section>
  {pooling.error&&<p className="coach-inline-warning" role="alert">Workout updates could not be loaded. Other client information is still available.</p>}
 </div>
}
