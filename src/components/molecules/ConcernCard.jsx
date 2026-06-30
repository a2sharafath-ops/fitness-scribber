import Tag from '../atoms/Tag'
import Shape from '../atoms/Shape'
import Button from '../atoms/Button'
import { fmtDate, fmtDay } from '../../lib/dates'

const SEV = { High: 'red', Medium: 'yellow', Low: 'gray' }

export default function ConcernCard({ concern, clientName, session, onResolve, onReopen, onEdit, onDelete }) {
  const x = concern
  return (
    <div className={'concern-card' + (x.status === 'Resolved' ? ' resolved' : '')}>
      <div className="flex between" style={{ marginBottom: 6 }}>
        <div className="flex gap">
          <Tag color={SEV[x.severity] || 'gray'}>
            <Shape color={SEV[x.severity] || 'gray'} /> {x.severity}
          </Tag>
          <Tag color="blue">{x.category}</Tag>
          {x.status === 'Resolved' ? <Tag color="green">Resolved</Tag> : <Tag color="orange">Open</Tag>}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>
          {fmtDate(x.date)}
        </span>
      </div>
      <div style={{ marginBottom: 6 }}>{x.text}</div>
      <div className="muted" style={{ fontSize: 12 }}>
        Raised by {x.source === 'Client' ? clientName || 'client' : 'trainer'}
        {session ? ` · re: ${fmtDay(session.date)} ${session.time} session` : ''}
      </div>
      {x.status === 'Resolved' && x.resolution && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)' }}>✔ {x.resolution}</div>
      )}
      <div className="flex gap" style={{ marginTop: 10 }}>
        {x.status === 'Open' ? (
          <Button size="sm" onClick={onResolve}>
            Mark resolved
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onReopen}>
            Reopen
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  )
}
