import { Scatter } from 'react-chartjs-2'
import Tag from '../atoms/Tag'
import { useData } from '../../store/DataContext'
import { lastNDates, fmtDate } from '../../lib/dates'
import { rolling30Baseline, deviationPct } from '../../lib/calc'

// Shades the four readiness quadrants behind the scatter points.
const quadBg = {
  id: 'quadBg',
  beforeDraw(ch) {
    const { ctx, chartArea: a, scales } = ch
    if (!a) return
    const xt = scales.x.getPixelForValue(20)
    const yt = scales.y.getPixelForValue(0)
    ctx.save()
    ctx.fillStyle = 'rgba(61,220,151,.07)'; ctx.fillRect(xt, a.top, a.right - xt, yt - a.top)
    ctx.fillStyle = 'rgba(255,90,60,.08)'; ctx.fillRect(a.left, yt, xt - a.left, a.bottom - yt)
    ctx.fillStyle = 'rgba(255,210,63,.06)'; ctx.fillRect(a.left, a.top, xt - a.left, yt - a.top); ctx.fillRect(xt, yt, a.right - xt, a.bottom - yt)
    ctx.strokeStyle = '#2a3039'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(xt, a.top); ctx.lineTo(xt, a.bottom); ctx.moveTo(a.left, yt); ctx.lineTo(a.right, yt); ctx.stroke()
    ctx.restore()
  },
}

export default function ReadinessMatrix({ client }) {
  const { db, tz } = useData()
  if (!client.monitorOptIn) {
    return (
      <div className="empty"><div className="big">⌚</div>Wearables not enabled for this athlete</div>
    )
  }
  const pts = []
  lastNDates(28, tz).forEach((dt) => {
    const w = db.wellness.find((x) => x.clientId === client.id && x.date === dt)
    const hr = db.wearable.find((x) => x.clientId === client.id && x.date === dt)
    if (w && hr) {
      const base = rolling30Baseline(db, client.id, 'hrv', dt)
      if (base) pts.push({ x: w.score, y: +deviationPct(hr.hrv, base).toFixed(1), date: dt })
    }
  })
  if (!pts.length) return <div className="empty"><div className="big">📉</div>Need overlapping wellness + wearable days</div>

  const color = (p) => { const sg = p.x >= 20, og = p.y >= -5; return sg && og ? '#3ddc97' : !sg && !og ? '#ff5a3c' : '#ffd23f' }
  return (
    <>
      <div style={{ height: 240 }}>
        <Scatter
          data={{ datasets: [{ data: pts, pointBackgroundColor: pts.map(color), pointRadius: 6, pointHoverRadius: 8 }] }}
          options={{
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${fmtDate(c.raw.date)}: wellness ${c.raw.x}/28, HRV ${c.raw.y > 0 ? '+' : ''}${c.raw.y}%` } } },
            scales: {
              x: { min: 4, max: 28, title: { display: true, text: 'Wellness (Hooper)', color: '#8b95a5' }, grid: { color: '#2a3039' }, ticks: { color: '#8b95a5' } },
              y: { min: -20, max: 20, title: { display: true, text: 'HRV deviation %', color: '#8b95a5' }, grid: { color: '#2a3039' }, ticks: { color: '#8b95a5' } },
            },
          }}
          plugins={[quadBg]}
        />
      </div>
      <div className="pill-row" style={{ marginTop: 10 }}>
        <Tag color="green">Green · ready</Tag><Tag color="yellow">Yellow · monitor</Tag><Tag color="red">Red · at-risk</Tag>
      </div>
    </>
  )
}
