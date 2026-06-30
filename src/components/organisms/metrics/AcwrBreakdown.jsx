import { Line, Bar } from 'react-chartjs-2'
import Kpi from '../../atoms/Kpi'
import { useData } from '../../../store/DataContext'
import { baseOptions, COLORS, shortLabel } from '../../../lib/chartSetup'
import { lastNDates } from '../../../lib/dates'
import { dailySum, mean, acwrSeries } from '../../../lib/calc'

const zone = (v) => (v == null ? { label: '—', color: 'var(--muted)' }
  : v >= 0.8 && v <= 1.3 ? { label: 'Sweet spot', color: 'var(--green)' }
  : v > 1.3 ? { label: v > 1.5 ? 'High risk' : 'Elevated', color: 'var(--accent)' }
  : { label: 'Undertraining', color: 'var(--amber)' })

// Acute:Chronic Workload Ratio — how the 7-day acute load compares to the
// 28-day chronic load, the classic injury-risk "sweet spot" lens.
export default function AcwrBreakdown({ client, range }) {
  const { db, tz } = useData()
  const D = lastNDates(range, tz)
  const labels = D.map(shortLabel)

  const intMap = dailySum(db.srpe, client.id, 'tl')
  const loads = D.map((d) => intMap[d] || 0)
  const acute = D.map((_, i) => Math.round(mean(loads.slice(Math.max(0, i - 6), i + 1))))
  const chronic = D.map((_, i) => Math.round(mean(loads.slice(Math.max(0, i - 27), i + 1))))
  const ratio = acwrSeries(intMap, D)
  const now = [...ratio].reverse().find((v) => v != null)
  const z = zone(now)
  const ptColor = ratio.map((v) => (v == null ? COLORS.muted : v >= 0.8 && v <= 1.3 ? COLORS.green : v > 1.3 ? COLORS.red : COLORS.amber))

  return (
    <>
      <div className="kpi-strip">
        <Kpi label="ACWR (current)" value={now ? now.toFixed(2) : '—'} delta={z.label} deltaColor={z.color} />
        <Kpi label="Acute load (7d avg)" value={acute[acute.length - 1].toLocaleString()} delta="sRPE-TL / day" />
        <Kpi label="Chronic load (28d avg)" value={chronic[chronic.length - 1].toLocaleString()} delta="sRPE-TL / day" />
        <Kpi label="Sweet spot" value="0.8–1.3" delta="target band" />
      </div>

      <div className="card">
        <div className="section-title" style={{ margin: 0 }}>ACWR with sweet-spot band</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Points are colored by zone. The shaded band is the 0.8–1.3 target.</div>
        <div style={{ height: 220 }}>
          <Line
            data={{
              labels,
              datasets: [
                { label: 'Upper (1.3)', data: D.map(() => 1.3), borderColor: 'transparent', backgroundColor: 'rgba(61,220,151,.10)', pointRadius: 0, fill: '+1' },
                { label: 'Lower (0.8)', data: D.map(() => 0.8), borderColor: 'transparent', pointRadius: 0, fill: false },
                { label: 'ACWR', data: ratio, borderColor: COLORS.blue, backgroundColor: COLORS.blue, tension: 0.3, spanGaps: true, pointRadius: 3, pointBackgroundColor: ptColor, pointBorderColor: ptColor },
              ],
            }}
            options={{
              ...baseOptions(),
              interaction: { mode: 'index', intersect: false },
              plugins: { legend: { labels: { color: COLORS.muted, boxWidth: 12, filter: (l) => l.text === 'ACWR' } } },
              scales: { x: baseOptions().scales.x, y: { min: 0, suggestedMax: 2, grid: { color: '#2a3039' }, ticks: { color: COLORS.muted } } },
            }}
          />
        </div>
      </div>

      <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="section-title" style={{ margin: 0 }}>Acute vs chronic load</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>The ratio's numerator (7-day) over its denominator (28-day).</div>
          <div style={{ height: 200 }}>
            <Line
              data={{
                labels,
                datasets: [
                  { label: 'Acute (7d avg)', data: acute, borderColor: COLORS.red, backgroundColor: 'rgba(255,90,60,.10)', fill: true, tension: 0.3, pointRadius: 0 },
                  { label: 'Chronic (28d avg)', data: chronic, borderColor: COLORS.blue, backgroundColor: 'rgba(74,168,255,.10)', fill: true, tension: 0.3, pointRadius: 0 },
                ],
              }}
              options={{ ...baseOptions(), interaction: { mode: 'index', intersect: false } }}
            />
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ margin: 0 }}>Daily training load</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Raw sRPE-TL (RPE × duration) — the input both windows average.</div>
          <div style={{ height: 200 }}>
            <Bar
              data={{ labels, datasets: [{ label: 'sRPE-TL', data: loads, backgroundColor: 'rgba(74,168,255,.45)' }] }}
              options={{ ...baseOptions(), plugins: { legend: { display: false } } }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>How ACWR is computed</div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          ACWR divides the <strong>acute</strong> workload (rolling 7-day average daily sRPE-TL) by the <strong>chronic</strong> workload
          (rolling 28-day average). A ratio near 1.0 means recent load matches what the athlete is prepared for. The
          0.8–1.3 band is the commonly cited "sweet spot"; climbing above ~1.5 signals a rapid spike associated with higher
          injury risk, while sitting below 0.8 suggests detraining. A chronic base of at least four weeks is needed before the ratio is meaningful.
        </p>
      </div>
    </>
  )
}
