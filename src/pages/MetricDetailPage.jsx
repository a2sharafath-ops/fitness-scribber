import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import SegToggle from '../components/molecules/SegToggle'
import ReadinessBreakdown from '../components/organisms/metrics/ReadinessBreakdown'
import AcwrBreakdown from '../components/organisms/metrics/AcwrBreakdown'
import MonotonyBreakdown from '../components/organisms/metrics/MonotonyBreakdown'
import StrainBreakdown from '../components/organisms/metrics/StrainBreakdown'
import { useData } from '../store/DataContext'

const METRICS = {
  readiness: { title: 'Readiness', icon: '🟢', sub: 'Composite of subjective wellness and HRV deviation', Comp: ReadinessBreakdown },
  acwr: { title: 'ACWR', icon: '⚖️', sub: 'Acute : chronic workload ratio', Comp: AcwrBreakdown },
  monotony: { title: 'Monotony', icon: '📉', sub: 'Day-to-day sameness of training load', Comp: MonotonyBreakdown },
  strain: { title: 'Strain', icon: '🔥', sub: 'Weekly load amplified by monotony', Comp: StrainBreakdown },
}

export default function MetricDetailPage() {
  const { id, metric } = useParams()
  const nav = useNavigate()
  const { db } = useData()
  const [range, setRange] = useState(28)
  const c = db.clients.find((x) => x.id === id)
  const m = METRICS[metric]

  if (!c) return <Button className="back" variant="ghost" onClick={() => nav('/clients')}>← Clients</Button>
  if (!m) return (
    <>
      <button className="back" onClick={() => nav('/clients/' + id)}>← Back</button>
      <div className="empty" style={{ padding: 40 }}><div className="big">❓</div>Unknown metric.</div>
    </>
  )

  const { Comp } = m
  return (
    <>
      <button className="back" onClick={() => nav('/clients/' + c.id)}>← Back to Load-Response snapshot</button>
      <div className="topbar">
        <div className="flex gap">
          <Avatar name={c.name} size={44} />
          <div>
            <h1>{m.icon} {m.title}</h1>
            <div className="sub">{c.name} · {m.sub}</div>
          </div>
        </div>
        <SegToggle options={[[28, '4 wk'], [56, '8 wk'], [90, '12 wk']]} value={range} onChange={setRange} ariaLabel="Date range" />
      </div>

      <Comp client={c} range={range} />
    </>
  )
}
