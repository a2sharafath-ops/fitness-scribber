import { trainingSchedule, programBookingConflicts, formatTrainingTime } from '../../../lib/trainingSchedule'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../../atoms/Button'
import BlockCard from './BlockCard'
import DayBlockReview from './DayBlockReview'
import WorkoutBuilderModal from './WorkoutBuilderModal'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { useFormat } from '../../../hooks/useFormat'
import useDragReorder from '../../../hooks/useDragReorder'
import { moveOrdered } from '../../../lib/arrange'
import { newBlock, resolveTrainingMax } from '../../../lib/program'
import { validatePrescription } from '../../../lib/prescription'
import { confirmDialog } from '../../../lib/toast'
import { uid } from '../../../lib/format'
import { addDays, fmtDate, todayISO } from '../../../lib/dates'
import { confirmedPlanWrite } from '../../../lib/confirmedPersistence'
import { isPlanTargetBlocked } from '../../../lib/planner'
import { programStarters } from '../../../lib/programStarters'
import { WEEKDAYS, createProgram, freshProgramWeek, legacyProgram, saveProgram, assignmentTargets, programConflicts, prepareAssignment, programWeekStart } from '../../../lib/programLibrary'
import './programs.css'

const ErrorMessage = ({ message }) => message ? <p className="program-error" role="alert">{message}</p> : null
const blankTm = () => ({ kg: null })

export default function ProgramsLibrary({ onDirtyChange }) {
  const { db } = useData()
  const { openModal } = useModal()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(''), [days, setDays] = useState(''), [goal, setGoal] = useState('')
  const starters = useMemo(() => programStarters(db.exercises), [db.exercises])
  const saved = db.programs || []
  const programs = [...saved, ...starters.filter(p => !saved.some(s => s.data.builtinKey === p.data.builtinKey))]
  const legacy = useMemo(() => db.plans.map(p => legacyProgram(p, db.exercises)), [db.plans, db.exercises])
  const availableLegacy = legacy.filter(p => !saved.some(s => s.data.legacyId === p.data.legacyId))
  const chosen = [...programs, ...availableLegacy].find(p => p.id === params.get('program'))
  const assignment = (db.programAssignments || []).find(a => a.id === params.get('assignment'))
  const open = p => setParams({ program: p.id, ...(params.get('clientId') ? { clientId: params.get('clientId') } : {}) })
  const back = () => setParams(params.get('clientId') ? { clientId: params.get('clientId') } : {})
  if (assignment) return <ClientProgram key={assignment.id} assignment={assignment} onBack={back} />
  if (chosen) return <ProgramEditor key={chosen.id} program={chosen} clientId={params.get('clientId')} onBack={back} onSaved={open} onDirtyChange={onDirtyChange} />
  const shown = programs.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (!days || p.data.weeks[0].length === +days) && (!goal || p.data.goal === goal))
  return <div className="programs">
    <div className="program-heading"><div><span className="program-eyebrow">Build once. Coach individually.</span><h2>Programs</h2><p>Multi-week templates, with a separate copy for each client.</p></div><Button onClick={() => openModal(<NewProgram onCreate={p => openModal(<NewProgramEditor program={p} onSaved={open} />, 'xl')} />)}>＋ New program</Button></div>
    <div className="program-filters"><label>Find a program<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search programs" /></label><label>Days per week<select value={days} onChange={e => setDays(e.target.value)}><option value="">All days</option>{[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} days</option>)}</select></label><label>Goal<select value={goal} onChange={e => setGoal(e.target.value)}><option value="">All goals</option>{[...new Set(programs.map(p => p.data.goal))].map(g => <option key={g}>{g}</option>)}</select></label></div>
    <div className="program-grid">{shown.map(p => <article className="card program-tile" key={p.id}><div className="program-tile-top"><span className="program-badge">{p.data.goal}</span><span>{p.data.weeks[0].length} days / week</span></div><h3><button className="program-title-button" onClick={() => open(p)}>{p.name}</button></h3><p>{p.data.weeks.length} weeks · {p.data.level}</p><div className="program-split">{p.data.weeks[0].map(s => <span key={s.id}>{s.name}</span>)}</div><div className="program-tile-bottom"><small>{p.data.equipment}</small><Button variant="ghost" size="sm" onClick={() => open(p)}>Open program →</Button></div><Button onClick={() => openModal(<AssignProgram program={p} clientId={params.get('clientId')} />, true)}>Assign to client</Button></article>)}</div>
    {!shown.length && <p className="card">No programs match these filters.</p>}
    {!!availableLegacy.length && <details className="card program-legacy"><summary>Previous workout plans · {availableLegacy.length}</summary><p>Kept as single-session plans. Open one to convert it.</p>{availableLegacy.map(p => <div className="program-list-row" key={p.id}><strong>{p.name}</strong><Button variant="ghost" size="sm" onClick={() => open(p)}>Review &amp; convert</Button></div>)}</details>}
    <details className="program-evidence"><summary>Template guidance</summary><p>Review exercise choices, volume and effort for the client. Weeks and the 3-to-2 RIR progression are editable coaching defaults.</p><p>Research supports the training principles; these exact routines have not been clinically validated. <a href="https://pubmed.ncbi.nlm.nih.gov/41843416/" target="_blank" rel="noreferrer">ACSM position stand</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/38595233/" target="_blank" rel="noreferrer">Split and full-body comparison</a></p></details>
  </div>
}

function NewProgram({ onCreate }) {
  const { closeModal } = useModal()
  const [name, setName] = useState(''), [weeks, setWeeks] = useState(4), [days, setDays] = useState(3), [error, setError] = useState('')
  return <div className="programs"><h2 id="modal-title">New program</h2><div className="program-fields"><label>Program name<input value={name} onChange={e => setName(e.target.value)} autoFocus /></label><label>Weeks<input type="number" min="1" max="52" value={weeks} onChange={e => setWeeks(+e.target.value)} /></label><label>Sessions per week<select value={days} onChange={e => setDays(+e.target.value)}>{[1,2,3,4,5,6,7].map(d => <option key={d}>{d}</option>)}</select></label></div><ErrorMessage message={error} /><div className="program-actions"><Button variant="ghost" onClick={() => closeModal()}>Cancel</Button><Button onClick={() => { try { if (!name.trim()) throw new Error('Add a program name.'); onCreate(createProgram(name.trim(), weeks, days)) } catch (e) { setError(e.message) } }}>Create draft</Button></div></div>
}

// New programs open in the same editor, then become a normal library page on save.
function NewProgramEditor({ program, onSaved }) {
  const { closeModal } = useModal()
  return <ProgramEditor program={program} inModal onBack={() => closeModal()} onSaved={p => { closeModal({ force: true }); onSaved(p) }} />
}

function ProgramEditor({ program, clientId, onBack, onSaved, inModal = false, onDirtyChange }) {
  const { commit, units } = useData()
  const { openModal, setCloseGuard } = useModal()
  const [draft, setDraft] = useState(() => structuredClone(program))
  const [week, setWeek] = useState(0), [day, setDay] = useState(0), [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const baseline = useRef(JSON.stringify(program)), saveId = useRef(null)
  const [editing, setEditing] = useState(false), [sessionDirty, setSessionDirty] = useState(false)
  const dirty = JSON.stringify(draft) !== baseline.current || sessionDirty
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false) }, [dirty, onDirtyChange])
  const discard = async () => !busy && (!dirty || await confirmDialog('Discard unsaved program changes?'))
  useEffect(() => {
    if (!dirty) return
    const unload = e => { e.preventDefault(); e.returnValue = '' }
    const link = async e => { const anchor = e.target.closest('a[href]'); if (!anchor) return; e.preventDefault(); e.stopPropagation(); if (await confirmDialog('Discard unsaved program changes?')) window.location.assign(anchor.href) }
    window.addEventListener('beforeunload', unload); document.addEventListener('click', link, true)
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', link, true) }
  }, [dirty])
  useEffect(() => inModal && !editing ? setCloseGuard(() => !busy && (!dirty || confirmDialog('Discard unsaved program changes?'))) : undefined, [inModal, editing, dirty, busy, setCloseGuard])
  const update = fn => { setDraft(p => { const n = structuredClone(p); fn(n); return n }); setMessage(''); setError('') }
  const sessions = draft.data.weeks[week], session = sessions[day] || sessions[0]
  const save = async () => {
    setBusy(true); setError('')
    try {
      const p = structuredClone(draft)
      if (p.id.startsWith('starter-') || p.id.startsWith('legacy-')) { saveId.current ||= uid(); p.id = saveId.current }
      let saved
      await confirmedPlanWrite(commit, d => { saved = saveProgram(d, p) })
      baseline.current = JSON.stringify(saved); setDraft(saved); setMessage('Program saved. Existing client copies stay as they are.'); onSaved(saved)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  // Editing a session inline avoids replacing the outer new-program modal.
  if (editing) return <ProgramSessionEditor session={session} outerDirty={dirty} onDirtyChange={setSessionDirty} onCancel={() => setEditing(false)} onSave={s => { update(p => { p.data.weeks[week][day] = s }); setEditing(false) }} />
  return <div className="programs">
    <div className="program-heading"><div><button className="program-back" onClick={async () => { if (await discard()) onBack() }}>← Programs</button><span className="program-eyebrow">Template {dirty ? '· Unsaved changes' : ''}</span><h2 id={inModal ? 'modal-title' : undefined}>{draft.name}</h2><p>{draft.data.weeks.length} weeks · {sessions.length} sessions this week</p></div><div className="program-actions"><Button variant="ghost" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save program'}</Button>{!inModal && <Button disabled={dirty || busy} title={dirty ? 'Save changes before assigning' : undefined} onClick={() => openModal(<AssignProgram program={draft} clientId={clientId} />, true)}>Assign to client</Button>}</div></div>
    <ErrorMessage message={error} />{message && <p role="status">{message}</p>}
    <details className="card program-settings"><summary>Program settings</summary><div className="program-fields"><label>Name<input value={draft.name} onChange={e => update(p => { p.name = e.target.value })} /></label><label>Goal<select value={draft.data.goal} onChange={e => update(p => { p.data.goal = e.target.value })}>{['Hypertrophy','Strength','General fitness'].map(g => <option key={g}>{g}</option>)}</select></label><label>Equipment<input value={draft.data.equipment} onChange={e => update(p => { p.data.equipment = e.target.value })} /></label><label>Level<select value={draft.data.level} onChange={e => update(p => { p.data.level = e.target.value })}>{['Beginner','All levels','Intermediate','Advanced'].map(l => <option key={l}>{l}</option>)}</select></label><label className="program-wide">Progression notes<textarea value={draft.data.progression} onChange={e => update(p => { p.data.progression = e.target.value })} /></label></div></details>
    <div className="program-weekbar"><label>Editing week<select value={week} onChange={e => { setWeek(+e.target.value); setDay(0) }}>{draft.data.weeks.map((_, i) => <option key={i} value={i}>Week {i + 1}</option>)}</select></label><div className="program-actions"><Button variant="ghost" size="sm" disabled={draft.data.weeks.length >= 52} onClick={() => update(p => p.data.weeks.push(freshProgramWeek(sessions)))}>＋ Duplicate week</Button><Button variant="ghost" size="sm" disabled={draft.data.weeks.length < 2} onClick={async () => { if (await confirmDialog(`Replace all other weeks with a copy of week ${week + 1}?`)) update(p => { p.data.weeks = p.data.weeks.map((w, i) => i === week ? w : freshProgramWeek(sessions)) }) }}>Copy to other weeks</Button><Button variant="ghost" size="sm" disabled={draft.data.weeks.length === 1} onClick={async () => { if (await confirmDialog(`Remove week ${week + 1}?`)) { update(p => p.data.weeks.splice(week, 1)); setWeek(0); setDay(0) } }}>Remove week</Button></div></div>
    <div className="program-editor-grid"><aside className="card program-days" aria-label="Program sessions">{sessions.map((s, i) => <button key={s.id} aria-pressed={session.id === s.id} onClick={() => setDay(i)}><small>{WEEKDAYS[s.day]}</small><strong>{s.name}</strong><span>{s.blocks.reduce((n,b) => n + b.exercises.length, 0)} exercises</span></button>)}<Button variant="ghost" disabled={sessions.length >= 7} onClick={() => { update(p => p.data.weeks[week].push({ id: uid(), name: 'New session', day: WEEKDAYS.findIndex((_, i) => !sessions.some(s => s.day === i)), blocks: [newBlock()] })); setDay(sessions.length) }}>＋ Add session</Button></aside><section className="card program-day-content"><div className="program-heading"><div><span className="program-eyebrow">Week {week + 1} · {WEEKDAYS[session.day]}</span><h3>{session.name}</h3></div><Button variant="ghost" onClick={() => setEditing(true)}>Edit session</Button></div><DayBlockReview prescription={session} units={units} compact /><div className="program-day-footer"><span>{7 - sessions.length} rest days this week</span><Button variant="ghost" size="sm" disabled={sessions.length === 1} onClick={async () => { if (await confirmDialog(`Remove ${session.name} from this week?`)) { update(p => p.data.weeks[week].splice(day, 1)); setDay(0) } }}>Remove session</Button></div></section></div>
  </div>
}

function ProgramSessionEditor({ session, onCancel, onSave, outerDirty, onDirtyChange }) {
  const { db } = useData(), format = useFormat()
  const { setCloseGuard } = useModal()
  const [draft, setDraft] = useState(() => structuredClone(session)), [error, setError] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(session)
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false) }, [dirty, onDirtyChange])
  const update = fn => setDraft(p => { const n = structuredClone(p); fn(n); return n })
  const drag = useDragReorder((from, to) => update(p => { p.blocks = moveOrdered(p.blocks, from, to) }))
  useEffect(() => setCloseGuard(() => (!dirty && !outerDirty) || confirmDialog('Discard unsaved program and session edits?')), [dirty, outerDirty, setCloseGuard])
  return <div className="programs"><div className="program-heading"><h2 id="modal-title">Edit session</h2><div className="program-actions"><Button variant="ghost" onClick={async () => { if (!dirty || await confirmDialog('Discard session edits?')) onCancel() }}>Cancel</Button><Button onClick={() => { try { validatePrescription(draft.name, draft.blocks); onSave(draft) } catch (e) { setError(e.message) } }}>Keep session edits</Button></div></div><div className="program-fields"><label>Session name<input value={draft.name} onChange={e => update(p => { p.name = e.target.value })} /></label><label>Suggested day<select value={draft.day} onChange={e => update(p => { p.day = +e.target.value })}>{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label><label className="program-wide">Session notes<textarea value={draft.notes || ''} onChange={e => update(p => { p.notes = e.target.value })} /></label></div><ErrorMessage message={error} />{draft.blocks.map((block, i) => <BlockCard key={block.blockId} block={block} exercises={db.exercises} tmInfo={blankTm} {...format} onChange={patch => update(p => Object.assign(p.blocks[i], patch))} onRemove={() => update(p => p.blocks.splice(i, 1))} dragProps={drag.itemProps(i)} dragHandleProps={drag.handleProps(i)} isOver={drag.over === i && drag.src !== i} isDragging={drag.src === i} />)}<Button variant="ghost" onClick={() => update(p => p.blocks.push(newBlock('Assisted', p.blocks.length + 1)))}>＋ Add block</Button><p className="muted">Percentage targets use each client's Training Max after assignment.</p></div>
}

function AssignmentConflicts({ conflicts, clientId, replace, onReplace, onChangeStep }) {
  const blocked = conflicts.filter(c => c.protected)
  const firstDate = (blocked[0] || conflicts[0]).date
  const resolutions = [...new Set(conflicts.flatMap(c => c.reasons.map(r => r.resolution)))]
  return <section className={`program-conflicts ${blocked.length ? 'is-blocked' : ''}`} aria-label="Assignment conflicts">
    <div role={blocked.length ? 'alert' : 'status'}>
      <h3>{blocked.length ? `Assignment blocked · ${blocked.length} protected ${blocked.length === 1 ? 'date' : 'dates'}` : 'Existing plans need your approval'}</h3>
      <p>{blocked.length ? 'This program cannot be assigned to these dates. No sessions will be assigned; existing training stays unchanged.' : 'Change the schedule or confirm replacement of these unstarted individual plans.'}</p>
    </div>
    <ul className="program-conflict-list" tabIndex={0} aria-label="Conflicting dates and how to resolve them">
      {conflicts.map(c => <li key={c.date}><strong>{fmtDate(c.date)} · {c.name}</strong>{c.reasons.map(r => <span className="program-conflict-reason" key={r.code}>{r.label}</span>)}</li>)}
    </ul>
    <strong className="program-conflict-reason">To resolve</strong>{resolutions.map(message => <p key={message}>{message}</p>)}
    <div className="program-actions">
      <Button variant="ghost" size="sm" onClick={() => onChangeStep(0)}>Change start week</Button>
      <Button variant="ghost" size="sm" onClick={() => onChangeStep(1)}>Change training days</Button>
      <a href={`/clients/${clientId}/profile#training-time`} target="_blank" rel="noreferrer">Change usual time ↗</a><a href="/schedule" target="_blank" rel="noreferrer">Review Schedule ↗</a><a href={`/clients/${clientId}/training?date=${firstDate}`} target="_blank" rel="noreferrer">Review calendar ↗</a>
    </div>
    {!blocked.length && <label className="program-check"><input type="checkbox" checked={replace} onChange={e => onReplace(e.target.checked)} />Replace these unstarted plans</label>}
  </section>
}

function AssignProgram({ program, clientId }) {
  const { db, saveProgramAssignment, tz } = useData(), { closeModal, setCloseGuard } = useModal()
  const today = todayISO(tz), monday = programWeekStart(today)
  const [options, setOptions] = useState({ clientId: clientId || '', start: monday < today ? addDays(monday, 7) : monday, from: 1, through: program.data.weeks.length, mapping: program.data.weeks[0].map(s => s.day), replace: false })
  const [step, setStep] = useState(0), [error, setError] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false)
  const prepared = useRef(null)
  const update = patch => { setOptions(o => ({ ...o, ...patch, replace: patch.replace ?? false })); prepared.current = null; setError('') }
  useEffect(() => setCloseGuard(() => !busy && (!prepared.current || done || confirmDialog('Assignment has not been confirmed saved. Close anyway?'))), [busy, done, setCloseGuard])
  let targets = [], problem = ''
  try { targets = assignmentTargets(program, options) } catch (e) { problem = e.message }
  const conflicts = [...programConflicts(db, options.clientId, targets, today), ...programBookingConflicts(db, options.clientId, targets)]
  const selectedClient = db.clients.find(c => c.id === options.clientId)
  const missingMax = [...new Set(targets.flatMap(t => t.session.blocks.flatMap(b => b.exercises)).filter(e => e.intensityType === '%1RM' && !resolveTrainingMax(db, options.clientId, e.exerciseName, options.start)?.kg).map(e => e.exerciseName))]
  const submit = async () => {
    setError(''); setBusy(true)
    try { prepared.current ||= prepareAssignment(db, program, options, today); await saveProgramAssignment(prepared.current); setDone(true) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  if (done) return <div className="programs"><h2 id="modal-title">Program assigned</h2><p>{program.name} · {selectedClient?.name}</p><p>{targets.length} sessions saved from {fmtDate(targets[0]?.date)} to {fmtDate(targets.at(-1)?.date)}.</p><div className="program-actions"><Button variant="ghost" onClick={() => closeModal({ force: true })}>Close</Button><a className="btn" href={`/clients/${options.clientId}/training?date=${targets[0]?.date}`}>Open client Training →</a></div></div>
  return <div className="programs"><h2 id="modal-title">Assign to client</h2><p>{program.name}</p>{selectedClient && <p className="program-note">{trainingSchedule(selectedClient) ? 'Automatic bookings: ' + formatTrainingTime(trainingSchedule(selectedClient).time) + ' · ' + trainingSchedule(selectedClient).duration + ' min · ' + (tz || 'UTC') : 'No usual training time set. Workouts will be assigned without appointments.'} <a href={'/clients/' + selectedClient.id + '/profile#training-time'}>Profile timing →</a></p>}<ol className="program-steps">{['Client & weeks','Training days','Review'].map((s,i) => <li key={s} aria-current={i === step ? 'step' : undefined}>{i + 1}. {s}</li>)}</ol>
    {step === 0 && <div className="program-fields"><label className="program-wide">Client<select value={options.clientId} onChange={e => update({ clientId: e.target.value })}><option value="">Select a client</option>{db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="program-wide">Start week (Monday)<input type="date" value={options.start} onInput={e => update({ start: e.target.value })} onChange={e => update({ start: e.target.value })} /></label><div className="program-actions program-wide"><Button variant="ghost" size="sm" disabled={!/^\d{4}-\d{2}-\d{2}$/.test(options.start)} onClick={() => update({ start: addDays(options.start, -7) })}>← Previous week</Button><Button variant="ghost" size="sm" disabled={!/^\d{4}-\d{2}-\d{2}$/.test(options.start)} onClick={() => update({ start: addDays(options.start, 7) })}>Next week →</Button></div><label>From template week<select value={options.from} onChange={e => update({ from: +e.target.value })}>{program.data.weeks.map((_,i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label><label>Through template week<select value={options.through} onChange={e => update({ through: +e.target.value })}>{program.data.weeks.map((_,i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label></div>}
    {step === 1 && <div className="program-fields">{Array.from({ length: Math.max(...program.data.weeks.slice(options.from - 1, options.through).map(w => w.length)) }, (_, i) => <label key={i}>{program.data.weeks[options.from - 1]?.[i]?.name || `Session ${i + 1}`}<select value={options.mapping[i] ?? program.data.weeks.find(w => w[i])?.[i].day} onChange={e => { const mapping = [...options.mapping]; mapping[i] = +e.target.value; update({ mapping }) }}>{WEEKDAYS.map((d, n) => <option key={d} value={n}>{d}</option>)}</select></label>)}<p className="program-wide">The same session order repeats each selected week. Unselected days are rest days.</p></div>}
    {step === 2 && <>{conflicts.length > 0 && !prepared.current && <AssignmentConflicts conflicts={conflicts} clientId={options.clientId} replace={options.replace} onReplace={replace => update({ replace })} onChangeStep={next => { setError(''); setStep(next) }} />}<div className="program-review-summary"><strong>{selectedClient?.name}</strong><span>{targets.length} sessions · {options.through - options.from + 1} weeks</span><span>Independent client copy · template unchanged</span></div><div className="program-schedule" tabIndex={0} aria-label="Assignment schedule">{targets.map(t => <div key={t.date}><span>{fmtDate(t.date)}</span><strong>{t.session.name}</strong><small>{trainingSchedule(selectedClient) ? formatTrainingTime(trainingSchedule(selectedClient).time) + " · " + trainingSchedule(selectedClient).duration + " min" : "Time not set"} · Week {t.sourceWeek}</small></div>)}</div>{missingMax.length > 0 && <p className="program-note">No Training Max for: {missingMax.join(', ')}. Percentage targets are kept; enter a max or a load in the client's session.</p>}</>}
    <ErrorMessage message={error || problem} /><div className="program-actions"><Button variant="ghost" disabled={busy || !!prepared.current} onClick={() => step ? setStep(step - 1) : closeModal()}> {step ? 'Back' : 'Cancel'}</Button>{step < 2 ? <Button disabled={!!problem || !selectedClient} onClick={() => { setError(''); setStep(step + 1) }}>Continue →</Button> : <Button disabled={busy || !!problem || (!prepared.current && (conflicts.some(c => c.protected) || (conflicts.length > 0 && !options.replace)))} onClick={submit}>{busy ? 'Assigning…' : prepared.current ? 'Retry save' : 'Assign program'}</Button>}</div>
  </div>
}

function ClientProgram({ assignment, onBack }) {
  const { db, units, tz } = useData(), { openModal } = useModal()
  const [week, setWeek] = useState(0), [day, setDay] = useState(0)
  const client = db.clients.find(c => c.id === assignment.clientId)
  const sessions = assignment.data.schedule.filter(s => s.week === week), session = sessions[day] || sessions[0]
  const prescription = db.prescriptions.find(p => p.id === session?.prescriptionId)
  const blocked = session && isPlanTargetBlocked(db, assignment.clientId, session.date, todayISO(tz))
  return <div className="programs"><button className="program-back" onClick={onBack}>← Programs</button><div className="program-heading"><div><span className="program-eyebrow">{client?.name} · Client copy</span><h2>{assignment.name}</h2><p>{fmtDate(assignment.data.start)} · {assignment.data.weeks} weeks</p></div><Link className="btn ghost" to={`/clients/${assignment.clientId}/training?date=${session?.date || assignment.data.start}`}>Training calendar →</Link></div><label className="program-weekbar">Week<select value={week} onChange={e => { setWeek(+e.target.value); setDay(0) }}>{Array.from({ length: assignment.data.weeks }, (_,i) => <option key={i} value={i}>Week {i + 1}</option>)}</select></label><div className="program-editor-grid"><aside className="card program-days">{sessions.map((s, i) => <button key={s.prescriptionId} aria-pressed={s === session} onClick={() => setDay(i)}><small>{fmtDate(s.date)}</small><strong>{db.prescriptions.find(p => p.id === s.prescriptionId)?.name || s.name}</strong></button>)}</aside><section className="card program-day-content"><div className="program-heading"><div><span className="program-eyebrow">{fmtDate(session?.date)}</span><h3>{prescription?.name || session?.name}</h3></div>{prescription && !blocked && <Button variant="ghost" onClick={() => openModal(<WorkoutBuilderModal clientId={assignment.clientId} date={session.date} />, 'xl')}>Edit client session</Button>}</div>{prescription ? <DayBlockReview prescription={prescription} units={units} compact /> : <p>This session was removed from the calendar.</p>}{blocked && <p className="muted">Past or started sessions are protected. Review them in Training.</p>}</section></div>{assignment.data.progression && <details className="program-evidence"><summary>Progression notes</summary><p>{assignment.data.progression}</p></details>}</div>
}
