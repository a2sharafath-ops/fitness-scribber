import { Link } from 'react-router-dom'
import Button from '../atoms/Button'
import ModalShell from '../molecules/ModalShell'
import { WellnessForm } from './forms/LogForms'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { daysBetween, fmtDate } from '../../lib/dates'
import { wellnessBaseline, MIN_WELLNESS_BASELINE_DAYS, WELLNESS_BASELINE_DAYS } from '../../lib/wellnessBaseline'

const scoreLabel = (z) => z === null ? '—' : Math.abs(z) < 0.05 ? '0.0' : `${z > 0 ? '+' : ''}${z.toFixed(1)}`
const recordedWhen = (date, today) => {
  const age = daysBetween(date, today)
  return age === 0 ? 'Today' : `${fmtDate(date)} · ${age === 1 ? '1 day' : `${age} days`} ago`
}

function BaselineExplanation({ baseline, coverage }) {
  const { closeModal } = useModal()
  return <ModalShell title="Personal baseline comparison" onClose={closeModal} footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
    <p>Zero is your usual level. Each point is one standard deviation from your earlier ratings.</p>
    <div className="overview-baseline-explanation"><strong>Z = (latest favourable-scaled rating − baseline mean) ÷ sample standard deviation</strong>
      <p>Sleep uses the original rating (7 is best). Stress, fatigue and soreness use 8 − rating (1 is best). Positive scores are more favourable.</p></div>
    <p>Gray is within ±1 of baseline, green is above +1, and amber is below −1. These bands describe change from your usual ratings. They do not indicate health or clearance.</p>
    <p className="muted">{coverage} earlier check-in{coverage === 1 ? '' : 's'} available in the past {WELLNESS_BASELINE_DAYS} days. A comparison needs {MIN_WELLNESS_BASELINE_DAYS}. The latest check-in is excluded. Missing ratings and a flat baseline show no point. Scores beyond ±3 appear at the chart edge with their actual number.</p>
    <table className="table overview-baseline-table"><thead><tr><th>Metric</th><th>Days</th><th>Raw mean</th><th>SD</th></tr></thead><tbody>{baseline.metrics.map((metric) => <tr key={metric.key}><th scope="row">{metric.label}</th><td>{metric.count}</td><td>{metric.mean?.toFixed(2) ?? '—'}</td><td>{metric.sd?.toFixed(2) ?? '—'}</td></tr>)}</tbody></table>
  </ModalShell>
}

export default function OverviewCheckin({ clientId, today }) {
  const { db } = useData()
  const { openModal } = useModal()
  const baseline = wellnessBaseline(db.wellness, clientId, today)
  const { latest, metrics } = baseline
  const todaysEntry = latest?.date === today ? latest : null
  const counts = metrics.map((metric) => metric.count)
  const hasComparison = metrics.some((metric) => metric.z !== null)
  const lowCount = Math.min(...counts), highCount = Math.max(...counts)
  const missing = metrics.some((metric) => metric.reason === 'missing-rating')
  const noVariation = metrics.some((metric) => metric.reason === 'no-variation')
  const coverage = lowCount === highCount ? lowCount : `${lowCount}–${highCount}`
  const needed = MIN_WELLNESS_BASELINE_DAYS - lowCount
  const caption = needed > 0 ? `${needed} more complete check-in${needed === 1 ? '' : 's'} needed for comparison.`
    : missing ? 'Some latest ratings are missing. Only available ratings are compared.'
      : noVariation ? 'Some baseline ratings have no variation, so their scores are unavailable.' : ''
  const wearable = (db.wearable || []).filter((row) => row.clientId === clientId && row.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0]
  return <section className="card overview-checkin" aria-labelledby="checkin-title">
    <div className="flex between overview-section-head"><h2 id="checkin-title">Check-in snapshot</h2><div className="overview-inline-actions">
      <Button size="sm" variant={todaysEntry ? 'ghost' : 'primary'} onClick={() => openModal(<WellnessForm clientId={clientId} entry={todaysEntry || undefined} />)}>{todaysEntry ? 'Edit today’s check-in' : 'Record check-in'}</Button>
      <Link className="btn ghost sm" to={`/clients/${clientId}/check-ins`}>View check-ins →</Link>
    </div></div>
    {latest && <p className="overview-source">Last check-in · {recordedWhen(latest.date, today)} · {latest.source || 'Source not recorded'}</p>}
    <div className={`overview-baseline-layout${hasComparison ? '' : ' no-chart'}`}>
      {latest && <div className="overview-latest-ratings"><div className="overview-eyebrow">Latest ratings</div>{metrics.map((metric) =>
        <div className="overview-rating" key={metric.key}><span>{metric.label}</span><strong>{metric.value ?? '—'}{metric.value !== null && <small> /7</small>}</strong></div>)}
      </div>}
      <div className="overview-baseline-chart">
      <div className="overview-chart-head"><h3>{hasComparison ? 'Baseline change · Z-score' : latest ? 'Baseline comparison unavailable' : 'No check-ins yet'}</h3>
        {latest && <button type="button" className="overview-info" aria-label="How baseline Z-scores work" onClick={() => openModal(<BaselineExplanation baseline={baseline} coverage={coverage} />)}>i</button>}
      </div>
      {(!latest || !hasComparison || caption) && <p className="overview-chart-caption">{latest && !hasComparison && needed <= 0
        ? 'Comparison needs a latest rating and variation in earlier ratings.' : latest ? caption : 'Record a check-in to see ratings here.'}</p>}
      {hasComparison && <>
      <div className="overview-chart-direction"><span>← Less favourable</span><span>More favourable →</span></div>
      <div role="group" aria-label="Wellness change in standard deviations from personal baseline">{metrics.map((metric) => {
        const { z, band } = metric
        const position = z === null ? 50 : 50 + Math.max(-3, Math.min(3, z)) / 6 * 100
        const meaning = metric.reason === 'missing-rating' ? 'Rating missing' : metric.reason === 'insufficient-history' ? `${metric.needed} more earlier daily ratings needed` : metric.reason === 'no-variation' ? 'No baseline variation' : `${scoreLabel(z)} standard deviations; ${z > 0 ? 'more favourable' : z < 0 ? 'less favourable' : 'at baseline'}${band === 'near-baseline' ? '; within ±1 standard deviation' : ''}`
        return <div className="overview-z-row" key={metric.key} aria-label={`${metric.label}: ${meaning}`} title={meaning}>
          <span className="overview-z-label">{metric.label}</span><div className={`overview-z-track ${band}`} aria-hidden="true">{z !== null && <><span className={`overview-z-bar ${band}`} style={{ left: `${Math.min(50, position)}%`, width: `${Math.abs(position - 50)}%` }} /><span className={`overview-z-dot ${band}`} style={{ left: `${position}%` }} /></>}</div><span className="overview-z-value">{scoreLabel(z)}</span>
        </div>
      })}</div>
      <div className="overview-z-axis" aria-hidden="true">{['−3', '−2', '−1', '0', '+1', '+2', '+3'].map((number) => <span key={number}>{number}</span>)}</div>
      <p className="overview-z-legend"><span className="unfavourable">Below −1</span><span className="near-baseline">Within ±1 SD</span><span className="favourable">Above +1</span></p>
      </>}
    </div></div>
    {wearable && <div className="overview-device"><strong>Last wearable reading</strong><span>{recordedWhen(wearable.date, today)} · {wearable.source || 'Source not recorded'} · HRV {wearable.hrv ?? '—'} ms · Resting HR {wearable.rhr ?? '—'} bpm</span></div>}
  </section>
}
