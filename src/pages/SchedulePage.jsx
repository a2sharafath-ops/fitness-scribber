import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import ModalShell from '../components/molecules/ModalShell'
import SessionForm from '../components/organisms/forms/SessionForm'
import ScheduleMoveReview from '../components/organisms/ScheduleMoveReview'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { addDays, addMonths, fmtDay, monthGridDates, monthLabel } from '../lib/dates'
import { bookingPlan, bookingConflicts, calendarLanes, calendarTimeRange, clockTime, durationLabel, hasDuration, minute, scheduleClock, scheduleLock, scheduleRequest, scheduleSort, sessionEnd, sessionPath, trainingBooking, weekOf } from '../lib/schedule'
import { programStats } from '../lib/program'
import './SchedulePage.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const Badge = ({ status }) => <span className={'schedule-badge ' + status}>{status}</span>

function BookingDetails({ session: s, onEdit, onOpen }) {
  const { db } = useData(), { closeModal } = useModal(), plan = bookingPlan(db, s)
  const stats = plan ? programStats(plan) : null
  return <div className="schedule-dialog"><ModalShell title={db.clients.find(c => c.id === s.clientId)?.name || 'Client unavailable'} onClose={closeModal}
    footer={<><Button variant="ghost" onClick={onEdit}>Booking details</Button><Button onClick={onOpen}>{trainingBooking(s) ? 'Open training session' : s.type === 'Assessment' ? 'Open assessments' : s.type === 'Check-in' ? 'Open check-ins' : 'Open client'}</Button></>}>
    <div className="schedule-detail-time"><span className="schedule-eyebrow">{fmtDay(s.date)}</span><strong>{s.time}–{sessionEnd(s)}</strong><span>{durationLabel(s)} · {s.type}</span><Badge status={s.status} /></div>
    {plan && <div className="schedule-preserved"><strong>{plan.name || 'Prescribed workout'}</strong><p>{stats.exercises} exercises · {stats.sets} prescribed sets</p></div>}
    {trainingBooking(s) && !plan && <p className="muted">Open Training to review or prescribe this day’s workout.</p>}
  </ModalShell></div>
}

export default function SchedulePage() {
  const { db, tz } = useData(), { openModal, closeModal } = useModal(), navigate = useNavigate()
  const [clock, setClock] = useState(() => scheduleClock(new Date(), tz))
  const [selected, setSelected] = useState(clock.today), [view, setView] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 640 ? 'day' : 'week')
  const [client, setClient] = useState('all'), [status, setStatus] = useState('booked'), [preview, setPreview] = useState(null)
  const drag = useRef(null), suppressClick = useRef(false), scroller = useRef(null), page = useRef(null), latest = useRef(null)
  const clients = new Map(db.clients.map(c => [c.id, c]))
  const rows = db.sessions.filter(s => clients.has(s.clientId)).sort(scheduleSort)
  const visible = rows.filter(s => (client === 'all' || s.clientId === client) && (status === 'all' || status === 'booked' && s.status !== 'Cancelled' || s.status === status))
  const week = weekOf(selected), timed = view === 'week' || view === 'day'
  const dates = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(week, i)) : [selected]
  const gridRows = visible.filter(s => dates.includes(s.date))
  const validTimeRows = gridRows.filter(s => Number.isFinite(minute(s.time)) && hasDuration(s))
  const { start, end } = calendarTimeRange(gridRows)
  const dayRows = visible.filter(s => s.date === selected)
  const todayRows = rows.filter(s => s.date === clock.today && s.status !== 'Cancelled')
  const thisWeek = rows.filter(s => s.date >= weekOf(clock.today) && s.date <= addDays(weekOf(clock.today), 6) && s.status !== 'Cancelled')
  const overdue = rows.filter(s => ['Pending', 'Confirmed'].includes(s.status) && (s.date < clock.today || s.date === clock.today && sessionEnd(s) <= clock.time))
  const next = dayRows.find(s => ['Pending', 'Confirmed'].includes(s.status) && (s.date > clock.today || s.date === clock.today && s.time > clock.time))
  const resetFilters = () => { setClient('all'); setStatus('booked') }
  const onSaved = s => { if (s) setSelected(s.date) }
  const book = (date = selected, time) => openModal(<SessionForm date={date} time={time} clientId={client !== 'all' ? client : undefined} onSaved={onSaved} />)
  const edit = (s, proposed) => openModal(<SessionForm session={s} proposed={proposed} onSaved={onSaved} />)
  const detail = s => {
    if (suppressClick.current) return
    openModal(<BookingDetails session={s} onEdit={() => edit(s)} onOpen={async () => { await closeModal(); navigate(sessionPath(s)) }} />)
  }
  const propose = (s, candidate) => {
    if (s.date === candidate.date && s.time === candidate.time && s.dur === candidate.dur) return
    openModal(<ScheduleMoveReview request={scheduleRequest(db, s, candidate)} onSaved={onSaved} onEdit={next => edit(s, next)} />)
  }
  latest.current = { db, clock, propose, start, end }
  useEffect(() => { setClock(scheduleClock(new Date(), tz)); const id = setInterval(() => setClock(scheduleClock(new Date(), tz)), 30000); return () => clearInterval(id) }, [tz])
  useEffect(() => {
    if (scroller.current && timed) scroller.current.scrollTop = 0
  // Show the beginning of the time range when switching calendar view.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  useEffect(() => {
    let frame
    const update = () => {
      const d = drag.current
      if (!d?.active) return
      const { start, end, db, clock } = latest.current
      const rect = scroller.current?.getBoundingClientRect()
      if (rect && d.y > rect.top && d.y < rect.bottom && d.x > rect.left && d.x < rect.right) {
        if (d.y < rect.top + 65) scroller.current.scrollTop -= 8
        else if (d.y > rect.bottom - 45) scroller.current.scrollTop += 8
        if (d.x < rect.left + 35) scroller.current.scrollLeft -= 7
        else if (d.x > rect.right - 35) scroller.current.scrollLeft += 7
      }
      const target = document.elementFromPoint(d.x, d.y)?.closest('[data-schedule-date]')
      let candidate = null
      if (target && page.current?.contains(target)) {
        const date = target.dataset.scheduleDate
        const r = target.getBoundingClientRect()
        if (d.resize && date === d.session.date && target.classList.contains('schedule-time-column')) {
          const dur = Math.round((d.y - r.top + start - minute(d.session.time)) / 15) * 15
          candidate = { ...d.session, dur: Math.max(15, Math.min(480, 1440 - minute(d.session.time), dur)) }
        } else if (!d.resize) {
          const n = target.classList.contains('schedule-time-column') ? Math.max(start, Math.min(end - d.session.dur, Math.round((d.y - r.top - d.offset + start) / 15) * 15)) : minute(d.session.time)
          candidate = { ...d.session, date, time: clockTime(n) }
        }
      }
      const issues = candidate ? bookingConflicts(db, d.session, candidate, clock) : []
      d.candidate = candidate
      setPreview({ session: d.session, candidate, resize: d.resize, blocked: !!issues.length, reason: issues[0]?.title, x: d.x, y: d.y, width: d.width })
    }
    const tick = () => { if (drag.current?.active) { update(); frame = requestAnimationFrame(tick) } }
    const move = e => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      d.x = e.clientX; d.y = e.clientY
      if (!d.active && Math.hypot(d.x - d.originX, d.y - d.originY) > 6) { d.active = true; suppressClick.current = true; frame = requestAnimationFrame(tick) }
      if (d.active) e.preventDefault()
    }
    const finish = e => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      const cancelled = e.type === 'pointercancel'
      if (d.active && !cancelled) update()
      drag.current = null; cancelAnimationFrame(frame); setPreview(null)
      if (d.active && !cancelled && d.candidate) latest.current.propose(d.session, d.candidate)
      setTimeout(() => { suppressClick.current = false }, 100)
    }
    const cancel = e => { if (e.key === 'Escape') { drag.current = null; cancelAnimationFrame(frame); setPreview(null); setTimeout(() => { suppressClick.current = false }, 100) } }
    window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', finish); window.addEventListener('pointercancel', finish); window.addEventListener('keydown', cancel)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish); window.removeEventListener('keydown', cancel) }
  }, [])
  const pointerDown = (e, s, resize = false) => {
    if (e.button !== 0 || !hasDuration(s) || scheduleLock(db, s, clock)) return
    e.stopPropagation()
    const rect = e.currentTarget.closest('.schedule-event').getBoundingClientRect()
    drag.current = { session: structuredClone(s), resize, pointerId: e.pointerId, originX: e.clientX, originY: e.clientY, x: e.clientX, y: e.clientY, offset: e.clientY - rect.top, width: rect.width, active: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const event = (s, style, compact = false) => <div key={s.id} className={'schedule-event ' + s.status + (preview?.session.id === s.id ? ' dragging' : '') + (!scheduleLock(db, s, clock) ? ' movable' : '')} style={style}>
    <button onClick={e => { e.stopPropagation(); detail(s) }} onPointerDown={e => pointerDown(e, s)} aria-label={`${clients.get(s.clientId)?.name}, ${fmtDay(s.date)}, ${s.time}–${sessionEnd(s)}, ${s.status}`}>
      <strong>{compact ? s.time + ' ' : ''}{clients.get(s.clientId)?.name}</strong>{!compact && <><span>{s.time}–{sessionEnd(s)}</span>{s.dur >= 45 && <small>{s.type}</small>}</>}
    </button>
    {!compact && !scheduleLock(db, s, clock) && <span role="button" tabIndex={0} aria-label={`Change duration for ${clients.get(s.clientId)?.name}`} className="schedule-resize" onPointerDown={e => pointerDown(e, s, true)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); edit(s) } }} />}
  </div>
  const landing = (date, month = false) => preview?.candidate?.date === date && <div aria-hidden="true" className={'schedule-landing' + (preview.blocked ? ' blocked' : '') + (month ? ' month' : '')} style={month ? undefined : { top: minute(preview.candidate.time) - start, height: preview.candidate.dur }}><strong>{clients.get(preview.session.clientId)?.name}</strong><span>{preview.candidate.time}–{sessionEnd(preview.candidate)}</span><small>{preview.candidate.dur} min{preview.blocked ? ' · Conflict' : ''}</small></div>
  const shift = dir => setSelected(view === 'month' || view === 'agenda' ? addMonths(selected, dir) : addDays(selected, dir * (view === 'week' ? 7 : 1)))
  const dateRows = timed ? gridRows : visible.filter(s => s.date.slice(0, 7) === selected.slice(0, 7))
  const heading = view === 'week' ? `${fmtDay(week)} – ${fmtDay(addDays(week, 6))}` : view === 'day' ? fmtDay(selected) : monthLabel(selected)
  return <div className="schedule-page" ref={page}>
    <header className="schedule-heading"><div><span className="schedule-eyebrow">YOUR COACHING WEEK</span><h1>Schedule</h1><p>{fmtDay(clock.today)} · {tz}</p></div><Button disabled={!db.clients.length} onClick={() => book()}>＋ Book session</Button></header>
    <div className="schedule-stats"><div><span className="schedule-stat-icon"><Icon name="calendar" size={21} /></span><div><small>Today</small><strong>{todayRows.length} <span>{todayRows.length === 1 ? 'session' : 'sessions'}</span></strong></div></div><div><span className="schedule-stat-icon">◷</span><div><small>This week</small><strong>{Math.round(thisWeek.reduce((sum, s) => sum + Number(s.dur || 0), 0) / 6) / 10} <span>hours · {thisWeek.length} sessions</span></strong></div></div><button onClick={() => openModal(<div className="schedule-dialog"><ModalShell title="Booking status updates" onClose={closeModal}><p className="muted">Past bookings awaiting a status update.</p>{overdue.length ? overdue.map(s => <button className="schedule-agenda-row" key={s.id} onClick={() => edit(s)}><span>{fmtDay(s.date)} · {s.time}</span><strong>{clients.get(s.clientId)?.name}</strong><Badge status={s.status} /></button>) : <p>All up to date.</p>}</ModalShell></div>)}><span className="schedule-stat-icon amber">↻</span><div><small>Status updates</small><strong>{overdue.length} <span>{overdue.length ? 'to review →' : 'All up to date'}</span></strong></div></button></div>
    <div className={'schedule-workspace' + (timed ? ' timed' : '')}>
      <section className="schedule-calendar" aria-label="Session calendar"><div className="schedule-toolbar"><div className="schedule-range"><Button variant="ghost" size="sm" aria-label={'Previous ' + view} onClick={() => shift(-1)}>←</Button><h2>{heading}</h2><Button variant="ghost" size="sm" aria-label={'Next ' + view} onClick={() => shift(1)}>→</Button><Button variant="ghost" size="sm" onClick={() => setSelected(clock.today)}>Today</Button></div><div className="schedule-views">{['month', 'week', 'day', 'agenda'].map(v => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div></div>
        <div className="schedule-filters"><label>Client<select value={client} onChange={e => setClient(e.target.value)}><option value="all">All clients</option>{db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="booked">All except cancelled</option>{['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Missed'].map(s => <option key={s}>{s}</option>)}<option value="all">All statuses</option></select></label>{(client !== 'all' || status !== 'booked') && <button className="schedule-text-link" onClick={resetFilters}>Reset filters</button>}</div>
        <div className="schedule-caption"><span>{dateRows.length} {dateRows.length === 1 ? 'booking' : 'bookings'} shown</span><span>{timed ? 'Drag to move · Pull the bottom edge to resize' : view === 'month' ? 'Drag to another date · Time stays the same' : ''}</span></div>
        {timed && gridRows.some(s => !validTimeRows.includes(s)) && <div className="schedule-incomplete">{gridRows.filter(s => !validTimeRows.includes(s)).map(s => <button key={s.id} onClick={() => detail(s)}>{fmtDay(s.date)} · {s.time} · {clients.get(s.clientId)?.name} — {durationLabel(s)}</button>)}</div>}{timed ? <div className="schedule-time-scroll" ref={scroller}><div className={'schedule-time-grid ' + (view === 'week' ? 'week' : 'day')} style={{ '--days': dates.length }}><div className="schedule-time-head"><span className="schedule-zone">Time</span>{dates.map(d => <button key={d} className={(d === selected ? 'selected ' : '') + (d === clock.today ? 'today' : '')} onClick={() => setSelected(d)}><span>{DAYS[(new Date(d + 'T12:00Z').getUTCDay() + 6) % 7]}</span><strong>{Number(d.slice(8))}</strong></button>)}</div><div className="schedule-time-body" style={{ height: end - start }}><div className="schedule-hours">{Array.from({ length: (end - start) / 60 + 1 }, (_, i) => <span key={i} style={{ top: i * 60, ...(start + i * 60 === end ? { transform: 'translateY(-100%)' } : {}) }}>{clockTime(start + i * 60)}</span>)}</div>{dates.map(d => <div key={d} data-schedule-date={d} className={'schedule-time-column' + (d === selected ? ' selected' : '')} onDoubleClick={e => { if (e.target !== e.currentTarget) return; book(d, clockTime(Math.min(end - 60, Math.max(start, Math.round((e.clientY - e.currentTarget.getBoundingClientRect().top + start) / 15) * 15)))) }}>
          {calendarLanes(validTimeRows.filter(s => s.date === d)).map(({ session: s, lane, lanes }) => event(s, { top: minute(s.time) - start, height: Math.max(15, s.dur), left: `calc(${lane * 100 / lanes}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }))}
          {d === clock.today && minute(clock.time) >= start && minute(clock.time) <= end && <div className="schedule-now" style={{ top: minute(clock.time) - start }} aria-label={'Current time ' + clock.time} />}{landing(d)}
        </div>)}</div></div></div> : view === 'month' ? <div className="schedule-month">{DAYS.map(d => <div className="schedule-weekday" key={d}>{d}</div>)}{monthGridDates(selected).map(d => { const entries = visible.filter(s => s.date === d); return <div key={d} data-schedule-date={d} className={'schedule-month-cell' + (d === selected ? ' selected' : '') + (d.slice(0, 7) !== selected.slice(0, 7) ? ' other' : '')}><button className={'schedule-date' + (d === clock.today ? ' today' : '')} aria-label={`${fmtDay(d)}, ${entries.length} bookings`} aria-pressed={d === selected} onClick={() => setSelected(d)}>{Number(d.slice(8))}<small>{entries.length || ''}</small></button>{entries.slice(0, 2).map(s => event(s, undefined, true))}{entries.length > 2 && <button className="schedule-more" onClick={() => setSelected(d)}>+{entries.length - 2} more</button>}{landing(d, true)}</div> })}</div> : <div className="schedule-agenda">{dateRows.length ? [...new Set(dateRows.map(s => s.date))].map(d => <section key={d}><h3>{fmtDay(d)}</h3>{dateRows.filter(s => s.date === d).map(s => <button className="schedule-agenda-row" key={s.id} onClick={() => detail(s)}><span>{s.time}<small>{durationLabel(s)}</small></span><span><strong>{clients.get(s.clientId)?.name}</strong><small>{s.type}</small></span><Badge status={s.status} /></button>)}</section>) : <div className="schedule-empty"><Icon name="calendar" size={36} /><h3>No bookings this month</h3><p>Choose another month or adjust the filters.</p></div>}</div>}
        <div className="schedule-legend">{['Confirmed', 'Pending', 'Completed', 'Cancelled'].map(s => <span key={s}><i className={s} />{s}</span>)}</div>
      </section>
      <section className="schedule-day-panel"><header><span className="schedule-eyebrow">{selected === clock.today ? 'TODAY' : 'SELECTED DAY'}</span><h2>{fmtDay(selected)}</h2><p>{dayRows.length} sessions · {dayRows.reduce((sum, s) => sum + Number(s.dur || 0), 0)} min</p></header><div className="schedule-day-scroll">{dayRows.length ? dayRows.map(s => <article key={s.id} className={'schedule-day-card' + (s.id === next?.id ? ' next' : '')}><div className="schedule-day-time"><strong>{s.time} <small>– {sessionEnd(s)}</small></strong><Badge status={s.status} /></div>{s.id === next?.id && <span className="schedule-next-label">UP NEXT</span>}<h3>{clients.get(s.clientId)?.name}</h3><p>{s.type} · {durationLabel(s)}</p>{bookingPlan(db, s)?.name && <p className="schedule-plan-name">{bookingPlan(db, s).name}</p>}<div className="schedule-day-actions"><button onClick={() => { navigate(sessionPath(s)) }}>{trainingBooking(s) ? 'Open session →' : 'Open client →'}</button><button aria-label={'Booking details for ' + clients.get(s.clientId)?.name} onClick={() => edit(s)}>•••</button></div></article>) : <div className="schedule-empty"><Icon name="calendar" size={32} /><h3>{client !== 'all' || status !== 'booked' ? 'No matching bookings' : 'A clear day'}</h3><p>{client !== 'all' || status !== 'booked' ? 'Try another filter or date.' : 'Book a session when you’re ready.'}</p></div>}</div><footer><Button variant="ghost" disabled={!db.clients.length} onClick={() => book()}>＋ Book on this day</Button></footer></section>
    </div>
    <p className="schedule-bottom-note">Set the usual training time in Profile to schedule planned workouts.</p>
    {preview && <><div role="status" className={'schedule-drag-status' + (preview.blocked ? ' blocked' : '')}>{preview.candidate ? `${fmtDay(preview.candidate.date)} · ${preview.candidate.time}–${sessionEnd(preview.candidate)} · ${preview.candidate.dur} min — ${preview.blocked ? preview.reason + '. Release to review options.' : 'Release to review'}` : 'Move over a calendar day to place the session'}<small>Esc to cancel</small></div>{!preview.candidate && <div className="schedule-floating" style={{ left: preview.x + 12, top: preview.y + 12, width: Math.max(130, preview.width) }}><strong>{clients.get(preview.session.clientId)?.name}</strong><span>{preview.session.time} · {preview.session.dur} min</span></div>}</>}
  </div>
}
