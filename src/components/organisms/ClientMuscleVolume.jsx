import { useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import ModalShell from '../molecules/ModalShell'
import { addDays, fmtDate, todayISO } from '../../lib/dates'
import { MUSCLES, WORKING_GROUPS, muscleVolume, reviewMuscleSet } from '../../lib/muscleVolume'
import { addMuscleVolumeDemo, isMuscleVolumeDemo } from '../../lib/muscleVolumeDemo'
import bodyImage from '../../assets/muscle-body-outline.png'
import regions from '../../assets/muscle-body-regions.json'
import './ClientMuscleVolume.css'

const palette = ['#d4eee1', '#9cd3b8', '#55b393', '#21876e', '#075642']
const fmt = (n) => n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 1 })
const monday = (date) => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7))
const surfaceNames = new Set(regions.map(([name]) => name))
const blank = (muscle) => ({ muscle, directSets: 0, indirectSets: 0, volume: null, missingVolumeSets: 0, observations: [] })

function ReviewSet({ record, clientId }) {
  const { commit } = useData()
  const [group, setGroup] = useState(record.group || '')
  const [purpose, setPurpose] = useState(['working', 'warmup'].includes(record.purpose) ? record.purpose : '')
  const [message, setMessage] = useState('')
  const save = () => {
    let applied = false
    commit((draft) => { applied = reviewMuscleSet(draft, clientId, record, group, purpose) })
    setMessage(applied ? 'Review applied locally; check the save status above.' : 'This record changed. Reload the review before saving.')
  }
  return <div className="muscle-review-row">
    <span><strong>{record.name}</strong><small>{fmtDate(record.date)} · {record.setIndex == null ? `${record.sets} recorded sets` : `Set ${record.setIndex + 1}`} · {record.reason}</small></span>
    <label>Lift group<select value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Choose group</option>{WORKING_GROUPS.map((name) => <option key={name}>{name}</option>)}</select></label>
    <label>Set type<select value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="">Choose type</option><option value="working">Working</option><option value="warmup">Warm-up</option></select></label>
    <button type="button" className="btn" disabled={!group || !purpose} onClick={save}>Save classification</button>
    {message && <small role="status">{message}</small>}
  </div>
}

function MuscleDetailModal({ muscle, metric, start, end }) {
  const { closeModal } = useModal()
  const direct = metric === 'sets' ? muscle.directSets : muscle.volume
  const missing = metric === 'load' && muscle.missingVolumeSets > 0
  return <ModalShell title={muscle.muscle} onClose={closeModal}>
    <div className="muscle-modal">
      <p className="muscle-modal-period">{fmtDate(start)}–{fmtDate(end)}</p>
      <div className="muscle-modal-totals"><div><strong>{fmt(direct)}</strong><span>{metric === 'sets' ? 'direct sets' : `kg·reps${missing ? ' · partial' : ''}`}</span></div><div><strong>{muscle.indirectSets}</strong><span>assisting sets</span></div></div>
      {muscle.observations.length ? <div className="muscle-table-scroll" tabIndex={0} role="region" aria-label={`${muscle.muscle} exercise records; scroll horizontally`}>
        <table><caption>{muscle.muscle} · completed working sets</caption><thead><tr><th scope="col">Exercise / source</th><th scope="col">Actuals</th><th scope="col">Exposure</th></tr></thead><tbody>
          {muscle.observations.map((r) => <tr key={r.key}><th scope="row">{r.name}<small>{fmtDate(r.date)} · {r.group}<br />{r.source} · {r.targets.direct.includes(muscle.muscle) ? 'Direct' : 'Assisting'}</small></th><td>{r.sets} × {fmt(r.reps)} reps<br />{fmt(r.load)} kg</td><td>{r.targets.direct.includes(muscle.muscle) && metric === 'load' ? r.volume == null ? 'Unknown' : `${fmt(r.volume)} kg·reps` : `${r.sets} ${r.sets === 1 ? 'set' : 'sets'}`}</td></tr>)}
        </tbody></table>
      </div> : <p className="muscle-notice">No completed working sets recorded for this muscle in this week.</p>}
      {missing && <p className="muscle-notice">{muscle.missingVolumeSets} direct sets lack reps or load. The displayed volume is a known subtotal.</p>}
      <p className="muscle-modal-note">Exercise load can appear under several muscles. Assisting sets stay separate.</p>
    </div>
  </ModalShell>
}

export default function ClientMuscleVolume({ clientId }) {
  const navigate = useNavigate()
  const { openModal } = useModal()
  const { db, tz, dbIssues, saveStatus, refresh, commit } = useData()
  const today = todayISO(tz)
  const [anchor, setAnchor] = useState(today)
  const [metric, setMetric] = useState('sets')
  const [hover, setHover] = useState(null)
  const [retryError, setRetryError] = useState('')
  const [retrying, setRetrying] = useState(false)
  const start = monday(anchor), end = addDays(start, 6)
  const id = useId().replaceAll(':', '')
  const report = useMemo(() => muscleVolume(db, clientId, start, end, { workingOnly: true }), [db, clientId, start, end])
  const muscles = MUSCLES.map((name) => report.muscles.find((m) => m.muscle === name) || blank(name))
  const byName = Object.fromEntries(muscles.map((m) => [m.muscle, m]))
  const value = (m) => metric === 'sets' ? m.directSets : m.volume
  const max = Math.max(0, ...muscles.map((m) => value(m) || 0))
  const unavailable = (m) => metric === 'load' && m.directSets > 0 && m.volume == null
  const partial = (m) => metric === 'load' && m.missingVolumeSets > 0
  const hoverValue = (m) => metric === 'sets' ? `${m.directSets} ${m.directSets === 1 ? 'set' : 'sets'}` : !m.directSets ? 'No direct sets' : m.volume == null ? 'Load unknown' : `${fmt(m.volume)} kg·reps${partial(m) ? ' · partial' : ''}`
  const text = (m) => `${m.muscle}: ${metric === 'sets' ? `${m.directSets} direct ${m.directSets === 1 ? 'set' : 'sets'}` : hoverValue(m)}${partial(m) ? ', load incomplete' : ''}`
  const showDetail = (name) => { setHover(null); openModal(<MuscleDetailModal muscle={byName[name]} metric={metric} start={start} end={end} />, true) }
  const pointAt = (event, focus = false) => {
    const path = event.currentTarget
    const map = path.ownerSVGElement.getBoundingClientRect()
    const target = focus ? path.getBoundingClientRect() : null
    const x = focus ? target.left + target.width / 2 : event.clientX
    const y = focus ? target.top : event.clientY
    setHover({ name: path.dataset.name, x: Math.max(48, Math.min(map.width - 48, x - map.left)), y: Math.max(44, y - map.top) })
  }
  const fill = (m) => unavailable(m) ? `url(#${id}-missing)` : !m.directSets ? '#a0a0a0' : metric === 'load' && m.volume === 0 ? '#f5f7f6' : palette[Math.max(0, Math.min(4, Math.ceil((value(m) || 0) / (max || 1) * 5) - 1))]
  const review = report.excluded.filter((r) => r.reviewable)
  const missing = report.observations.filter((r) => r.volume == null).reduce((sum, r) => sum + r.sets, 0)
  const issue = dbIssues?.some((i) => ['workouts', 'exercises', 'database connection', 'local storage'].includes(i.table))
  const demoClient = (db.clients || []).find(isMuscleVolumeDemo)
  const createDemo = () => {
    let demoId
    commit((draft) => { demoId = addMuscleVolumeDemo(draft, today) })
    if (demoId) navigate(`/clients/${demoId}/progress#training-load`)
  }
  const retry = async () => { setRetrying(true); setRetryError(''); try { await refresh() } catch (e) { setRetryError(e.message || 'Could not refresh data') } finally { setRetrying(false) } }

  return <section className="muscle-report" aria-labelledby={`${id}-title`}>
    <header className="muscle-report-head"><h3 id={`${id}-title`}>Weekly muscle volume</h3>
      <div className="muscle-week"><button type="button" aria-label="Previous muscle-volume week" onClick={() => setAnchor(addDays(start, -7))}>←</button><label><span className="sr-only">Week containing</span><input type="date" aria-label="Muscle-volume week containing" value={anchor} max={today} onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && e.target.value <= today) setAnchor(e.target.value) }} /></label><button type="button" aria-label="Next muscle-volume week" disabled={end >= today} onClick={() => setAnchor(addDays(start, 7))}>→</button></div>
    </header>
    {issue ? <div role="alert" className="muscle-notice">Some workout or exercise data could not be loaded or saved. Totals may be incomplete. <button type="button" onClick={retry} disabled={retrying}>{retrying ? 'Retrying…' : 'Retry data load'}</button>{retryError && <p>{retryError}</p>}</div> : null}
    <div className="muscle-toolbar"><div className="muscle-metrics" role="group" aria-label="Muscle-volume metric"><button type="button" aria-pressed={metric === 'sets'} onClick={() => setMetric('sets')}>Sets</button><button type="button" aria-pressed={metric === 'load'} onClick={() => setMetric('load')}>Volume load</button></div><span>{fmtDate(start)}–{fmtDate(end)}</span></div>
    {report.totalSets === 0 && !issue && <div className="muscle-empty-explain"><strong>No classified working sets for this week.</strong><p>{report.separateLogs ? `${report.separateLogs} separate resistance logs are present, but they do not identify warm-up sets and may duplicate workouts. ` : ''}{report.excluded.length ? `${report.excluded.length} completed workout sets need review or are warm-ups. ` : ''}Use a completed workout with Main Lift, Accessory Lift or Power working sets to build this map.</p>{demoClient && demoClient.id !== clientId ? <Link className="btn" to={`/clients/${demoClient.id}/progress#training-load`}>View sample demo client</Link> : !demoClient ? <button type="button" className="btn" onClick={createDemo}>Create sample demo client</button> : null}</div>}
    <div className="muscle-map-panel">
      <div className="muscle-body">
        <img src={bodyImage} alt="Front and back muscle outlines" />
        <svg viewBox="0 0 768 768" role="group" aria-label="Muscle map. Hover or focus to read a value; click or press Enter for exercises">
          <defs><pattern id={`${id}-missing`} patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="#e7e7e7" /><path d="M0 8L8 0" stroke="#737373" strokeWidth="2" /></pattern></defs>
          {regions.map(([name, path], index) => { const m = byName[name]; return <path key={`${name}-${index}`} data-name={name} d={path} fill={fill(m)} className={`muscle-region${hover?.name === name ? ' is-active' : ''}`} role="button" tabIndex={0} aria-label={`${text(m)}. Open exercise details`} onPointerEnter={(e) => pointAt(e)} onPointerMove={(e) => pointAt(e)} onPointerLeave={() => setHover(null)} onFocus={(e) => pointAt(e, true)} onBlur={() => setHover(null)} onClick={() => showDetail(name)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(name) } }}><title>{text(m)}</title></path> })}
        </svg>
        {hover && <div className="muscle-hover-value" aria-hidden="true" style={{ left: hover.x, top: hover.y }}><strong>{hover.name}</strong><span>{hoverValue(byName[hover.name])}</span></div>}
      </div>
      <p className="muscle-caption">Select a muscle for exercises</p>
      <div className="muscle-legend" aria-label={`Relative weekly scale, zero to ${fmt(max)} ${metric === 'sets' ? 'sets' : 'kg repetitions'}`}><span>Low</span>{palette.map((color) => <i key={color} style={{ background: color }} />)}<span>{fmt(max)} {metric === 'sets' ? 'sets' : 'kg·reps'}</span></div>
      <p className="muscle-caption">Weekly scale · Gray: no direct sets{metric === 'load' ? ' · Stripes: unknown load · White: zero external load' : ''}</p>
    </div>
    <p className="muscle-coverage">{report.totalSets} working sets · {report.totalSets - missing}/{report.totalSets} with known volume load{report.unmapped.length ? ` · ${report.unmapped.reduce((s, r) => s + r.sets, 0)} unmapped sets` : ''}</p>
    <details className="muscle-list-disclosure"><summary>All muscle groups</summary><div className="muscle-list">{muscles.map((m) => <button key={m.muscle} type="button" onClick={() => showDetail(m.muscle)}><span>{m.muscle}{!surfaceNames.has(m.muscle) && <small>List only</small>}{partial(m) && <small>Load incomplete</small>}</span><strong>{fmt(value(m))}</strong></button>)}</div></details>
    <details className="muscle-method"><summary>Coverage &amp; calculation details{review.length ? ` · ${review.length} records need review` : ''}</summary>
      <p>Only completed Main Lift, Accessory Lift and Power working sets enter this report. Entire warm-up/cool-down blocks and individual warm-up sets are excluded. Unclassified sets stay outside totals until reviewed.</p>
      <p>{report.separateLogs} standalone resistance logs in this week are not included: their warm-up classification and overlap with workouts are unknown. Log this work in the <Link to={`/clients/${clientId}/training`}>client workout</Link> to use it here.</p>
      <p>Volume load is the sum of actual reps × recorded external kg; missing values remain unknown. Zero external load is not zero effort. Per-hand/per-side conventions are not inferred. Direct and assisting sets stay separate; no fractional weighting. The current <Link to="/workouts">Exercise Library</Link> mapping is used, so editing it recalculates history.</p>
      {!!report.unmapped.length && <div className="muscle-notice"><strong>Muscle assignments needed</strong><ul>{report.unmapped.map((r) => <li key={r.key}>{r.name} · {fmtDate(r.date)} · {r.sets} sets</li>)}</ul></div>}
      <p role="status">Save status: {saveStatus === 'failed' ? 'Failed — changes remain local; resolve the save issue before reloading.' : saveStatus || 'ready'}</p>
      {!!review.length && <><h4>Review completed sets</h4><p>Choose the actual group and set type. This updates the saved workout classification, not its recorded load or reps.</p>{review.map((r) => <ReviewSet key={r.key} record={r} clientId={clientId} />)}</>}
      {report.excluded.some((r) => !r.reviewable) && <p>{report.excluded.filter((r) => !r.reviewable).length} records excluded for warm-up/cool-down or missing actual set counts.</p>}
      <p>Surface regions follow the approved illustration, not individually measured anatomy. Deep groups are list-only. Bilateral totals do not measure left/right balance.</p>
    </details>
  </section>
}
