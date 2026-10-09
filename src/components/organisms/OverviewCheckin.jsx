import { Link } from 'react-router-dom'
import Button from '../atoms/Button'
import ModalShell from '../molecules/ModalShell'
import { WellnessForm } from './forms/LogForms'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { fmtDate } from '../../lib/dates'
import { wellnessBaseline, MIN_WELLNESS_BASELINE_DAYS, WELLNESS_BASELINE_DAYS } from '../../lib/wellnessBaseline'

const scoreLabel = (z) => z === null ? '—' : Math.abs(z) < 0.05 ? '0.0' : `${z > 0 ? '+' : ''}${z.toFixed(1)}`

function BaselineExplanation({ baseline }) {
  const { closeModal } = useModal()
  return <ModalShell title="Personal baseline comparison" onClose={closeModal} footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
    <p>Zero is your usual level. One Z-score unit is one standard deviation from your earlier ratings.</p>
    <div className="overview-baseline-explanation"><strong>Z = (latest rating − baseline mean) ÷ sample standard deviation</strong>
      <p>Sleep is reversed so the right side always means less favourable: lower sleep, or higher stress, fatigue and soreness.</p></div>
    <p className="muted">The comparison needs {MIN_WELLNESS_BASELINE_DAYS} earlier daily ratings in the preceding {WELLNESS_BASELINE_DAYS} days. The latest date is excluded. Missing ratings and zero baseline variation have no point. Values beyond ±3 appear at the edge; the numeric score remains visible.</p>
    <table className="table overview-baseline-table"><thead><tr><th>Metric</th><th>Days</th><th>Mean</th><th>SD</th></tr></thead><tbody>{baseline.metrics.map((metric) => <tr key={metric.key}><th scope="row">{metric.label}</th><td>{metric.count}</td><td>{metric.mean?.toFixed(2) ?? '—'}</td><td>{metric.sd?.toFixed(2) ?? '—'}</td></tr>)}</tbody></table>
  </ModalShell>
}

export default function OverviewCheckin({ clientId, today }) {
  const { db } = useData()
  const { openModal } = useModal()
  const baseline = wellnessBaseline(db.wellness, clientId, today)
  const { latest, metrics } = baseline
  const todaysEntry = latest?.date === today ? latest : null
  const counts = metrics.map((metric) => metric.count)
  const lowCount = Math.min(...counts), highCount = Math.max(...counts)
  const missing = metrics.some((metric) => metric.reason === 'missing-rating')
  const noVariation = metrics.some((metric) => metric.reason === 'no-variation')
  const caption = !latest ? 'No check-ins yet. Record your first check-in.'
    : lowCount < MIN_WELLNESS_BASELINE_DAYS ? `${lowCount} earlier daily ratings · ${MIN_WELLNESS_BASELINE_DAYS - lowCount} more complete check-ins needed.`
      : missing ? 'Some latest ratings are missing. Available ratings are compared below.'
        : noVariation ? 'Some baseline ratings have no variation; those scores are unavailable.'
          : `${lowCount === highCount ? lowCount : `${lowCount}–${highCount}`} earlier daily ratings · Latest date excluded`
  const wearable = (db.wearable || []).filter((row) => row.clientId === clientId && row.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0]
  return <section className="card overview-checkin" aria-labelledby="checkin-title">
    <div className="flex between overview-section-head"><h2 id="checkin-title">Check-in snapshot</h2><div className="overview-inline-actions">
      <Button size="sm" variant={todaysEntry ? 'ghost' : 'primary'} onClick={() => openModal(<WellnessForm clientId={clientId} entry={todaysEntry || undefined} />)}>{todaysEntry ? 'Edit today’s check-in' : 'Record check-in'}</Button>
      <Link className="btn ghost sm" to={`/clients/${clientId}/check-ins`}>View check-ins →</Link>
    </div></div>
    <p className="overview-source">{latest ? `${latest.date === today ? 'Today' : fmtDate(latest.date)} · ${latest.source || 'Source not recorded'}` : 'No data recorded'}</p>
    <div className="overview-baseline-layout"><div className="overview-baseline-chart">
      <div className="overview-chart-head"><h3>Baseline change · Z-score</h3><button type="button" className="overview-info" aria-label="How baseline Z-scores work" onClick={() => openModal(<BaselineExplanation baseline={baseline} />)}>i</button></div>
      <p className="overview-chart-caption">{caption}</p>
      <div className="overview-chart-direction"><span>← More favourable</span><span>Less favourable →</span></div>
      <div role="group" aria-label="Wellness change in standard deviations from personal baseline">{metrics.map((metric) => {
        const { z } = metric
        const position = z === null ? 50 : 50 + Math.max(-3, Math.min(3, z)) / 6 * 100
        const meaning = metric.reason === 'missing-rating' ? 'Rating missing' : metric.reason === 'insufficient-history' ? `${metric.needed} more earlier daily ratings needed` : metric.reason === 'no-variation' ? 'No baseline variation' : `${scoreLabel(z)} standard deviations; ${z > 0 ? 'less favourable' : z < 0 ? 'more favourable' : 'at baseline'}`
        return <div className="overview-z-row" key={metric.key} aria-label={`${metric.label}: ${meaning}`} title={meaning}>
          <span className="overview-z-label">{metric.label}</span><div className="overview-z-track" aria-hidden="true">{z !== null && <><span className={'overview-z-bar' + (z > 0 ? ' more' : '')} style={{ left: `${Math.min(50, position)}%`, width: `${Math.abs(position - 50)}%` }} /><span className={'overview-z-dot' + (z > 0 ? ' more' : '')} style={{ left: `${position}%` }} /></>}</div><span className="overview-z-value">{scoreLabel(z)}</span>
        </div>
      })}</div>
      <div className="overview-z-axis" aria-hidden="true">{['−3', '−2', '−1', '0', '+1', '+2', '+3'].map((number) => <span key={number}>{number}</span>)}</div>
    </div><div className="overview-latest-ratings"><div className="overview-eyebrow">Latest ratings</div>{metrics.map((metric) => <div className="overview-rating" key={metric.key}><span>{metric.label}</span><strong>{metric.value ?? '—'}{metric.value !== null && <small> /7</small>}</strong></div>)}</div></div>
    {wearable && <div className="overview-device"><strong>Wearable</strong><span>{fmtDate(wearable.date)} · {wearable.source || 'Source not recorded'} · HRV {wearable.hrv ?? '—'} ms · Resting HR {wearable.rhr ?? '—'} bpm</span></div>}
  </section>
}
