import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import { ClientForm } from '../components/organisms/forms/ClientForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { initials } from '../lib/format'
import { addDays, fmtDate, todayISO } from '../lib/dates'
import { dashboardClientPath } from '../lib/dashboard'
import { clientRoster, rosterResults, ROSTER_PAGE_SIZE } from '../lib/clientRoster'
import './ClientsPage.css'

const dateLabel = (date, today) => date === today ? 'Today' : date === addDays(today, -1) ? 'Yesterday' : fmtDate(date)

function ReviewLink({ item, clientName }) {
  return <Link className={`cr-review cr-${item.tone}`} to={item.path} aria-label={`${item.reason} for ${clientName}`}><span>{item.reason}</span><span aria-hidden="true">→</span></Link>
}

function ClientRow({ row, index, today }) {
  const { client, program, programs, completion, latest, reviews, isNew } = row
  const inactive = client.status !== 'Active'
  const primaryReview = reviews[0]
  const bookingDescription = `${completion.completed} of ${completion.total} past bookings completed; ${completion.missed} missed; ${completion.pending} need a status update. ${fmtDate(addDays(today, -30))}–${fmtDate(addDays(today, -1))}.`
  return <tr>
    <td className="cr-client-cell"><div className="cr-identity">
      <span className={`cr-avatar ${inactive ? 'cr-inactive' : ['','cr-rose','cr-lilac','cr-sand'][index % 4]}`} aria-hidden="true">{initials(client.name)}</span>
      <div className="cr-identity-text">
        <Link className="cr-client-link" to={dashboardClientPath(client.id)}>{client.name}<span className="cr-arrow" aria-hidden="true">→</span></Link>
        <span className="cr-email">{client.email || 'No email recorded'}</span>
        {inactive ? <span className="cr-mini-badge cr-inactive">{client.status || 'Inactive'}</span> : isNew && <span className="cr-mini-badge">New client</span>}
      </div>
    </div></td>
    <td className="cr-program-cell"><span className="cr-mobile-label">Program</span>
      {program ? <><Link className="cr-program-name" to={program.path} aria-label={`Open ${program.name} for ${client.name}`}>{program.name}</Link><span className={`cr-cell-note ${program.upcoming ? 'cr-upcoming' : ''}`}>{program.note}</span></>
        : inactive ? <span className="cr-muted">No current program</span> : <><Link className="cr-assign" to={`/workouts?clientId=${encodeURIComponent(client.id)}`} aria-label={`Assign program to ${client.name}`}>＋ Assign program</Link><span className="cr-cell-note">No current or upcoming program</span></>}
      {programs.length > 1 && <Link className="cr-more-programs" to={dashboardClientPath(client.id, '/training')}>＋ {programs.length - 1} more program{programs.length > 2 ? 's' : ''}</Link>}
    </td>
    <td className="cr-booked-cell"><span className="cr-mobile-label">Booked sessions · 30 days</span>
      {completion.total ? <><Link className="cr-completion" to={dashboardClientPath(client.id, '/progress#attendance')} aria-label={`Booked completion for ${client.name}: ${bookingDescription}`} title={bookingDescription}>{completion.completed} <span>/ {completion.total}</span></Link><div className="cr-bar" aria-hidden="true"><i style={{ width: `${completion.completed / completion.total * 100}%` }} /></div><span className="cr-cell-note">completed</span></> : <span className="cr-muted">No past bookings</span>}
    </td>
    <td className="cr-activity-cell"><span className="cr-mobile-label">Latest record</span>
      {latest ? <>{latest.path ? <Link className="cr-latest" to={latest.path} aria-label={`${latest.source} for ${client.name}, ${fmtDate(latest.date)}`}>{dateLabel(latest.date, today)}</Link> : <span className="cr-latest">{dateLabel(latest.date, today)}</span>}<span className="cr-cell-note">{latest.source}</span></> : <span className="cr-muted">Not recorded</span>}
    </td>
    <td className={`cr-review-cell ${!primaryReview ? 'cr-no-review' : ''}`}><span className="cr-mobile-label">Review</span>
      {primaryReview ? <><ReviewLink item={primaryReview} clientName={client.name} /><div className="cr-review-footnote">{primaryReview.detail}</div>
        {reviews.length > 1 && <details className="cr-other-reviews"><summary>＋ {reviews.length - 1} more</summary><div>{reviews.slice(1).map(item => <div className="cr-other-review" key={item.key}><ReviewLink item={item} clientName={client.name} /><small>{item.detail}</small></div>)}</div></details>}
      </> : <span className="cr-muted">{inactive ? `${client.status || 'Inactive'} client` : 'No flagged items'}</span>}
    </td>
  </tr>
}

export default function ClientsPage() {
  const { db, tz } = useData()
  const { openModal } = useModal()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(() => db.clients.some(c => c.status === 'Active') ? 'active' : 'all')
  const [sort, setSort] = useState('name')
  const [unassigned, setUnassigned] = useState(false)
  const [requestedPage, setPage] = useState(1)
  const [today, setToday] = useState(() => todayISO(tz))
  const searchRef = useRef(null), listRef = useRef(null)
  useEffect(() => {
    const refresh = () => setToday(todayISO(tz))
    refresh()
    const timer = setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [tz])
  const rows = clientRoster(db, today)
  const result = rosterResults(rows, { filter, query, unassigned, sort, page: requestedPage })
  const { counts, filtered, visible, page, pages, start } = result
  const update = setter => value => { setter(value); setPage(1) }
  const reset = () => { setFilter(counts.active ? 'active' : 'all'); setQuery(''); setUnassigned(false); setPage(1) }
  const clearSearch = () => { setQuery(''); setPage(1); searchRef.current?.focus() }
  const add = () => openModal(<ClientForm />)
  const changePage = value => { setPage(value); listRef.current?.focus({ preventScroll: true }); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  return <div className="client-roster">
    <header className="cr-page-title"><div><h1>Clients</h1><p>{counts.all} total · {counts.active} active</p></div><Button onClick={add}>＋ Add client</Button></header>
    <section className="cr-card" aria-label="Client roster">
      <div className="cr-roster-top">
        <div className="cr-roster-heading"><h2><span className="cr-section-icon"><Icon name="users" size={18} /></span>Your roster</h2>
          <div className="cr-filters" role="group" aria-label="Filter clients">{[['active','Active'],['all','All clients'],['review','Needs review'],['inactive','Inactive']].map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => update(setFilter)(key)}>{label}<span className="cr-count">{counts[key]}</span></button>)}</div>
        </div>
        <div className="cr-tools">
          <div className="cr-search"><Icon name="search" size={17} /><input ref={searchRef} type="search" value={query} onChange={e => update(setQuery)(e.target.value)} aria-label="Search roster" placeholder="Search name, email, goal or program…" />{query && <button className="cr-clear" type="button" onClick={clearSearch} aria-label="Clear search">×</button>}</div>
          <label className="cr-sort">Sort <select value={sort} onChange={e => update(setSort)(e.target.value)}><option value="name">Name A–Z</option><option value="recent">Latest activity</option><option value="review">Review first</option></select></label>
          <label className="cr-no-program"><input type="checkbox" checked={unassigned} onChange={e => update(setUnassigned)(e.target.checked)} />No program</label>
        </div>
        {(query || unassigned) && <div className="cr-active-query"><span>{[query.trim() ? `Search: “${query.trim()}”` : '', unassigned ? 'Without a program' : ''].filter(Boolean).join(' · ')}</span><button className="cr-text-link" type="button" onClick={reset}>Reset filters</button></div>}
      </div>
      <div ref={listRef} className="cr-results" tabIndex={-1} aria-label="Roster results">
        {visible.length ? <table aria-label="Client roster results"><colgroup><col style={{ width: '27%' }} /><col style={{ width: '23%' }} /><col style={{ width: '14%' }} /><col style={{ width: '16%' }} /><col style={{ width: '20%' }} /></colgroup>
          <thead><tr><th scope="col">Client</th><th scope="col">Program</th><th scope="col">Booked sessions<small>Past 30 days</small></th><th scope="col">Latest record</th><th scope="col">Review</th></tr></thead>
          <tbody>{visible.map((row, index) => <ClientRow key={row.client.id} row={row} index={index} today={today} />)}</tbody>
        </table> : <div className="cr-empty"><span className="cr-empty-icon"><Icon name={counts.all ? 'search' : 'users'} size={26} /></span><h3>{counts.all ? 'No clients match' : 'Meet your first client'}</h3><p>{counts.all ? 'Try another name or reset the filters.' : 'Add a client to start planning and tracking their training.'}</p><Button variant={counts.all ? 'ghost' : 'primary'} onClick={counts.all ? reset : add}>{counts.all ? 'Reset filters' : '＋ Add client'}</Button></div>}
      </div>
      {!!visible.length && <footer className="cr-roster-foot"><span role="status">{start + 1}–{Math.min(start + ROSTER_PAGE_SIZE, filtered.length)} of {filtered.length} {filter === 'active' ? 'active ' : ''}clients</span><div className="cr-pagination"><button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => changePage(page - 1)}>←</button><span>Page {page} of {pages}</span><button type="button" aria-label="Next page" disabled={page === pages} onClick={() => changePage(page + 1)}>→</button></div></footer>}
    </section>
    <p className="cr-bottom-note">Select a client to open their Overview.</p>
  </div>
}
