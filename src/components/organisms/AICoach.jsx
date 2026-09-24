import { useState, useMemo } from 'react'
import Icon from '../atoms/Icon'
import { useData } from '../../store/DataContext'
import { useFormat } from '../../hooks/useFormat'
import { callFunction, hasBackend } from '../../api/functions'
import { lastNDates, todayISO, fmtDay } from '../../lib/dates'
import { dailySum, acwrSeries, trainingMonotony, readinessFor, rolling30Baseline, deviationPct, latestOf } from '../../lib/calc'
import { programStats } from '../../lib/program'

// Observational prompts avoid treating calculated metrics as clearance or risk cutoffs.
function suggest(db, client, tz, fmtVL) {
  const out = []
  const today = todayISO(tz)
  const w = latestOf(db.wellness, client.id)
  const hr = latestOf(db.wearable, client.id)
  const upcoming = db.prescriptions.filter((p) => p.clientId === client.id && p.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
  const upStats = upcoming ? programStats(upcoming) : null
  const planVL = upStats ? upStats.volume : 0

  if (w) out.push({ t: 'info', h: 'Latest wellness check-in', m: `${fmtDay(w.date)} · ${w.source || 'source not recorded'}. Sleep ${w.sleep ?? 'missing'}/7, stress ${w.stress ?? 'missing'}/7, fatigue ${w.fatigue ?? 'missing'}/7, soreness ${w.soreness ?? 'missing'}/7. Review alongside the client's report and plan.` })
  else out.push({ t: 'info', h: 'Wellness not recorded', m: 'There is no wellness check-in to interpret. Ask the client how they feel before using readiness in a training decision.' })
  if (hr) out.push({ t: 'info', h: 'Latest wearable observation', m: `${fmtDay(hr.date)} · ${hr.source || 'source not recorded'}. HRV ${hr.hrv ?? 'missing'} ms. Compare with the dated personal baseline in Check-ins & load.` })
  if (upcoming) {
    out.push({ t: 'info', h: 'Session drafted', m: `${fmtDay(upcoming.date)}: ${upStats.exercises} exercise(s), ~${fmtVL(Math.round(planVL))} planned volume load. Compare with the client's recent sessions and check-in before confirming.` })
  }
  return out.slice(0, 5)
}

// Compact metric summary handed to the LLM endpoint.
function summarize(db, client, tz, fmtVL) {
  const r = readinessFor(db, client.id)
  const intMap = dailySum(db.srpe.filter((row) => typeof row.tl === 'number' && Number.isFinite(row.tl)), client.id, 'tl')
  const last7 = lastNDates(7, tz).map((d) => intMap[d] || 0)
  const mono = trainingMonotony(last7)
  const acwr = acwrSeries(intMap, lastNDates(28, tz)).at(-1)
  const w = latestOf(db.wellness, client.id)
  const hr = latestOf(db.wearable, client.id)
  let hrvDev = null
  if (hr) { const b = rolling30Baseline(db, client.id, 'hrv', hr.date); if (b) hrvDev = deviationPct(hr.hrv, b) }
  const upcoming = db.prescriptions.filter((p) => p.clientId === client.id && p.date >= todayISO(tz)).sort((a, b) => a.date.localeCompare(b.date))[0]
  const upStats = upcoming ? programStats(upcoming) : null
  const planVL = upStats ? upStats.volume : 0
  return [
    `Athlete: ${client.name}, goal: ${client.goal}, level: ${client.level}.`,
    `App readiness interpretation: ${r.label}, as of ${r.date || 'unknown date'} (wellness ${r.wellness == null ? 'missing' : `${r.wellness}/28`}${r.hrvDev != null ? `, same-day HRV ${r.hrvDev.toFixed(0)}% vs personal baseline` : ', same-day HRV comparison missing'}). This is not medical or exercise clearance.`,
    `Weekly internal load (sRPE-TL): ${Math.round(last7.reduce((a, b) => a + b, 0))} AU. ACWR ${acwr ? acwr.toFixed(2) : 'n/a'} (7/28-day context, not an injury-risk cutoff). Monotony ${mono} (7-day mean/SD; unlogged days treated as zero).`,
    w ? `Latest wellness ${w.date} (${w.source || 'source not recorded'}) — sleep ${w.sleep ?? 'missing'}/7, stress ${w.stress ?? 'missing'}/7, fatigue ${w.fatigue ?? 'missing'}/7, soreness ${w.soreness ?? 'missing'}/7.` : 'No recent wellness check-in.',
    hr ? `Latest wearable ${hr.date} (${hr.source || 'source not recorded'}) — HRV ${hr.hrv ?? 'missing'} ms${hrvDev != null ? `, ${hrvDev.toFixed(0)}% vs prior 30-day baseline` : ', baseline missing'}.` : 'No wearable reading recorded.',
    upcoming ? `Next prescribed session ${fmtDay(upcoming.date)}: ${upStats.exercises} exercises, ~${fmtVL(Math.round(planVL))} volume load.` : 'No upcoming session prescribed.',
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
        <div className="ai-t"><span className="ai-spark"><Icon name="sparkles" size={15} /></span> AI Coaching Assistant</div>
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
            {loadingLive ? 'Thinking…' : <><Icon name="sparkles" size={14} /> Ask AI (live)</>}
          </button>
        )}
        <div className="muted" style={{ fontSize: 10, marginTop: 8, textAlign: 'center' }}>
          Rule-based synthesis of live metrics{hasBackend ? '; “Ask AI” calls your LLM endpoint.' : '. Connect a backend + LLM for free-form coaching.'}
        </div>
      </div>
    </div>
  )
}
