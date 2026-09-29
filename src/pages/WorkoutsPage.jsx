import { useState } from 'react'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import ExerciseThumb from '../components/molecules/ExerciseThumb'
import { ExerciseForm, PlanForm } from '../components/organisms/forms/WorkoutForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { muscleTargets } from '../lib/muscleVolume'

export default function WorkoutsPage() {
  const { db } = useData()
  const { openModal } = useModal()
  const [tab, setTab] = useState('plans')
  const [search, setSearch] = useState('')
  const [mappingFilter, setMappingFilter] = useState('all')
  const mappingState = (e) => e.mode === 'SMR' || e.mode === 'Stretch' ? 'mobility' : muscleTargets(e).direct.length ? 'mapped' : 'review'
  const visibleExercises = db.exercises.filter((e) =>
    (!search || `${e.name} ${e.muscle} ${muscleTargets(e).direct.join(' ')} ${muscleTargets(e).indirect.join(' ')}`.toLowerCase().includes(search.toLowerCase())) &&
    (mappingFilter === 'all' || mappingState(e) === mappingFilter))
  const mappedCount = db.exercises.filter((e) => mappingState(e) === 'mapped').length
  const reviewCount = db.exercises.filter((e) => mappingState(e) === 'review').length
  const exName = (id) => db.exercises.find((e) => e.id === id)?.name || '?'
  const exMuscle = (id) => db.exercises.find((e) => e.id === id)?.muscle || ''

  return (
    <>
      <div className="topbar">
        <div><h1>Workouts</h1><div className="sub">{db.plans.length} plans · {db.exercises.length} exercises</div></div>
        {tab === 'plans'
          ? <Button onClick={() => openModal(<PlanForm />, true)}>＋ New Plan</Button>
          : <Button onClick={() => openModal(<ExerciseForm />)}>＋ New Exercise</Button>}
      </div>
      <div className="tabs">
        <button className={'tab' + (tab === 'plans' ? ' active' : '')} onClick={() => setTab('plans')}>Workout Plans</button>
        <button className={'tab' + (tab === 'lib' ? ' active' : '')} onClick={() => setTab('lib')}>Exercise Library</button>
      </div>

      {tab === 'plans' ? (
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
                      <Tag color="gray">{exMuscle(it.exId)}</Tag></div>
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
          <div className="exercise-library-tools"><div><h2>Exercise muscles</h2><p>{mappedCount} mapped · {reviewCount} need review. Direct and assisting labels describe movement roles, not measured muscle force.</p></div><label>Find exercise<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or muscle" /></label><label>Show<select value={mappingFilter} onChange={(e) => setMappingFilter(e.target.value)}><option value="all">All exercises</option><option value="mapped">Mapped</option><option value="review">Needs review</option><option value="mobility">Mobility</option></select></label></div>
          <div className="exercise-library-scroll" role="region" aria-label="Exercise library; scroll horizontally for more columns" tabIndex={0}><table>
            <caption className="sr-only">Exercise library muscle assignments</caption>
            <thead><tr><th scope="col">Demo</th><th scope="col">Exercise</th><th scope="col">Direct muscles</th><th scope="col">Assisting muscles</th><th scope="col">Equipment</th><th scope="col">Mapping</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {visibleExercises.map((e) => (
                <tr key={e.id}>
                  <td style={{ width: 110 }}><ExerciseThumb exercise={e} size="sm" /></td>
                  <th scope="row"><strong>{e.name}</strong></th>
                  <td>{muscleTargets(e).direct.join(', ') || '—'}</td>
                  <td>{muscleTargets(e).indirect.join(', ') || '—'}</td>
                  <td className="muted">{e.equip}</td>
                  <td>{mappingState(e) === 'mobility' ? 'Mobility · no working-set mapping' : mappingState(e) === 'review' ? 'Needs review' : e.muscleTargets?.source === 'coach' ? 'Coach edited' : e.muscleTargets?.source === 'catalog' ? 'Catalog mapping' : 'Mapped'}</td>
                  <td style={{ textAlign: 'right' }}><Button variant="ghost" size="sm" onClick={() => openModal(<ExerciseForm exercise={e} />)}>Edit</Button></td></tr>
              ))}
              {!visibleExercises.length && <tr><td colSpan={7}>No exercises match this filter.</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}
    </>
  )
}
