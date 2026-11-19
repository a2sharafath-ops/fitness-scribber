import { useState } from 'react'
import { sessionRows, liveBlocks, SESSION_SECTIONS } from '../../../../lib/liveSession'
import { ensureSetRows, secToClock, restToSec } from '../../../../lib/workout'
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
  const line = (row) => {
    if (view === 'actual') return [row.mode === 'duration' ? secToClock(row.durationSeconds || 0) : row.reps == null ? 'Reps not recorded' : `${row.reps} reps`,
      row.load != null ? `${toDisp(row.load, units)} ${units}` : null].filter(Boolean).join(' · ')
    return [row.pDurationSeconds != null ? secToClock(row.pDurationSeconds) : row.pReps != null ? `${row.pReps} reps` : 'No rep target',
      row.pLoadKg != null ? `${toDisp(row.pLoadKg, units)} ${units}` : null,
      view === 'adjusted' && row.skipped ? 'Skipped' : null].filter(Boolean).join(' · ')
  }
  return <aside className="ls-review"><h2>Session summary</h2><div className="ls-stats">
    {[[originalCount, 'Originally planned sets'], [adjustedCount, 'Adjusted sets'], [rows.filter((row) => row.done).length, 'Sets logged']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
  </div><div className="ls-tabs" role="group" aria-label="Session summary view">{[['original', 'Original plan'], ['adjusted', 'Adjusted'], ['actual', 'Actual']].map(([key, label]) =>
    <button type="button" key={key} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}</div>
    {session.liveState.recoveredInProgress && <p className="ls-hint">Original snapshot captured when this saved session first opened in the updated logger.</p>}
    {blocks.map((block) => <section key={block.id}><h3>{block.title}{view === 'adjusted' && block.skipped ? ' · Skipped' : ''}</h3>{block.items.map((item) => {
      const sets = ensureSetRows(item).map((row) => view === 'original' && item.duration ? { ...row, pDurationSeconds: restToSec(item.duration) } : row).filter((row) => view !== 'actual' || row.done)
      return <div className="ls-review-exercise" key={item.id}><strong>{item.name}{view === 'adjusted' && item.skipped ? ' · Upcoming skipped' : ''}</strong>
        <span>{sets.length ? sets.map(line).join(' / ') : 'No logged sets'}</span></div>
    })}</section>)}
  </aside>
}
