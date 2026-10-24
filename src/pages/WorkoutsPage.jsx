import { useState } from 'react'
import ProgramsLibrary from '../components/organisms/program/ProgramsLibrary'
import Button from '../components/atoms/Button'
import ExerciseThumb from '../components/molecules/ExerciseThumb'
import { ExerciseForm } from '../components/organisms/forms/WorkoutForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { confirmDialog } from '../lib/toast'
import { muscleTargets } from '../lib/muscleVolume'
import { matchesExerciseSearch, exerciseSearchRank, exerciseSuggestionDescription } from '../lib/exerciseSearch'

export default function WorkoutsPage() {
  const { db } = useData()
  const { openModal } = useModal()
  const [programDirty, setProgramDirty] = useState(false)
  const [tab, setTab] = useState('programs')
  const [search, setSearch] = useState('')
  const [mappingFilter, setMappingFilter] = useState('all')
  const [equipmentFilter, setEquipmentFilter] = useState('all')
  const equipmentOptions = [...new Set(db.exercises.map(exercise => exercise.equip).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const mappingState = (e) => e.mode === 'SMR' || e.mode === 'Stretch' ? 'mobility' : muscleTargets(e).direct.length ? 'mapped' : 'review'
  const visibleExercises = db.exercises.filter((e) =>
    matchesExerciseSearch({ ...e, muscleTargets: muscleTargets(e) }, search) &&
    (mappingFilter === 'all' || mappingState(e) === mappingFilter) &&
    (equipmentFilter === 'all' || e.equip === equipmentFilter)).sort((a, b) => exerciseSearchRank(a, search) - exerciseSearchRank(b, search) || a.name.localeCompare(b.name))
  const mappedCount = db.exercises.filter((e) => mappingState(e) === 'mapped').length
  const reviewCount = db.exercises.filter((e) => mappingState(e) === 'review').length

  return (
    <>
      <div className="topbar">
        <div><h1>Workouts</h1></div>
        {tab === 'lib' && <Button onClick={() => openModal(<ExerciseForm />)}>＋ New Exercise</Button>}
      </div>
      <div className="tabs">
        <button className={'tab' + (tab === 'programs' ? ' active' : '')} onClick={() => setTab('programs')}>Programs</button>
        <button className={'tab' + (tab === 'lib' ? ' active' : '')} onClick={async () => { if (!programDirty || await confirmDialog('Discard unsaved program changes?')) setTab('lib') }}>Exercise Library</button>
      </div>

      {tab === 'programs' ? (
        <ProgramsLibrary onDirtyChange={setProgramDirty} />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="exercise-library-tools"><div><h2>Exercise Library</h2><p>{visibleExercises.length} of {db.exercises.length} exercises · {mappedCount} with muscles assigned · {reviewCount} need review</p></div><label>Find exercise<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, alternate name, muscle or equipment" /></label><label>Equipment<select value={equipmentFilter} onChange={e => setEquipmentFilter(e.target.value)}><option value="all">All equipment</option>{equipmentOptions.map(equipment => <option key={equipment}>{equipment}</option>)}</select></label><label>Show<select value={mappingFilter} onChange={(e) => setMappingFilter(e.target.value)}><option value="all">All exercises</option><option value="mapped">Muscles assigned</option><option value="review">Needs review</option><option value="mobility">Mobility</option></select></label></div>
          <div className="exercise-library-scroll" role="region" aria-label="Exercise library; scroll horizontally for more columns" tabIndex={0}><table>
            <caption className="sr-only">Exercise library muscle assignments</caption>
            <thead><tr><th scope="col">Demo</th><th scope="col">Exercise</th><th scope="col">Direct muscles</th><th scope="col">Assisting muscles</th><th scope="col">Equipment</th><th scope="col">Assignment</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {visibleExercises.map((e) => {
                const aliasDescription = search.trim() ? exerciseSuggestionDescription(e, search) : ''
                return (
                <tr key={e.id}>
                  <td style={{ width: 110 }}><ExerciseThumb exercise={e} size="sm" /></td>
                  <th scope="row"><strong>{e.name}</strong>{aliasDescription && <small className="exercise-alias">{aliasDescription}</small>}</th>
                  <td>{muscleTargets(e).direct.join(', ') || '—'}</td>
                  <td>{muscleTargets(e).indirect.join(', ') || '—'}</td>
                  <td className="muted">{e.equip}</td>
                  <td>{mappingState(e) === 'mobility' ? 'Mobility' : mappingState(e) === 'review' ? 'Needs review' : e.muscleTargets?.source === 'coach' ? 'Coach assigned' : e.muscleTargets?.source === 'catalog' ? 'Library assigned' : 'Muscles assigned'}</td>
                  <td style={{ textAlign: 'right' }}><Button variant="ghost" size="sm" onClick={() => openModal(<ExerciseForm exercise={e} />)}>Edit</Button></td></tr>
              )})}
              {!visibleExercises.length && <tr><td colSpan={7}>No exercises match this filter.</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}
    </>
  )
}
