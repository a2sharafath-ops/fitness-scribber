import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import useLiveSessionLayout from '../../../hooks/useLiveSessionLayout'
import { useAuth } from '../../../store/AuthContext'
import useLiveSession from '../../../hooks/useLiveSession'
import LiveSessionMenu from '../../molecules/LiveSessionMenu'
import LiveExerciseCard from './live/LiveExerciseCard'
import LiveSessionReview from './live/LiveSessionReview'
import LiveSessionEditor from './live/LiveSessionEditor'
import { liveBlocks, liveExerciseUnits, liveClosed, liveElapsed, liveDockSet, locateLive, rowMode, adjustedSetDuration, finishLiveSession } from '../../../lib/liveSession'
import { secToClock } from '../../../lib/workout'
import './LiveTrainingSession.css'

export default function LiveTrainingSession({ workout, units: preferredUnits, clientName, bookingTime, exercises = [], history = [], locked, resolveTm, onPersist, onExit, onComplete }) {
  const { user } = useAuth()
  const { session, change, flush, status, error, storageFailed, reloadSaved } = useLiveSession(workout, user?.id || 'local', resolveTm, onPersist)
  const [now, setNow] = useState(Date.now())
  const [editor, setEditor] = useState(null)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reviewUnits, setReviewUnits] = useState(null)
  const readOnly = liveClosed(session)
  const { sessionRef, headerRef, dockRef, markerRef, compact, dockBounds } = useLiveSessionLayout(readOnly)
  const units = reviewUnits || session.liveState.settings.units || preferredUnits || 'kg'
  const blocks = liveBlocks(session)
  const pending = liveDockSet(session)
  const nextDuration = pending ? adjustedSetDuration(pending.row) : null
  const nextLabel = { stop: 'Stop timer', start: 'Start timed set', done: 'Mark set done', log: 'Log next set' }[pending?.action]
  const seconds = Math.floor(liveElapsed(session, now) / 1000)
  const clock = new Date(seconds * 1000).toISOString().slice(seconds >= 3600 ? 11 : 14, 19)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer) }, [])
  const openEditor = (next) => { setActionError(''); setEditor(next) }
  const act = (action) => {
    setActionError('')
    if (action.type === 'done' && !action.actual) {
      const { row } = locateLive(session, action.id)
      const metric = rowMode(row) === 'duration' ? row.durationSeconds : row.reps
      if (!row.done && (metric == null || row.pLoadKg != null)) {
        openEditor({ kind: 'complete-set', rowId: row.id })
        return false
      }
    }
    try { change(action); return true }
    catch (failure) {
      setActionError(failure.message)
      return false
    }
  }
  const downloadRecovery = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `workout-recovery-${session.date}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  const leave = async () => { setBusy(true); const ok = await flush(); setBusy(false); if (ok) onExit?.() }
  const finish = async () => {
    setBusy(true)
    if (await flush()) { setEditor(null); onComplete(finishLiveSession(session)) }
    setBusy(false)
  }
  const discard = async () => {
    setBusy(true)
    const saved = act({ type: 'discard' }) && await flush()
    setBusy(false)
    if (saved) { setEditor(null); onExit?.() }
  }
  const jump = (row) => {
    const element = document.getElementById('live-set-' + row.id)
    element?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    element?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true })
  }
  const nextAction = () => {
    jump(pending.row)
    if (pending.action === 'start' || pending.action === 'stop') act({ type: 'set-timer', id: pending.row.id })
    else if (pending.action === 'done') act({ type: 'done', id: pending.row.id })
    else openEditor({ kind: 'complete-set', rowId: pending.row.id })
  }
  return <div className="ls-session" ref={sessionRef}>
    <span className="ls-sticky-marker" ref={markerRef} aria-hidden="true" />
    <header className={'ls-header' + (compact ? ' is-compact' : '')} ref={headerRef}><div className="ls-header-main"><div className="ls-clock-line"><strong className="ls-clock" role="timer" aria-label="Workout elapsed time">{clock}</strong><span className="ls-status">{session.status === 'discarded' ? 'Discarded' : session.liveState.clock.paused ? 'Paused' : 'In progress'}</span></div>
      <h1 title={session.title}>{session.title}</h1><p className="ls-client-label">{clientName || 'Training session'} · {session.date}{bookingTime && ` · ${bookingTime} booking`}</p></div>
      <div className="ls-header-tools"><div className="ls-tools"><div className="ls-tabs ls-unit-switch" aria-label="Weight units">{['kg', 'lb'].map((unit) => <button key={unit} type="button" aria-pressed={units === unit} onClick={() => readOnly ? setReviewUnits(unit) : act({ type: 'settings', settings: { units: unit } })}>{unit}</button>)}</div>
        {!readOnly && <div className="ls-workout-actions">
          <button type="button" className="ls-button ls-pause" onClick={() => act({ type: 'pause' })}
            aria-label={session.liveState.clock.paused ? 'Resume workout' : 'Pause workout'}>{session.liveState.clock.paused ? 'Resume' : 'Pause'}</button>
          <button type="button" className="ls-button ls-finish" onClick={() => openEditor({ kind: 'finish' })}>Finish workout</button>
        </div>}
        <LiveSessionMenu label="Workout options">{!readOnly && <>
          {!locked && <button type="button" role="menuitem" onClick={() => openEditor({ kind: 'order' })}>Reorder workout…</button>}
          <button type="button" role="menuitem" onClick={() => openEditor({ kind: 'settings' })}>Workout settings…</button>
          <hr /><button type="button" role="menuitem" className="ls-danger-text" onClick={() => openEditor({ kind: 'discard' })}>Discard workout…</button></>}
          <button type="button" role="menuitem" disabled={busy} onClick={leave}>{readOnly ? 'Close session' : 'Save & exit'}</button>
        </LiveSessionMenu></div>
        <p className={'ls-save ' + status} role="status">{status === 'failed' ? 'Save failed' : status === 'saving' ? 'Saving…' : 'Saved'}{storageFailed ? ' · Browser recovery unavailable' : ''}</p>
      </div></header>
    {(error || storageFailed) && <div className="ls-save-error" role="alert">{error || 'Browser storage is unavailable. Keep this session open until it is saved.'}
      <div className="ls-tools"><button type="button" className="ls-button" onClick={downloadRecovery}>Download draft</button><button type="button" className="ls-button" onClick={flush}>Retry save</button><button type="button" className="ls-button" onClick={() => openEditor({ kind: 'reload' })}>Load saved session</button></div></div>}
    {actionError && !editor && <p role="alert" className="ls-form-error">{actionError}</p>}
    <div className="ls-layout"><div className="ls-blocks"><h2>Live session</h2>
      {blocks.map((block) => <section className="ls-block" key={block.id} aria-label={block.title}>
        <header className="ls-block-head"><h2>{block.title}{block.skipped ? ' · Skipped' : ''}</h2>{!readOnly && !locked && <LiveSessionMenu label={`${block.title} block options`}>
          <button type="button" role="menuitem" onClick={() => openEditor({ kind: 'order' })}>Reorder workout…</button>
          <button type="button" role="menuitem" className="ls-danger-text" onClick={() => act({ type: 'skip-block', id: block.id })}>{block.skipped ? 'Restore block' : 'Skip upcoming sets'}</button>
        </LiveSessionMenu>}</header>
        {liveExerciseUnits(block.items).map((group) => <div key={group[0].id} className={group.length > 1 ? 'ls-superset' : ''}>
          {group.length > 1 && <div className="ls-superset-label">↔ Superset</div>}
          {group.map((exercise) => <LiveExerciseCard key={exercise.id} session={session} exercise={exercise} block={block} units={units} now={now}
            readOnly={readOnly} locked={locked} onAction={act} onEdit={openEditor} />)}
        </div>)}
        {!readOnly && !locked && !block.skipped && <button type="button" className="ls-button ls-add-exercise" onClick={() => openEditor({ kind: 'add-exercise', blockId: block.id })}>+ Add exercise</button>}
      </section>)}
      {!readOnly && !locked && <button type="button" className="ls-button" onClick={() => openEditor({ kind: 'add-block' })}>+ Add block</button>}
    </div><LiveSessionReview session={session} units={units} /></div>
    {!readOnly && typeof document !== 'undefined' && createPortal(<div className="ls-current" aria-label="Current exercise" ref={dockRef} style={dockBounds || undefined}><div><small>{pending?.action === 'stop' ? 'Timing set' : pending?.action === 'done' ? 'Ready to log' : 'Next set'}{pending?.block ? ` · ${pending.block.title}` : ''}</small>
      {pending?.row ? <><button type="button" className="ls-current-name" title="Jump to set" onClick={() => jump(pending.row)}>{pending.item.name}</button>
        <p>Set {pending.item.setRows.indexOf(pending.row) + 1} of {pending.item.setRows.length} · {pending.action === 'done' ? secToClock(pending.row.durationSeconds) : nextDuration != null ? secToClock(nextDuration) : `${pending.row.pReps ?? '—'}${pending.row.pRepsMax != null && pending.row.pRepsMax !== pending.row.pReps ? '–' + pending.row.pRepsMax : ''} reps`}</p></> : <strong>No sets left to log</strong>}</div>
      <div className="ls-live-hr"><strong>♥ — <small>bpm</small></strong><small>No live HR feed</small></div>
      {pending?.row ? <button type="button" className="ls-button primary" disabled={session.liveState.clock.paused && pending.action === 'start'} onClick={nextAction}>
        {nextLabel}</button> : <button type="button" className="ls-button primary" onClick={() => openEditor({ kind: 'finish' })}>Finish workout</button>}
    </div>, document.body)}
    {editor && <LiveSessionEditor key={JSON.stringify(editor)} editor={editor} session={session} units={units} exercises={exercises} history={history} onAction={act}
      onClose={() => setEditor(null)} onReload={reloadSaved} onFinish={finish} onDiscard={discard} busy={busy} error={actionError || error} />}
  </div>
}
