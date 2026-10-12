import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../atoms/Button'
import SegToggle from '../molecules/SegToggle'
import WorkoutBuilderModal from './program/WorkoutBuilderModal'
import PastePlanModal from './program/PastePlanModal'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useClipboard } from '../../store/ClipboardContext'
import { trainingDay } from '../../lib/trainingDay'
import { buildClip, clipTargets, clipClashes, pasteClip, writePrescription, isSession, deleteSpan, isPlanTargetBlocked } from '../../lib/planner'
import { weekDates, fmtDate, fmtDay, todayISO, monthGridDates, monthLabel, addMonths, addDays, datesBetween } from '../../lib/dates'
import { confirmedPlanWrite } from '../../lib/confirmedPersistence'
import { toast, confirmDialog } from '../../lib/toast'
import { cloneBlocksFresh, itemsToBlocks } from '../../lib/program'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const weekOffset = (date, tz) => Math.floor((Date.parse(date) - Date.parse(weekDates(0, tz)[0])) / (7 * 86400000)) * 7

export default function WorkoutPlanner({ client, initialView = 'week', focusDate, onSelectDate, title = 'Workout calendar', children }) {
  const { db, commit, saveTrainingPlans, tz } = useData()
  const navigate = useNavigate()
  const { openModal } = useModal()
  const { clip, setClip, clearClip } = useClipboard()
  const today = todayISO(tz)
  const [view, setView] = useState(initialView)
  const [anchor, setAnchor] = useState(focusDate || today)
  const [sel, setSel] = useState(null)
  const [dropDate, setDropDate] = useState(null)
  const [hoverDate, setHoverDate] = useState(null)
  const drag = useRef(null), chip = useRef(null), suppress = useRef(false)
  useEffect(() => { if (focusDate) setAnchor(focusDate) }, [focusDate])
  useEffect(() => {
    const up = () => {
      if (!drag.current) return
      const moved = drag.current.moved
      drag.current = null
      if (!moved) setSel(null)
      else { suppress.current = true; setTimeout(() => { suppress.current = false }, 0) }
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])
  const dates = view === 'month' ? monthGridDates(anchor) : weekDates(weekOffset(anchor, tz), tz)
  const days = dates.map((date) => ({ date, ...trainingDay(db, client.id, date, today) }))
  const period = days.filter((day) => view === 'week' || day.date.slice(0, 7) === anchor.slice(0, 7))
  const logCount = period.reduce((count, day) => count + day.completed.length, 0)
  const selection = sel ? datesBetween(sel.from, sel.to) : []
  const sessions = selection.filter((date) => db.prescriptions.some((row) => row.clientId === client.id && row.date === date && isSession(row)))
  const selectionClosed = selection.some((date) => isPlanTargetBlocked(db, client.id, date, today))
  const targets = clip && hoverDate ? clipTargets(clip, hoverDate) : []
  const selectDate = (date) => {
    setAnchor(date)
    if (onSelectDate) onSelectDate(date)
    else openModal(<WorkoutBuilderModal clientId={client.id} date={date} review
      onLog={(day) => navigate(`/clients/${client.id}/training?date=${day}&run=1#workout-log`)} />, 'xl')
  }
  const copy = () => {
    const copied = buildClip(db, client, selection)
    if (!copied) return
    setClip(copied); setSel(null)
    toast(`Copied ${copied.days.length} session${copied.days.length === 1 ? '' : 's'}. Select an open date to paste.`, 'info')
  }
  const remove = async () => {
    if (!sessions.length || selectionClosed) return
    if (!await confirmDialog({ title: 'Delete plans', message: `Delete ${sessions.length} planned session${sessions.length === 1 ? '' : 's'} between ${fmtDay(selection[0])} and ${fmtDay(selection.at(-1))}? Workout logs are kept.`, confirmLabel: 'Delete', danger: true })) return
    commit((data) => deleteSpan(data, client.id, selection))
    setSel(null); toast('Selected plans deleted.')
  }
  const paste = async (date) => {
    if (clipTargets(clip, date).some((target) => isPlanTargetBlocked(db, client.id, target, today))) return toast('Choose a current or future date without an existing workout or completed appointment.', 'error')
    const clashes = clipClashes(db, clip, client.id, date)
    if (clashes.length && !await confirmDialog({ title: 'Replace plans?', message: `${clashes.length} target day${clashes.length === 1 ? ' already has' : 's already have'} a plan. Replace?`, confirmLabel: 'Replace' })) return
    try { await confirmedPlanWrite(saveTrainingPlans, (data) => pasteClip(data, clip, client.id, date)) }
    catch (error) { return toast(error.message, 'error') }
    clearClip(); selectDate(date); toast('Plans pasted.')
  }
  const drop = async (date) => {
    const source = chip.current
    chip.current = null; setDropDate(null)
    if (!source || source === date) return
    if (isPlanTargetBlocked(db, client.id, date, today)) return toast('Choose an open day to copy the plan.', 'error')
    const prescription = db.prescriptions.find((row) => row.clientId === client.id && row.date === source)
    if (!isSession(prescription)) return
    if (db.prescriptions.some((row) => row.clientId === client.id && row.date === date && isSession(row)) && !await confirmDialog({ title: 'Replace plan?', message: `${fmtDay(date)} already has a plan. Replace it?`, confirmLabel: 'Replace' })) return
    try { await confirmedPlanWrite(saveTrainingPlans, (data) => writePrescription(data, client.id, date, cloneBlocksFresh(prescription.blocks?.length ? prescription.blocks : itemsToBlocks(prescription.items)), prescription.notes || '', prescription.name || '')) }
    catch (error) { return toast(error.message, 'error') }
    selectDate(date); toast('Plan copied.')
  }
  return <section className="card training-calendar" aria-labelledby="training-calendar-title">
    <div className="training-calendar-head"><h2 id="training-calendar-title">{title}</h2><div className="training-calendar-toolbar">
      <SegToggle options={[[ 'week', 'Week' ], [ 'month', 'Month' ]]} value={view} onChange={setView} ariaLabel="Calendar view" />
      <div className="training-period-nav">
        <Button variant="ghost" size="sm" aria-label={`Previous ${view}`} onClick={() => selectDate(view === 'month' ? addMonths(anchor, -1) : addDays(anchor, -7))}>←</Button>
        <Button variant="ghost" size="sm" onClick={() => selectDate(today)}>Today</Button>
        <Button variant="ghost" size="sm" aria-label={`Next ${view}`} onClick={() => selectDate(view === 'month' ? addMonths(anchor, 1) : addDays(anchor, 7))}>→</Button>
      </div>
    </div></div>
    <div className="training-calendar-period"><strong>{view === 'month' ? monthLabel(anchor) : `${fmtDate(dates[0])}–${fmtDate(dates[6])}`}</strong>
      <span>{period.filter((day) => day.status === 'planned').length} planned · {logCount} workout log{logCount === 1 ? '' : 's'}</span></div>
    {selection.length > 1 && !clip && <div className="training-calendar-selection" role="status"><span>{selection.length} dates · {sessions.length} plans</span><div className="flex gap">
      <Button size="sm" disabled={!sessions.length} onClick={copy}>Copy</Button>
      <Button variant="danger" size="sm" disabled={!sessions.length || selectionClosed} onClick={remove}>Delete plans</Button>
      <Button variant="ghost" size="sm" onClick={() => setSel(null)}>Clear</Button>
    </div></div>}
    {clip && <div className="training-calendar-selection" role="status"><span>{clip.days.length} plans copied · Select an open date to paste</span><div className="flex gap">
      <Button variant="ghost" size="sm" onClick={() => openModal(<PastePlanModal clip={clip} />)}>Paste to clients…</Button>
      <Button variant="ghost" size="sm" onClick={clearClip}>Cancel copy</Button>
    </div></div>}
    {view === 'month' && <div className="training-calendar-dow" aria-hidden="true">{DOW.map((day) => <span key={day}>{day}</span>)}</div>}
    <div className={`training-calendar-dates ${view}`} role="group" aria-label={`${view === 'month' ? 'Month' : 'Week'} dates`}>{days.map((day) => <button type="button" key={day.date}
      className={'training-calendar-day' + (day.date === today ? ' today' : '') + (view === 'month' && day.date.slice(0, 7) !== anchor.slice(0, 7) ? ' outside' : '') + (selection.includes(day.date) ? ' selected-range' : '') + (targets.includes(day.date) || dropDate === day.date ? ' paste-target' : '')}
      aria-pressed={day.date === focusDate} aria-label={`${fmtDay(day.date)}${day.date === today ? ', today' : ''}: ${day.label}${day.status !== 'empty' ? `, ${day.title}` : ''}`} title={`${fmtDate(day.date)} · ${day.label} · ${day.title}. Shift-click another date to select a range.`}
      onClick={(event) => { if (!suppress.current) { if (clip) paste(day.date); else if (event.shiftKey) setSel({ from: sel?.from || focusDate || day.date, to: day.date }); else selectDate(day.date) } }}
      onMouseDown={(event) => { if (event.button === 0 && !clip && !event.shiftKey) { drag.current = { from: day.date, moved: false }; setSel({ from: day.date, to: day.date }) } }}
      onMouseEnter={() => { if (clip) setHoverDate(day.date); else if (drag.current) { drag.current.moved = true; setSel({ from: drag.current.from, to: day.date }) } }}
      onMouseLeave={() => { if (clip) setHoverDate(null) }} draggable={Boolean(day.prescription) && !clip}
      onDragStart={(event) => { chip.current = day.date; drag.current = null; setSel(null); event.dataTransfer.effectAllowed = 'copy'; event.dataTransfer.setData('text/plain', day.date) }}
      onDragEnd={() => { chip.current = null; setDropDate(null) }}
      onDragOver={(event) => { if (chip.current) { event.preventDefault(); setDropDate(day.date) } }}
      onDrop={(event) => { event.preventDefault(); drop(day.date) }}>
      <span className="training-calendar-date">{view === 'week' && <span>{fmtDay(day.date).split(',')[0]}</span>}<strong>{Number(day.date.slice(8))}</strong>{day.date === today && <small>Today</small>}</span>
      <span className={`training-calendar-status ${day.status}`}>{day.label}</span><span className="training-calendar-name">{day.status === 'empty' ? '—' : day.status === 'appointment' ? 'No workout log' : day.title}</span>
    </button>)}</div>
    <div className="training-calendar-legend" aria-hidden="true"><span className="planned">Planned</span><span className="completed">Completed log</span><span className="progress">In progress</span><span className="appointment">Appt done</span></div>
    {children}
  </section>
}
