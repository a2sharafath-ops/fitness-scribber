import Select from '../../../molecules/Select'
import LiveSessionDialog from '../../../molecules/LiveSessionDialog'
import { liveBlocks, liveExerciseUnits } from '../../../../lib/liveSession'

export default function LiveWorkoutOrder({ session, onAction, onClose }) {
  const blocks = liveBlocks(session)
  const arrows = (id, list, type, extra = {}) => {
    const index = list.findIndex((entry) => entry.id === id)
    return <><button type="button" className="ls-button" aria-label="Move up" disabled={index === 0}
      onClick={() => onAction({ type, id, beforeId: list[index - 1].id, ...extra })}>↑</button>
      <button type="button" className="ls-button" aria-label="Move down" disabled={index === list.length - 1}
        onClick={() => onAction({ type, id, beforeId: list[index + 2]?.id, ...extra })}>↓</button></>
  }
  return <LiveSessionDialog title="Reorder workout" onClose={onClose}>
    <p className="ls-hint">Changes save as you move. Supersets move together.</p>
    {blocks.map((block) => {
      const groups = liveExerciseUnits(block.items)
      return <section className="ls-order-block" key={block.id}>
        <header><h3>{block.title}</h3><div className="ls-tools">{arrows(block.id, blocks, 'move-block')}</div></header>
        {groups.map((group) => <div className="ls-order-exercise" key={group[0].id}>
          <div><strong>{group.map((item) => item.name).join(' + ')}</strong>{group.length > 1 && <small>Superset</small>}</div>
          <div className="ls-tools">{arrows(group[0].id, groups.map((unit) => unit[0]), 'move-exercise', { blockId: block.id })}</div>
          <label>Move to block<Select value={block.id} onChange={(event) => onAction({ type: 'move-exercise', id: group[0].id, blockId: event.target.value })}>
            {blocks.map((destination) => <option key={destination.id} value={destination.id}>{destination.title}</option>)}</Select></label>
          {group.map((item) => item.setRows.length > 1 && <details key={item.id}><summary>Reorder sets · {item.name}</summary>{item.setRows.map((row, index) => <div className="ls-order-set" key={row.id}>
            <span>Set {index + 1}{row.done ? ' · Done' : ''}</span><div className="ls-tools">{arrows(row.id, item.setRows, 'move-set')}</div></div>)}</details>)}
        </div>)}
      </section>
    })}
  </LiveSessionDialog>
}
