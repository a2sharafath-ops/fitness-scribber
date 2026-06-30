import { useState, useMemo } from 'react'
import { useData } from '../../store/DataContext'
import { useFormat } from '../../hooks/useFormat'
import { callFunction, hasBackend } from '../../api/functions'
import { lastNDates, todayISO, fmtDay } from '../../lib/dates'
import { dailySum, acwrSeries, trainingMonotony, readinessScore, readinessFor, rolling30Baseline, deviationPct, latestOf, mean } from '../../lib/calc'

// Rule-based synthesis of live metrics into actionable coaching prompts.
function suggest(db, client, tz, fmtVL) {
  const out = []
  const r = readinessFor(db, client.id)
  const today = todayISO(tz)
  const rScore = readinessScore(db, client.id, today) ?? readinessScore(db, client.id, [...lastNDates(28, tz)].reverse().find((d) => readinessScore(db, client.id, d) != null) || today)
  const intMap = dailySum(db.srpe, client.id, 'tl')
  const last7 = lastNDates(7, tz).map((d) => intMap[d] || 0)
  const mono = trainingMonotony(last7)
  const acwr = acwrSeries(intMap, lastNDates(28, tz)).filter((v) => v != null).slice(-1)[0]
  const w = latestOf(db.wellness, client.id)
  const hr = latestOf(db.wearable, client.id)
  let hrvDev = null
  if (hr) { const b = rolling30Baseline(db, client.id, 'hrv', hr.date); if (b) hrvDev = deviationPct(hr.hrv, b) }
  const upcoming = db.prescriptions.filter((p) => p.clientId === client.id && p.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
  const planVL = upcoming ? upcoming.items.reduce((s, it) => s + (it.volumeLoad || 0), 0) : 0
  const avgVL = mean(lastNDates(28, tz).map((d) => dailySum(db.resistance, client.id, 'volumeLoad')[d] || 0).filter((v) => v > 0))

  if (hrvDev != null && hrvDev < -8) out.push({ t: 'warn', h: 'HRV suppressed', m: `Morning HRV is ${hrvDev.toFixed(0)}% below the 30-day baseline. Favor aerobic/technical work today and delay high-intensity loading.` })
  if (r.color === 'red') out.push({ t: 'warn', h: 'Readiness red', m: 'Both subjective wellness and objective HRV are down. Consider an active-recovery day or reduce planned Volume Load by 15–20%.' })
  else if (rScore != null && rScore < 45) out.push({ t: 'warn', h: 'Reduced readiness', m: `Composite readiness is ${rScore}/100. If training proceeds, cut one working set per lift or drop intensity ~5%.` })
  if (upcoming) {
    if (planVL > avgVL * 1.3 && avgVL > 0) out.push({ t: 'warn', h: 'Planned load spike', m: `${fmtDay(upcoming.date)}'s session is ${Math.round((planVL / avgVL - 1) * 100)}% above the 7–28d average Volume Load (${fmtVL(Math.round(planVL))}). Confirm this progression is intentional.` })
    else if (planVL > 0) out.push({ t: 'info', h: 'Session drafted', m: `${fmtDay(upcoming.date)}: ${upcoming.items.length} exercise(s), ~${fmtVL(Math.round(planVL))} Volume Load. ${rScore != null && rScore >= 65 ? 'Readiness supports it — green light.' : 'Cross-check against today’s readiness before confirming.'}` })
  }
  if (acwr != null && acwr > 1.5) out.push({ t: 'warn', h: 'Acute:chronic spike', m: `ACWR is ${acwr.toFixed(2)} (>1.5) — elevated injury-risk zone. Cap or deload weekly load to pull back toward 0.8–1.3.` })
  else if (acwr != null && acwr < 0.8) out.push({ t: 'info', h: 'Detraining risk', m: `ACWR is ${acwr.toFixed(2)} (<0.8). There's room to progressively add load this week.` })
  if (mono > 2) out.push({ t: 'warn', h: 'Monotony high', m: `Training monotony is ${mono} — daily loads are too uniform. Vary hard/easy days to lower strain and injury risk.` })
  if (w && w.soreness >= 5) out.push({ t: 'warn', h: 'DOMS elevated', m: `Reported muscle soreness is ${w.soreness}/7. Reduce eccentric volume and prioritize recovery modalities.` })
  if (out.length === 0 || (r.color === 'green' && (acwr == null || (acwr >= 0.8 && acwr <= 1.3)) && mono <= 2))
    out.unshift({ t: 'good', h: 'Athlete primed', m: 'Readiness, load ratio and monotony are all in range. Green light to progress key lifts ~2.5–5% this week.' })
  return out.slice(0, 5)
}

// Compact metric summary handed to the LLM endpoint.
function summarize(db, client, tz, fmtVL) {
  const r = readinessFor(db, client.id)
  const intMap = dailySum(db.srpe, client.id, 'tl')
  const last7 = lastNDates(7, tz).map((d) => intMap[d] || 0)
  const mono = trainingMonotony(last7)
  const acwr = acwrSeries(intMap, lastNDates(28, tz)).filter((v) => v != null).slice(-1)[0]
  const w = latestOf(db.wellness, client.id)
  const hr = latestOf(db.wearable, client.id)
  let hrvDev = null
  if (hr) { const b = rolling30Baseline(db, client.id, 'hrv', hr.date); if (b) hrvDev = deviationPct(hr.hrv, b) }
  const upcoming = db.prescriptions.filter((p) => p.clientId === client.id && p.date >= todayISO(tz)).sort((a, b) => a.date.localeCompare(b.date))[0]
  const planVL = upcoming ? upcoming.items.reduce((s, it) => s + (it.volumeLoad || 0), 0) : 0
  return [
    `Athlete: ${client.name}, goal: ${client.goal}, level: ${client.level}.`,
    `Readiness: ${r.label} (wellness ${r.wellness ?? 'n/a'}/28${hrvDev != null ? `, HRV ${hrvDev.toFixed(0)}% vs baseline` : ''}).`,
    `Weekly internal load (sRPE-TL): ${Math.round(last7.reduce((a, b) => a + b, 0))} AU. ACWR ${acwr ? acwr.toFixed(2) : 'n/a'}. Monotony ${mono}.`,
    w ? `Latest wellness — sleep ${w.sleep}/7, stress ${w.stress}/7, fatigue ${w.fatigue}/7, soreness ${w.soreness}/7.` : 'No recent wellness check-in.',
    upcoming ? `Next prescribed session ${fmtDay(upcoming.date)}: ${upcoming.items.length} exercises, ~${fmtVL(Math.round(planVL))} volume load.` : 'No upcoming session prescribed.',
  ].join('\n')
}

const COLOR = { warn: 'var(--accent)', good: 'var(--green)', info: 'var(--blue)' }

export default function AICoach({ client }) {
  const { db, tz } = useData()
  const { fmtVL } = useFormat()
  const [nonce, setNonce] = useState(0)
  const [live, setLive] = useState(null)
  const [loadingLive, setLoadingLive] = useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sug = useMemo(() => suggest(db, client, tz, fmtVL), [db, client, tz, nonce])

  const askLive = async () => {
    setLoadingLive(true); setLive(null)
    try {
      const { text } = await callFunction('insights', { summary: summarize(db, client, tz, fmtVL) })
      setLive(text || 'No response.')
    } catch (e) {
      setLive('⚠️ Live coaching unavailable (' + (e.message || 'function not deployed') + '). Showing rule-based guidance above.')
    } finally {
      setLoadingLive(false)
    }
  }

  return (
    <div className="ai-panel">
      <div className="ai-head">
        <div className="ai-t">✨ AI Coaching Assistant</div>
        <div className="ai-ingest">
          {['Readiness', 'Load trends', 'Drafted workout'].map((c) => (
            <span className="ai-chip" key={c}><span className="pulse" />{c}</span>
          ))}
        </div>
      </div>
      <div className="ai-feed">
        {sug.map((s, i) => (
          <div className={'ai-msg ' + s.t} key={i}>
            <span className="ai-tag" style={{ color: COLOR[s.t] }}>{s.h}</span>
            <div>{s.m}</div>
          </div>
        ))}
        {live && (
          <div className="ai-msg info">
            <span className="ai-tag" style={{ color: 'var(--purple)' }}>Live AI</span>
            <div style={{ whiteSpace: 'pre-wrap' }}>{live}</div>
          </div>
        )}
      </div>
      <div className="ai-foot">
        <button className="btn ghost sm" style={{ width: '100%' }} onClick={() => setNonce((n) => n + 1)}>⟳ Re-analyze current data</button>
        {hasBackend && (
          <button className="btn sm" style={{ width: '100%', marginTop: 8 }} onClick={askLive} disabled={loadingLive}>
            {loadingLive ? 'Thinking…' : '✨ Ask AI (live)'}
          </button>
        )}
        <div className="muted" style={{ fontSize: 10, marginTop: 8, textAlign: 'center' }}>
          Rule-based synthesis of live metrics{hasBackend ? '; “Ask AI” calls your LLM endpoint.' : '. Connect a backend + LLM for free-form coaching.'}
        </div>
      </div>
    </div>
  )
}
