import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import { baseOptions, shortLabel } from '../../lib/chartSetup'
import { fmtDate } from '../../lib/dates'
import { fmtWt, toDisp, unitName } from '../../lib/units'

export default function OverviewLiftTrend({ clientId, trend, units }) {
  const theme = useOutletContext()
  const [selected, setSelected] = useState(null)
  const last = trend.at(-1)
  const reading = trend.find(point => point.date === selected) || last
  const chart = trend.length >= 2
  const selectPoint = (_event, points) => {
    if (points.length) setSelected(trend[points[0].index].date)
  }
  const browse = event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    const index = trend.indexOf(reading) + (event.key === 'ArrowLeft' ? -1 : 1)
    setSelected(trend[Math.max(0, Math.min(index, trend.length - 1))].date)
  }
  const options = baseOptions(theme === 'dark' ? '#4d414f' : '#e6dfe5', theme === 'dark' ? '#c4b8c5' : '#605762')
  options.animation = false
  options.interaction = { mode: 'index', intersect: false }
  options.onHover = selectPoint
  options.onClick = selectPoint
  options.plugins.legend = { display: false }
  options.plugins.tooltip = { enabled: false }
  options.scales.x.grid.display = false
  options.scales.x.ticks.maxTicksLimit = 4
  options.scales.y.ticks.maxTicksLimit = 4
  options.scales.y.title = { display: true, text: unitName(units) }

  return <section className="card overview-strength" aria-labelledby="overview-strength-title">
    <header><h2 id="overview-strength-title">Strength trend</h2><Link className="overview-text-link" to={`/clients/${encodeURIComponent(clientId)}/progress#strength`}>View strength →</Link></header>
    {reading && <div className="overview-lift-reading" aria-live="polite">
      <strong>{fmtWt(reading.loadKg, units)}</strong><span>{last.name} · {fmtDate(reading.date)}</span>
    </div>}
    {chart ? <>
      <div className="overview-lift-chart" tabIndex={0}
        aria-label={`${last.name} recorded set load. Use the arrow keys to browse dates.`} onKeyDown={browse}>
        <Line aria-hidden="true" options={options} data={{ labels: trend.map(point => shortLabel(point.date)), datasets: [{
          data: trend.map(point => toDisp(point.loadKg, units)), borderColor: '#dc465e', backgroundColor: '#dc465e20',
          pointBackgroundColor: '#dc465e', pointRadius: trend.map(point => point === reading ? 5 : 3), borderWidth: 2, fill: true,
        }] }} />
      </div>
      <p>Past 8 weeks · Heaviest recorded set per date · Change {last.loadKg > trend[0].loadKg ? '+' : ''}{fmtWt(last.loadKg - trend[0].loadKg, units)}</p>
    </> : <p>{last ? 'One more dated load for this lift is needed to show a trend.' : 'No recorded set loads in the past 8 weeks.'}</p>}
  </section>
}
