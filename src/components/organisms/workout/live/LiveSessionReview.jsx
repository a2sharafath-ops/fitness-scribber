import { useState } from 'react'
import { sessionRows, liveBlocks, SESSION_SECTIONS, adjustedSetDuration, prescribedSetDuration } from '../../../../lib/liveSession'
import { ensureSetRows, runBlocks, secToClock } from '../../../../lib/workout'
import { toDisp, unitName } from '../../../../lib/units'

function originalBlocks(session) {
  const { original, originalBlocks: blocks } = session.liveState
  if (!Array.isArray(blocks)) return runBlocks(original).map(block => ({ ...block, id: block.key }))
  const items = new Map(SESSION_SECTIONS.flatMap(section => (original[section] || []).map((item, index) => {
    const id = item.id || `${session.id}:${section}:${index}`
    return [id, { ...item, id }]
  })))
  return blocks.map(block => ({ ...block, items: block.exerciseIds.map(id => items.get(id)).filter(Boolean) }))
}

function setTarget(row, duration, units) {
  return [duration != null ? secToClock(duration) : row.pReps != null ? `${row.pReps}${row.pRepsMax != null && row.pRepsMax !== row.pReps ? '–' + row.pRepsMax : ''} reps` : 'No rep target',
    row.pLoadKg != null ? `${toDisp(row.pLoadKg, units)} ${unitName(units)}` : null].filter(Boolean).join(' · ')
}

export function OriginalWorkoutPlan({ session, units }) {
  const blocks = originalBlocks(session).filter(block => block.items.length)
  if (!blocks.length) return <p className="muted">No exercises in the original plan.</p>
  return <div className="training-day-blocks">{blocks.map(block =>
    <section key={block.id} className="training-day-block" aria-label={block.title}>
      <h3>{block.title}</h3>
      {block.items.map((item, index) => <div key={item.id || index} className="training-day-exercise">
        <strong>{item.name}</strong>
        <ol>{ensureSetRows(item).map((row, i) => <li key={row.id || i}>Set {i + 1}: {setTarget(row, prescribedSetDuration(item, row), units)}</li>)}</ol>
      </div>)}
    </section>)}</div>
}

export default function LiveSessionReview({ session, units }) {
  const [view, setView] = useState('original')
  const original = session.liveState.original
  const originalCount = SESSION_SECTIONS.flatMap((section) => original[section] || []).reduce((sum, item) => sum + ensureSetRows(item).length, 0)
  const rows = sessionRows(session)
  const adjustedCount = liveBlocks(session).reduce((sum, block) => sum + block.items.reduce((count, item) => count + item.setRows.filter((row) => row.done || !block.skipped && !item.skipped && !row.skipped).length, 0), 0)
  const blocks = view === 'original' ? originalBlocks(session) : liveBlocks(session)
  const line = (item, row, skipped) => {
    if (view === 'actual') {
      if (!row.done) return skipped ? 'Skipped' : 'Not logged'
      const performed = row.mode === 'duration'
        ? row.durationSeconds == null ? 'Duration not recorded' : secToClock(row.durationSeconds)
        : row.reps == null ? 'Reps not recorded' : `${row.reps} reps`
      return [performed,
        row.load != null ? `${toDisp(row.load, units)} ${units}` : null,
        row.effort != null ? `${row.effort} ${row.effortType || 'RIR'}` : null,
      ].filter(Boolean).join(' · ')
    }
    const duration = view === 'original' ? prescribedSetDuration(item, row) : adjustedSetDuration(row)
    const target = setTarget(row, duration, units)
    return view === 'adjusted' && skipped ? `${target} · Skipped` : target
  }
  return <aside className="ls-review"><h2>Session summary</h2><div className="ls-stats">
    {[[originalCount, 'Originally planned sets'], [adjustedCount, 'Adjusted sets'], [rows.filter((row) => row.done).length, 'Sets logged']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
  </div><div className="ls-tabs ls-review-tabs" role="group" aria-label="Session summary view">{[['original', 'Original plan'], ['adjusted', 'Adjusted'], ['actual', 'Actual']].map(([key, label]) =>
    <button type="button" key={key} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}</div>
    {session.liveState.recoveredInProgress && <p className="ls-hint">Original snapshot captured when this saved session first opened in the updated logger.</p>}
    {blocks.map((block) => <section key={block.id}><h3>{block.title}{view === 'adjusted' && block.skipped ? ' · Skipped' : ''}</h3>{block.items.map((item) => {
      const sets = ensureSetRows(item)
      return <div className="ls-review-exercise" key={item.id}><strong>{item.name}{view === 'adjusted' && item.skipped ? ' · Upcoming skipped' : ''}</strong>
        <ol className="ls-review-sets">{sets.map((row, index) => <li key={row.id || index}>
          <span>Set {index + 1}</span><span>{line(item, row, !row.done && (row.skipped || item.skipped || block.skipped))}</span>
        </li>)}</ol></div>
    })}</section>)}
  </aside>
}
