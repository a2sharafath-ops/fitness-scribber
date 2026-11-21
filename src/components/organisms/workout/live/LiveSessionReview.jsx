import { useState } from 'react'
import { sessionRows, liveBlocks, SESSION_SECTIONS, adjustedSetDuration, prescribedSetDuration } from '../../../../lib/liveSession'
import { ensureSetRows, secToClock } from '../../../../lib/workout'
import { toDisp } from '../../../../lib/units'

export default function LiveSessionReview({ session, units }) {
  const [view, setView] = useState('original')
  const original = session.liveState.original
  const originalCount = SESSION_SECTIONS.flatMap((section) => original[section] || []).reduce((sum, item) => sum + ensureSetRows(item).length, 0)
  const rows = sessionRows(session)
  const originalItems = SESSION_SECTIONS.flatMap((section) => (original[section] || []).map((item, index) => ({ ...item, id: item.id || `${session.id}:${section}:${index}` })))
  const adjustedCount = liveBlocks(session).reduce((sum, block) => sum + block.items.reduce((count, item) => count + item.setRows.filter((row) => row.done || !block.skipped && !item.skipped && !row.skipped).length, 0), 0)
  const blocks = view === 'original' ? session.liveState.originalBlocks.map((block) => ({ ...block,
    items: originalItems.filter((item) => block.exerciseIds.includes(item.id)) })) : liveBlocks(session)
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
    return [duration != null ? secToClock(duration) : row.pReps != null ? `${row.pReps}${row.pRepsMax != null && row.pRepsMax !== row.pReps ? '–' + row.pRepsMax : ''} reps` : 'No rep target',
      row.pLoadKg != null ? `${toDisp(row.pLoadKg, units)} ${units}` : null,
      view === 'adjusted' && skipped ? 'Skipped' : null].filter(Boolean).join(' · ')
  }
  return <aside className="ls-review"><h2>Session summary</h2><div className="ls-stats">
    {[[originalCount, 'Originally planned sets'], [adjustedCount, 'Adjusted sets'], [rows.filter((row) => row.done).length, 'Sets logged']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
  </div><div className="ls-tabs" role="group" aria-label="Session summary view">{[['original', 'Original plan'], ['adjusted', 'Adjusted'], ['actual', 'Actual']].map(([key, label]) =>
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
