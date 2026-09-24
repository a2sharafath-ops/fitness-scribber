import { useState } from 'react'
import { Link, useParams, useLocation, Navigate } from 'react-router-dom'
import SegToggle from '../components/molecules/SegToggle'
import ReadinessBreakdown from '../components/organisms/metrics/ReadinessBreakdown'
import SrpeTlBreakdown from '../components/organisms/metrics/SrpeTlBreakdown'
import { useData } from '../store/DataContext'

const METRICS = {
  readiness: { title: 'Readiness', sub: 'Dated app summary of available wellness and HRV inputs; not clearance', Comp: ReadinessBreakdown },
  srpetl: { title: 'sRPE-TL', sub: 'Session load — RPE × duration (AU)', Comp: SrpeTlBreakdown },
}

export default function MetricDetailPage() {
  const { id, metric } = useParams()
  const { search, hash } = useLocation()
  const { db } = useData()
  const [range, setRange] = useState(28)
  const c = db.clients.find((x) => x.id === id)
  const m = METRICS[metric]

  if (!c) return <Link className="btn ghost back" to="/clients">← Clients</Link>
  if (['acwr', 'monotony', 'strain'].includes(metric)) return <Navigate to={`/clients/${id}/check-ins?view=load${search ? `&${search.slice(1)}` : ''}${hash}`} replace />
  if (!m) return (
    <>
      <Link className="back" to={`/clients/${id}`}>← Back</Link>
      <div className="empty" style={{ padding: 40 }}><div className="big">❓</div>Unknown metric.</div>
    </>
  )

  const { Comp } = m
  return (
    <>
      <Link className="back" to={`/clients/${c.id}/check-ins`}>← Back to Check-ins &amp; load</Link>
      <div className="topbar">
        <div><h1>{m.title}</h1><div className="sub">{c.name} · {m.sub}</div></div>
        <SegToggle options={[[28, '4 wk'], [56, '8 wk'], [90, '12 wk']]} value={range} onChange={setRange} ariaLabel="Date range" />
      </div>

      <Comp client={c} range={range} />
    </>
  )
}
