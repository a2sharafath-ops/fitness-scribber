import { useEffect, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { COLORS } from '../../lib/chartSetup'

// Live heart-rate tile. The connected wearables only sync once a day, so this
// animates a realistic demo stream (clearly labelled) while a workout runs —
// ready to swap for a real-time feed later. Reports each sample to the parent.
const ZONES = [
  [0.5, 'Warm up', COLORS.muted],
  [0.6, 'Fat burn', COLORS.green],
  [0.7, 'Aerobic', COLORS.blue],
  [0.8, 'Threshold', COLORS.amber],
  [2, 'Peak', COLORS.red],
]

export default function HeartRateTile({ active, restingHr, age, onSample }) {
  const maxHr = 220 - (age || 30)
  const rest = restingHr || 62
  const [bpm, setBpm] = useState(null)
  const [hist, setHist] = useState([])
  const target = useRef(rest + 70) // drift target while exercising

  useEffect(() => {
    if (!active) return
    let cur = bpm ?? rest + 55
    const tick = () => {
      // wander the target around a working range, then ease toward it with noise
      target.current += (Math.random() - 0.5) * 14
      target.current = Math.max(rest + 35, Math.min(maxHr - 12, target.current))
      cur += (target.current - cur) * 0.25 + (Math.random() - 0.5) * 4
      const v = Math.round(cur)
      setBpm(v)
      setHist((h) => [...h.slice(-39), v])
      onSample?.(v)
    }
    tick()
    const iv = setInterval(tick, 1600)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const pct = bpm ? bpm / maxHr : 0
  const zone = ZONES.find(([t]) => pct < t) || ZONES[ZONES.length - 1]
  const color = bpm ? zone[2] : COLORS.muted

  return (
    <div className="hr-tile">
      <div className="flex between">
        <span className="k-l">❤️ Live heart rate</span>
        <span className="hr-demo">SIMULATED</span>
      </div>
      <div className="flex gap" style={{ alignItems: 'baseline', marginTop: 4 }}>
        <span className="hr-bpm" style={{ color }}>{bpm ?? '—'}</span>
        <span className="muted" style={{ fontSize: 12 }}>bpm</span>
        {bpm && <span style={{ fontSize: 12, fontWeight: 700, color, marginLeft: 'auto' }}>{zone[1]}</span>}
      </div>
      <div style={{ height: 44, marginTop: 6 }}>
        <Line
          data={{ labels: hist.map((_, i) => i), datasets: [{ data: hist, borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false }] }}
          options={{
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false, min: rest + 10, max: maxHr } },
          }}
        />
      </div>
      <div className="muted" style={{ fontSize: 11 }}>
        {active ? `Resting ${rest} · max ~${maxHr} bpm` : 'Starts when the workout begins'}
      </div>
    </div>
  )
}
