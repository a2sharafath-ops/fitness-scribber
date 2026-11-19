import LiveSessionMenu from '../../../molecules/LiveSessionMenu'
import LiveSetRow from '../../../molecules/LiveSetRow'

export default function LiveExerciseCard({ session, exercise, block, units, now, readOnly, locked, onAction, onEdit }) {
  const pending = exercise.setRows.some((row) => !row.done && !row.skipped)
  const partners = block.items.filter((item) => item.id !== exercise.id && !item.supersetId && !item.skipped)
  const edit = (kind, row) => onEdit({ kind, exerciseId: exercise.id, blockId: block.id, rowId: row?.id })
  return <article className="ls-exercise" aria-label={exercise.name}>
    <header className="ls-exercise-head"><div><h3>{exercise.name}</h3><p>{exercise.setRows.length} {exercise.setRows.length === 1 ? 'set' : 'sets'}
      {exercise.replaces && ' · Replacement'}{exercise.replacedBy && ' · Replaced'}{exercise.skipped && ' · Upcoming sets skipped'}</p></div>
      <div className="ls-tools">{!readOnly && !exercise.skipped && !block.skipped && <button type="button" className="ls-button ls-rest-toggle" aria-pressed={!!exercise.restEnabled}
        onClick={() => onAction({ type: 'rest-toggle', id: exercise.id })}>{exercise.restEnabled ? 'Rest on' : 'Rest'}</button>}
        <LiveSessionMenu label={`${exercise.name} options`}>
          {!readOnly && !locked && !exercise.skipped && pending && <button type="button" role="menuitem" onClick={() => edit('replace')}>Replace exercise…</button>}
          {!readOnly && !locked && (exercise.supersetId ? <button type="button" role="menuitem" onClick={() => onAction({ type: 'unlink', id: exercise.id })}>Unlink superset</button> :
            partners.length > 0 && !exercise.skipped && <button type="button" role="menuitem" onClick={() => edit('superset')}>Create superset…</button>)}
          <button type="button" role="menuitem" onClick={() => edit('about')}>About exercise</button>
          {!readOnly && <button type="button" role="menuitem" onClick={() => edit('rest')}>Rest duration…</button>}
          {!readOnly && !locked && <><hr /><button type="button" role="menuitem" onClick={() => edit('order')}>Reorder workout…</button>
            <button type="button" role="menuitem" className="ls-danger-text" onClick={() => onAction({ type: 'skip-exercise', id: exercise.id })}>{exercise.skipped ? 'Restore upcoming sets' : 'Skip upcoming sets'}</button></>}
        </LiveSessionMenu>
      </div>
    </header>
    <div className="ls-set-row ls-set-head" aria-hidden="true"><span>Set</span><span>Weight ({units})</span><span>Reps / duration</span><span>Effort</span><span /></div>
    {exercise.setRows.map((row, index) => <LiveSetRow key={row.id} row={row} index={index} exercise={exercise} block={block} session={session} units={units} now={now}
      readOnly={readOnly} onAction={onAction} onEdit={edit} />)}
    <footer className="ls-exercise-foot"><button type="button" className="ls-text" onClick={() => edit('history')}>View last performance</button>
      {!readOnly && !locked && !exercise.skipped && !block.skipped && <button type="button" className="ls-text" onClick={() => onAction({ type: 'add-set', id: exercise.id })}>+ Add set</button>}</footer>
    <label className="ls-note">Note / reflection<textarea rows={1} value={exercise.note || ''} disabled={readOnly}
      onChange={(event) => onAction({ type: 'note', id: exercise.id, note: event.target.value })} placeholder="Form cues, pain or adjustments…" /></label>
  </article>
}
