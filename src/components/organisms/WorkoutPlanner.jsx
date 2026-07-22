import { useState, useRef, useEffect } from 'react'
import Button from '../atoms/Button'
import SegToggle from '../molecules/SegToggle'
import DayMetrics from '../molecules/DayMetrics'
import WorkoutBuilderModal from './program/WorkoutBuilderModal'
import PastePlanModal from './program/PastePlanModal'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useClipboard } from '../../store/ClipboardContext'
import { useFormat } from '../../hooks/useFormat'
import { dailySum, dayMetrics } from '../../lib/calc'
import { programStats } from '../../lib/program'
import { buildClip, clipTargets, clipClashes, pasteClip, writePrescription, isSession, deleteSpan } from '../../lib/planner'
import { weekDates, fmtDate, fmtDay, todayISO, monthGridDates, monthLabel, addMonths, datesBetween } from '../../lib/dates'
import { toast, confirmDialog } from '../../lib/toast'
import { cloneBlocksFresh, itemsToBlocks } from '../../lib/program'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WorkoutPlanner({ client, featured = false, size, initialView, onDay, bare }) {
  const sz = size || (featured ? 'featured' : 'default')
  const isFeatured = sz === 'featured'
  const isMedium = sz === 'medium'
  const { db, commit, tz } = useData()
  const { openModal } = useModal()
  const { clip, setClip, clearClip } = useClipboard()
  const { fmtVL } = useFormat()
  const [view, setView] = useState(initialView || (isFeatured ? 'month' : 'week'))
  const [anchor, setAnchor] = useState(todayISO(tz)) // any date within the shown month
  const [weekStart, setWeekStart] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [sel, setSel] = useState(null)      // { from, to } — drag-selected span
  const [dropDt, setDropDt] = useState(null) // day currently hovered by a chip drag
  const [hoverDt, setHoverDt] = useState(null) // day hovered while a clip is held
  const drag = useRef(null)                  // { from, moved } while range-selecting
  const chip = useRef(null)                  // source date of a chip drag
  const suppress = useRef(false)             // swallow the click that ends a drag
  const today = todayISO(tz)

  // A range-select ends on mouseup anywhere — a plain click (no movement)
  // clears the selection and falls through to the normal prescribe click.
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

  const intMap = dailySum(db.srpe, client.id, 'tl')
  const prescribe = (dt) => openModal(<WorkoutBuilderModal clientId={client.id} date={dt} />, 'xl')
  const prescOn = (dt) => db.prescriptions.find((p) => p.clientId === client.id && p.date === dt)
  const dayData = (dt) => {
    const presc = db.prescriptions.filter((p) => p.clientId === client.id && p.date === dt)
    const stats = presc.map(programStats).reduce((a, s) => ({ exercises: a.exercises + s.exercises, sets: a.sets + s.sets, volume: a.volume + s.volume }), { exercises: 0, sets: 0, volume: 0 })
    const names = presc.map((p) => (p.notes || '').trim()).filter(Boolean)
    const name = names.length ? names.join(' · ') : (stats.exercises ? `Session · ${stats.exercises} ex / ${stats.sets} sets` : null)
    return { vl: Math.round(stats.volume), name }
  }

  const shownDates = view === 'month' ? monthGridDates(anchor) : weekDates(weekStart, tz)
  const prescribedDates = new Set(db.prescriptions.filter((p) => p.clientId === client.id && isSession(p)).map((p) => p.date))
  const plannedDays = shownDates.filter((d) => prescribedDates.has(d)).length
  const nextDate = [...prescribedDates].filter((d) => d >= today).sort()[0]
  const summary = `${plannedDays} session${plannedDays === 1 ? '' : 's'} ${view === 'month' ? 'this month' : 'this week'}${nextDate ? ` · next ${fmtDay(nextDate)}` : ''}`

  // ---- Selection -----------------------------------------------------------
  const selDates = sel ? datesBetween(sel.from, sel.to) : []
  const selSessions = selDates.filter((d) => prescribedDates.has(d)).length
  const inSel = (dt) => selDates.includes(dt)

  const doCopy = () => {
    const c = buildClip(db, client, selDates)
    if (!c) return toast('Nothing to copy — no sessions in that span.', 'error')
    setClip(c)
    setSel(null)
    toast(`Copied ${c.days.length} session${c.days.length === 1 ? '' : 's'} — click a day to paste.`, 'info')
  }

  // Clearing a span is destructive and can span weeks, so the confirmation
  // names the count and the range rather than asking a generic "are you sure".
  const doDelete = async () => {
    if (!selSessions) return
    const span = `${fmtDay(selDates[0])} – ${fmtDay(selDates[selDates.length - 1])}`
    if (!await confirmDialog({
      title: 'Delete sessions',
      message: `Delete ${selSessions} prescribed session${selSessions === 1 ? '' : 's'} between ${span}? This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })) return
    commit((d) => deleteSpan(d, client.id, selDates))
    setSel(null)
    toast(`Deleted ${selSessions} session${selSessions === 1 ? '' : 's'}.`)
  }

  // ---- Paste ---------------------------------------------------------------
  // Live preview: hovering a day dashes-outline every day the clip would land on,
  // so the whole pattern (and its gaps) is visible before committing.
  const pasteTargets = clip && hoverDt ? clipTargets(clip, hoverDt) : []
  const pasteAt = async (dt) => {
    const clash = clipClashes(db, clip, client.id, dt)
    if (clash.length && !await confirmDialog({
      title: 'Overwrite sessions',
      message: `${clash.length} day${clash.length === 1 ? '' : 's'} in the target already ${clash.length === 1 ? 'has a session' : 'have sessions'} — overwrite?`,
      confirmLabel: 'Overwrite',
    })) return
    commit((d) => pasteClip(d, clip, client.id, dt))
    toast(`Pasted ${clip.days.length} session${clip.days.length === 1 ? '' : 's'} from ${fmtDay(dt)}.`)
  }

  // ---- Chip drag-and-drop (single day → another day) ------------------------
  const dropOn = async (dt) => {
    const src = chip.current
    chip.current = null
    setDropDt(null)
    if (!src || src === dt) return
    const p = prescOn(src)
    if (!isSession(p)) return
    if (prescribedDates.has(dt) && !await confirmDialog({
      title: 'Overwrite session',
      message: `${fmtDay(dt)} already has a session — overwrite it?`,
      confirmLabel: 'Overwrite',
    })) return
    const blocks = p.blocks?.length ? p.blocks : itemsToBlocks(p.items)
    commit((d) => writePrescription(d, client.id, dt, cloneBlocksFresh(blocks), p.notes || ''))
    toast(`Copied ${fmtDay(src)} → ${fmtDay(dt)}.`)
  }

  // Shared handlers for a day cell in either view.
  const cell = (dt) => ({
    onMouseDown: (e) => {
      if (e.button !== 0 || clip) return // paste mode: a click pastes, no range-select
      drag.current = { from: dt, moved: false }
      setSel({ from: dt, to: dt })
    },
    onMouseEnter: () => {
      if (clip) return setHoverDt(dt)
      if (!drag.current) return
      drag.current.moved = true
      setSel({ from: drag.current.from, to: dt })
    },
    onMouseLeave: () => { if (clip) setHoverDt((h) => (h === dt ? null : h)) },
    onClick: () => {
      if (suppress.current) return
      if (clip) return pasteAt(dt)
      prescribe(dt)
    },
    onKeyDown: (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      if (clip) pasteAt(dt); else prescribe(dt)
    },
    onDragOver: (e) => { if (chip.current) { e.preventDefault(); setDropDt(dt) } },
    onDrop: (e) => { e.preventDefault(); dropOn(dt) },
  })

  // The draggable session chip. Stops mousedown so grabbing it doesn't start a
  // range-select on the cell underneath.
  const sessionChip = (dt, name) => (
    <div className="plan-session" title={`${name} — drag onto another day to copy`}
      draggable onMouseDown={(e) => e.stopPropagation()}
      onDragStart={(e) => { chip.current = dt; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', dt) }}
      onDragEnd={() => { chip.current = null; setDropDt(null) }}>
      {name}
    </div>
  )

  const cls = (dt, base) =>
    base
    + (dt === today ? ' today' : '')
    + (inSel(dt) ? ' sel' : '')
    + (dropDt === dt ? ' drop' : '')
    + (clip && pasteTargets.includes(dt) ? ' paste-hint' : '')

  return (
    <div className={bare ? 'pw-planner-bare' : 'card' + (isFeatured ? ' planner-featured' : '') + (isMedium ? ' planner-medium' : '')}>
      <div className="flex between" style={{ flexWrap: 'wrap', gap: 8 }}>
        {bare ? (
          <span className="pw-sublabel">{view === 'month' ? 'MONTH PLANNER' : 'WEEK PLANNER'}</span>
        ) : (
          <button className="planner-collapse" onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed} aria-label={collapsed ? 'Expand workout planner' : 'Collapse workout planner'}>
            <span className="pc-caret" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
            <span className="section-title" style={{ margin: 0, fontSize: isFeatured ? 19 : undefined }}>Workout Planner</span>
          </button>
        )}
        {collapsed ? (
          <span className="planner-summary muted">{summary}</span>
        ) : (
          <div className="flex gap" style={{ flexWrap: 'wrap' }}>
            {!bare && <SegToggle options={onDay ? [['day', 'Day'], ['week', 'Week'], ['month', 'Month']] : [['week', 'Week'], ['month', 'Month']]} value={view} onChange={(v) => (v === 'day' ? onDay() : setView(v))} ariaLabel="Calendar view" />}
            {view === 'month' ? (
              <div className="flex gap">
                <Button variant="ghost" size="sm" onClick={() => setAnchor(addMonths(anchor, -1))} aria-label="Previous month">←</Button>
                <Button variant="ghost" size="sm" onClick={() => setAnchor(today)}>Today</Button>
                <Button variant="ghost" size="sm" onClick={() => setAnchor(addMonths(anchor, 1))} aria-label="Next month">→</Button>
              </div>
            ) : (
              <div className="flex gap">
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(weekStart - 7)} aria-label="Previous week">←</Button>
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(0)}>This week</Button>
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(weekStart + 7)} aria-label="Next week">→</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection bar — appears while a dragged span is held */}
      {!collapsed && !clip && selDates.length > 1 && (
        <div className="plan-bar sel">
          <span><b>{selDates.length}</b> days selected · <b>{selSessions}</b> session{selSessions === 1 ? '' : 's'}</span>
          <div className="nav-spacer" />
          <Button size="sm" disabled={!selSessions} onClick={doCopy}>Copy</Button>
          <Button variant="ghost" size="sm" className="plan-del" disabled={!selSessions} onClick={doDelete}>Delete</Button>
          <Button variant="ghost" size="sm" onClick={() => setSel(null)}>Clear</Button>
        </div>
      )}

      {/* Clipboard bar — click any day to paste, or fan out to other clients */}
      {!collapsed && clip && (
        <div className="plan-bar clip">
          <span>
            <b>{clip.days.length}</b> session{clip.days.length === 1 ? '' : 's'} copied
            {clip.sourceClientId !== client.id ? <> from <b>{clip.sourceClientName}</b></> : null} — click a day to paste
          </span>
          <div className="nav-spacer" />
          <Button variant="ghost" size="sm" onClick={() => openModal(<PastePlanModal clip={clip} />)}>Paste to clients…</Button>
          <Button variant="ghost" size="sm" onClick={clearClip}>Cancel</Button>
        </div>
      )}

      {collapsed ? null : view === 'month' ? (
        <>
          <div style={{ margin: '10px 0 8px', fontSize: 14, fontWeight: 700 }}>
            {monthLabel(anchor)} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
              — {clip ? 'click a day to paste' : 'click a day to prescribe · drag across days to select · drag a session onto another day to copy'}
            </span>
          </div>
          <div className="plan-dow">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="plan-month">
            {monthGridDates(anchor).map((dt) => {
              const { vl, name } = dayData(dt)
              return (
                <div key={dt} className={cls(dt, 'plan-cell') + (dt.slice(0, 7) !== anchor.slice(0, 7) ? ' out' : '')}
                  role="button" tabIndex={0} aria-label={`${clip ? 'Paste to' : 'Prescribe'} ${dt}`} {...cell(dt)}>
                  <div className="pc-date">{+dt.slice(8, 10)}{dt === today && <span className="pc-today">today</span>}</div>
                  {name && sessionChip(dt, name)}
                  {vl ? <div className="plan-vl">VL {fmtVL(vl)}</div> : null}
                  {/* Load metrics for a day exist only once its session RPE is logged;
                      future days therefore show no ACWR/Mono/Strain projections. */}
                  {(dt === today || (dt > today && intMap[dt] !== undefined)) && <DayMetrics {...dayMetrics(db, client.id, dt, intMap)} />}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0' }}>
            Week of {fmtDate(weekDates(weekStart, tz)[0])}
            {' — '}{clip ? 'click a day to paste' : 'click a day to prescribe · drag across days to select · drag a session onto another day to copy'}
          </div>
          <div className="plan-week">
            {weekDates(weekStart, tz).map((dt, i) => {
              const { vl, name } = dayData(dt)
              return (
                <div key={dt} className={cls(dt, 'plan-day')}
                  role="button" tabIndex={0} aria-label={`${clip ? 'Paste to' : 'Prescribe'} ${DOW[i]} ${dt}`} {...cell(dt)}>
                  <div className="pd-date">{DOW[i]} {+dt.slice(8, 10)}</div>
                  {name ? sessionChip(dt, name) : <div className="plan-rest muted">Rest / unplanned</div>}
                  {vl ? <div className="plan-vl">VL {fmtVL(vl)}</div> : <div className="plan-vl" style={{ color: 'var(--muted)' }}>—</div>}
                  {/* Load metrics for a day exist only once its session RPE is logged;
                      future days therefore show no ACWR/Mono/Strain projections. */}
                  {(dt === today || (dt > today && intMap[dt] !== undefined)) && <DayMetrics {...dayMetrics(db, client.id, dt, intMap)} />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
