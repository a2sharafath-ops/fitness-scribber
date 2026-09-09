import {useMemo} from 'react'
import {Link,useNavigate,useParams} from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import ClientSubnav from '../components/templates/ClientSubnav'
import CoachSessionPanel from '../components/organisms/workout/CoachSessionPanel'
import ConcernCard from '../components/molecules/ConcernCard'
import ConcernForm from '../components/organisms/forms/ConcernForm'
import {QuickLogMenu} from '../components/organisms/forms/LogForms'
import {useData} from '../store/DataContext'
import {useModal} from '../store/ModalContext'
import usePoolingRuntime from '../hooks/usePoolingRuntime'
import useGovernedWorkout from '../hooks/useGovernedWorkout'
import {baselineProgress,forClient} from '../lib/assessment'
import {latestOf,readinessFor} from '../lib/calc'
import {todayISO} from '../lib/dates'
import {confirmDialog,promptDialog,toast} from '../lib/toast'

function SummaryItem({label,value,help}){return <div className="coach-summary-item"><span>{label}</span><strong>{value}</strong>{help&&<small>{help}</small>}</div>}

export default function CoachClientPage(){
 const {id}=useParams(),navigate=useNavigate(),{db,tz,commit}=useData(),{openModal}=useModal(),client=db.clients.find(item=>item.id===id),runtime=usePoolingRuntime(id),workflow=useGovernedWorkout(id,runtime.governed||runtime.development,runtime.r1),today=todayISO(tz)
 const wellness=client?latestOf(db.wellness,client.id):null,wearable=client?latestOf(db.wearable,client.id):null,progress=client?baselineProgress(forClient(db.assessments,client.id)):null,readiness=readinessFor(db,id)
 const concerns=useMemo(()=>db.concerns.filter(item=>item.clientId===id&&item.status==='Open'),[db.concerns,id])
 const next=workflow.assignments.filter(item=>item.date>=today&&!['complete','stop'].includes(item.status)).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0]
 const resolveConcern=async concern=>{const note=await promptDialog({title:'Resolve concern',message:'Add an optional note about the resolution.',multiline:true,confirmLabel:'Mark resolved'});if(note===null)return;commit(data=>{const row=data.concerns.find(item=>item.id===concern.id);if(row){row.status='Resolved';row.resolution=note.trim()}});toast('Concern resolved')}
 const deleteConcern=async concern=>{if(!await confirmDialog({title:'Delete concern',message:'Delete this concern? This cannot be undone.',confirmLabel:'Delete',danger:true}))return;commit(data=>{data.concerns=data.concerns.filter(item=>item.id!==concern.id)});toast('Concern deleted')}
 if(!client)return <div className="coach-empty"><h1>Client not found</h1><Button onClick={()=>navigate('/clients')}>Back to clients</Button></div>
 return <div className="coach-page">
  <div className="coach-client-hero"><div className="coach-client-identity"><Avatar name={client.name} size={62}/><div><Link className="coach-back" to="/clients">← Clients</Link><h1>{client.name}</h1><p>{client.goal||'Goal not added'} · {client.level||'Level not added'}</p></div></div><div className="coach-hero-actions"><Button variant="ghost" onClick={()=>navigate('/messages')}>Message</Button><Button onClick={()=>navigate(concerns.length?'#concerns':`/clients/${id}/pool`)}>{concerns.length?'Review concern':next?'Create another workout':'Create workout'}</Button></div></div>
  <ClientSubnav client={client}/>
  <section className="coach-recommendation"><div><p className="coach-eyebrow">Recommended next step</p><h2>{concerns.length?`Review ${concerns.length} open concern${concerns.length===1?'':'s'}`:progress.done<progress.total?'Complete the baseline assessment':next?'Open the next workout':'Prepare the first workout'}</h2><p>{concerns.length?'Check the concern before preparing or starting another workout.':progress.done<progress.total?`${progress.done} of ${progress.total} assessment sections are complete.`:next?`${next.date} · ${next.blocks.length} exercises assigned`:'Use the client’s existing information to prepare a workout.'}</p></div><Button onClick={()=>navigate(concerns.length?'#concerns':progress.done<progress.total?`/clients/${id}/assessments`:next?'#workouts':`/clients/${id}/pool`)}>{concerns.length?'Review concerns':progress.done<progress.total?'Continue assessment':next?'Open workout':'Create workout'}</Button></section>
  <div className="coach-summary-grid"><SummaryItem label="Current readiness" value={readiness.label.includes('—')?readiness.label.split('—').pop().trim():readiness.label} help="Based on available check-ins"/><SummaryItem label="Latest sleep" value={wellness?`${wellness.sleep}/7`:'Not recorded'} help={wellness?.date}/><SummaryItem label="Latest stress" value={wellness?`${wellness.stress}/7`:'Not recorded'} help={wellness?.date}/><SummaryItem label="Resting heart rate" value={wearable?`${wearable.rhr} bpm`:'Not connected'} help={wearable?.date}/></div>
  <div className="coach-client-columns"><section className="coach-card"><div className="coach-card-head"><div><p className="coach-eyebrow">Client information</p><h2>Coaching summary</h2></div><Link className="coach-text-button" to={`/clients/${id}/profile`}>View details</Link></div><dl className="coach-profile-list"><div><dt>Goal</dt><dd>{client.goal||'Not added'}</dd></div><div><dt>Experience</dt><dd>{client.level||'Not added'}</dd></div><div><dt>Email</dt><dd>{client.email||'Not added'}</dd></div><div><dt>Phone</dt><dd>{client.phone||'Not added'}</dd></div></dl><div className="coach-card-actions"><Link className="btn ghost" to={`/clients/${id}/assessments`}>Assessments</Link><button className="btn ghost" onClick={()=>openModal(<QuickLogMenu clientId={id}/>)}>Record information</button></div></section>
   <section className="coach-card"><div className="coach-card-head"><div><p className="coach-eyebrow">Assessment</p><h2>Baseline progress</h2></div><strong>{progress.done}/{progress.total}</strong></div><div className="coach-progress" aria-label={`${progress.done} of ${progress.total} assessment sections complete`}><span style={{width:`${progress.total?progress.done/progress.total*100:0}%`}}/></div><p>{progress.done===progress.total?'Baseline assessment is complete. Review it when the client’s situation changes.':`${progress.missing.length} section${progress.missing.length===1?'':'s'} still need information.`}</p><Link className="btn ghost" to={`/clients/${id}/assessments`}>{progress.done===progress.total?'Review assessment':'Continue assessment'}</Link></section></div>
  {(runtime.governed||runtime.development)&&<CoachSessionPanel workflow={workflow} today={today}/>} 
  <section className="coach-card" id="concerns"><div className="coach-card-head"><div><p className="coach-eyebrow">Follow-up</p><h2>Concerns</h2></div><button className="btn ghost" onClick={()=>openModal(<ConcernForm clientId={id}/>)}><Icon name="flag" size={14}/> Add concern</button></div>{concerns.length?concerns.map(item=><ConcernCard key={item.id} concern={item} clientName={client.name} onResolve={()=>resolveConcern(item)} onEdit={()=>openModal(<ConcernForm concern={item}/>)} onDelete={()=>deleteConcern(item)}/>):<div className="coach-empty-state"><strong>No open concerns</strong><p>Add one when something needs follow-up.</p></div>}</section>
 </div>
}
