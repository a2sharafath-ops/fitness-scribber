import { useState } from 'react'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import ExerciseThumb from '../components/molecules/ExerciseThumb'
import { ExerciseForm, PlanForm } from '../components/organisms/forms/WorkoutForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import {Link} from 'react-router-dom'
import useCoachSessions from '../hooks/useCoachSessions'
import PoolingSessionList from '../components/organisms/workout/PoolingSessionList'
import {poolingConfig} from '../lib/pooling/config'

const DIFF_COLOR = { Beginner: 'green', Intermediate: 'orange', Advanced: 'red' }

export default function WorkoutsPage() {
  const { db } = useData()
  const { openModal } = useModal()
  const [tab, setTab] = useState(poolingConfig().r1?'clients':'plans')
  const sessions=useCoachSessions()
  const exName = (id) => db.exercises.find((e) => e.id === id)?.name || 'Exercise unavailable'
  const exMuscle = (id) => db.exercises.find((e) => e.id === id)?.muscle || ''

  return (
    <>
      <div className="topbar">
        <div><p className="coach-eyebrow">Programming</p><h1>Workouts</h1><div className="sub">Prepare client workouts or manage reusable content.</div></div>
        {tab === 'clients'?<Link className="btn" to="/clients">Create client workout</Link>:tab === 'plans'
          ? <Button onClick={() => openModal(<PlanForm />, true)}>New template</Button>
          : <Button onClick={() => openModal(<ExerciseForm />)}>New exercise</Button>}
      </div>
      <div className="tabs">
        {poolingConfig().r1&&<button className={'tab'+(tab==='clients'?' active':'')} onClick={()=>setTab('clients')}>Client workouts</button>}
        <button className={'tab' + (tab === 'plans' ? ' active' : '')} onClick={() => setTab('plans')}>Templates</button>
        <button className={'tab' + (tab === 'lib' ? ' active' : '')} onClick={() => setTab('lib')}>Exercise Library</button>
      </div>

      {tab==='clients'?<PoolingSessionList sessions={sessions} clients={db.clients}/>:tab === 'plans' ? (
        <div className="grid cards-2">
          {db.plans.map((p) => {
            const assigned = db.clients.filter((c) => c.planId === p.id)
            return (
              <div className="card" key={p.id}>
                <div className="flex between"><div><strong style={{ fontSize: 15 }}>{p.name}</strong><div className="muted" style={{ fontSize: 12 }}>{p.desc}</div></div>
                  <Button variant="ghost" size="sm" onClick={() => openModal(<PlanForm plan={p} />, true)}>Edit</Button></div>
                <div style={{ marginTop: 12 }}>
                  {p.items.map((it, i) => (
                    <div className="ex-item" key={i}><div style={{ flex: 1 }}><strong>{exName(it.exId)}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>{it.sets} × {it.reps} · rest {it.rest}</div></div>
                      {exMuscle(it.exId)&&<Tag color="gray">{exMuscle(it.exId)}</Tag>}</div>
                  ))}
                </div>
                <div className="pill-row" style={{ marginTop: 12 }}>
                  {assigned.length ? assigned.map((c) => <Tag color="blue" key={c.id}><Avatar name={c.name} size={18} /> {c.name}</Tag>)
                    : <span className="muted" style={{ fontSize: 12 }}>Not assigned to anyone yet</span>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Demo</th><th>Exercise</th><th>Muscle group</th><th>Equipment</th><th>Difficulty</th><th /></tr></thead>
            <tbody>
              {db.exercises.map((e) => (
                <tr key={e.id}>
                  <td style={{ width: 110 }}><ExerciseThumb exercise={e} size="sm" /></td>
                  <td><strong>{e.name}</strong></td>
                  <td><Tag color="gray">{e.muscle}</Tag></td>
                  <td className="muted">{e.equip}</td>
                  <td><Tag color={DIFF_COLOR[e.difficulty] || 'gray'}>{e.difficulty || '—'}</Tag></td>
                  <td style={{ textAlign: 'right' }}><Button variant="ghost" size="sm" onClick={() => openModal(<ExerciseForm exercise={e} />)}>Edit</Button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
