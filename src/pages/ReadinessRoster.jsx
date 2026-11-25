import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Icon from '../components/atoms/Icon'
import { useData } from '../store/DataContext'
import { bookedCompletion, dashboardClientPath, readinessRoster } from '../lib/dashboard'
import { fmtDate } from '../lib/dates'
import './ReadinessRoster.css'

function ReadinessCard({ row, today, completion }) {
  const { client, date, readiness } = row
  const description = useId()
  const current = date === today
  const status = !date ? 'No check-in on record'
    : !current ? 'Older check-in'
      : readiness?.label ?? 'Checked in without a score'

  return <li>
    <Link className="card rr-card" to={dashboardClientPath(client.id, '/check-ins?view=wellness')}
      aria-label={`View check-ins for ${client.name}`} aria-describedby={description}>
      <div className="rr-client">
        <span aria-hidden="true"><Avatar name={client.name} size={40} /></span>
        <div><h2>{client.name}</h2>{client.goal && <p>{client.goal}</p>}</div>
      </div>
      <div className="rr-reading" id={description}>
        <div className="rr-score">
          <span>{current ? 'Today’s readiness' : 'Latest readiness'}</span>
          {readiness ? <strong>{readiness.score}<small>/100</small></strong>
            : <><strong aria-hidden="true">—</strong><span className="sr-only">No readiness score</span></>}
        </div>
        <div className="rr-check-in">
          <span className="rr-status" data-tone={current && readiness ? readiness.color : 'neutral'}>{status}</span>
          {date && <time dateTime={date}>{fmtDate(date)}</time>}
        </div>
      </div>
      <small>{completion.total ? `${completion.completed} of ${completion.total} bookings completed · past 30 days` : 'No bookings in the past 30 days'}</small>
      <span className="rr-card-action" aria-hidden="true">View check-ins <Icon name="chevron-right" size={15} /></span>
    </Link>
  </li>
}

export default function ReadinessRoster({ today }) {
  const { db } = useData()
  const [query, setQuery] = useState('')
  const rows = useMemo(() => readinessRoster(db, today), [db, today])
  const term = query.trim().toLocaleLowerCase()
  const visible = rows.filter(({ client }) => client.name.toLocaleLowerCase().includes(term))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return <section className="readiness-roster" aria-labelledby="client-readiness">
    <header className="rr-header">
      <div>
        <h1 id="client-readiness" tabIndex={-1}>Client readiness</h1>
        <p>Missing and older check-ins first, then today’s lowest scores.</p>
      </div>
      <Link className="btn ghost" to="/clients">All clients</Link>
    </header>
    <div className="rr-tools">
      <label className="rr-search">
        <Icon name="search" size={17} />
        <input type="search" aria-label="Find a client" placeholder="Find a client" value={query}
          onChange={event => setQuery(event.target.value)} />
      </label>
      <p role="status">{term ? `${visible.length} of ${rows.length} active clients`
        : `${rows.length} active ${rows.length === 1 ? 'client' : 'clients'}`}</p>
    </div>
    {visible.length ? <ul className="rr-grid" role="list" aria-label="Readiness priority">
      {visible.map(row => <ReadinessCard key={row.client.id} row={row} today={today} completion={bookedCompletion(db.sessions, today, new Set([row.client.id]))} />)}
    </ul> : <p className="card rr-empty">{rows.length ? 'No active clients match this search.' : 'No active clients to review.'}</p>}
  </section>
}
