import { useState } from 'react'
import Card from '../atoms/Card'
import Button from '../atoms/Button'
import Field from '../atoms/Field'
import RangeSlider from '../atoms/RangeSlider'
import SegToggle from '../molecules/SegToggle'
import { ACTIVITY_LEVELS } from '../../lib/assessment'

// Athlete-facing self-report for pain / lifestyle / goals. Presentational:
// gathers input and raises onSubmit(type, data, notes) — the portal persists
// it (Supabase insert). `self: true` tags it as athlete-reported for the coach.
const TABS = [['pain', '🩹 Pain'], ['lifestyle', '😴 Lifestyle'], ['goals', '🎯 Goals']]

export default function SelfAssessment({ onSubmit, busy }) {
  const [tab, setTab] = useState('pain')
  const [done, setDone] = useState('')

  // pain
  const [pain, setPain] = useState({ area: '', severity: 3, aggravating: '', limitation: '' })
  // lifestyle
  const [life, setLife] = useState({ sleepHrs: '', sleepQuality: 4, stress: 4, hydrationL: '', activityLevel: 'Moderate', steps: '' })
  // goals
  const [goal, setGoal] = useState({ shortText: '', shortBy: '', longText: '', longBy: '', why: '' })

  const num = (v) => (v === '' || v == null || Number.isNaN(+v) ? null : +v)

  const build = () => {
    if (tab === 'pain') {
      if (!pain.area.trim()) return null
      return { self: true, sites: [{ area: pain.area.trim(), severity: +pain.severity, aggravating: pain.aggravating.trim(), limitation: pain.limitation.trim() }] }
    }
    if (tab === 'lifestyle') {
      return { self: true, sleepHrs: num(life.sleepHrs), sleepQuality: +life.sleepQuality, stress: +life.stress, hydrationL: num(life.hydrationL), activityLevel: life.activityLevel, steps: num(life.steps) }
    }
    const shortTerm = goal.shortText.trim() ? [{ text: goal.shortText.trim(), target: '', by: goal.shortBy }] : []
    const longTerm = goal.longText.trim() ? [{ text: goal.longText.trim(), target: '', by: goal.longBy }] : []
    if (!shortTerm.length && !longTerm.length) return null
    return { self: true, shortTerm, longTerm, why: goal.why.trim() }
  }

  const submit = async () => {
    const data = build()
    if (!data) { alert('Please fill in at least one field.'); return }
    const ok = await onSubmit(tab, data)
    if (ok) {
      setDone(tab)
      setTimeout(() => setDone(''), 2500)
      if (tab === 'pain') setPain({ area: '', severity: 3, aggravating: '', limitation: '' })
      if (tab === 'goals') setGoal({ shortText: '', shortBy: '', longText: '', longBy: '', why: '' })
    }
  }

  return (
    <Card style={{ marginTop: 16 }}>
      <div className="section-title" style={{ margin: '0 0 10px' }}>Self check-in</div>
      <SegToggle options={TABS} value={tab} onChange={setTab} ariaLabel="Self-assessment type" />

      <div style={{ marginTop: 12 }}>
        {tab === 'pain' && (
          <>
            <Field label="Where does it hurt?"><input value={pain.area} onChange={(e) => setPain({ ...pain, area: e.target.value })} placeholder="e.g. Right knee" /></Field>
            <RangeSlider label="Severity" value={pain.severity} min={0} max={10} lo="None" hi="Worst" onChange={(v) => setPain({ ...pain, severity: v })} />
            <div className="row2">
              <Field label="What makes it worse?"><input value={pain.aggravating} onChange={(e) => setPain({ ...pain, aggravating: e.target.value })} placeholder="e.g. Squatting" /></Field>
              <Field label="What can't you do?"><input value={pain.limitation} onChange={(e) => setPain({ ...pain, limitation: e.target.value })} placeholder="e.g. Full-depth squat" /></Field>
            </div>
          </>
        )}

        {tab === 'lifestyle' && (
          <>
            <div className="row2">
              <Field label="Sleep (hours/night)"><input type="number" step="0.5" value={life.sleepHrs} onChange={(e) => setLife({ ...life, sleepHrs: e.target.value })} /></Field>
              <Field label="Water (L/day)"><input type="number" step="0.1" value={life.hydrationL} onChange={(e) => setLife({ ...life, hydrationL: e.target.value })} /></Field>
            </div>
            <RangeSlider label="Sleep quality" value={life.sleepQuality} min={1} max={7} lo="Poor" hi="Great" onChange={(v) => setLife({ ...life, sleepQuality: v })} />
            <RangeSlider label="Stress" value={life.stress} min={1} max={7} lo="None" hi="Extreme" onChange={(v) => setLife({ ...life, stress: v })} />
            <div className="row2">
              <Field label="Activity level"><select value={life.activityLevel} onChange={(e) => setLife({ ...life, activityLevel: e.target.value })}>{ACTIVITY_LEVELS.map((a) => <option key={a}>{a}</option>)}</select></Field>
              <Field label="Daily steps (avg)"><input type="number" step="500" value={life.steps} onChange={(e) => setLife({ ...life, steps: e.target.value })} /></Field>
            </div>
          </>
        )}

        {tab === 'goals' && (
          <>
            <div className="row2">
              <Field label="Short-term goal"><input value={goal.shortText} onChange={(e) => setGoal({ ...goal, shortText: e.target.value })} placeholder="Next 4–8 weeks" /></Field>
              <Field label="By"><input type="date" value={goal.shortBy} onChange={(e) => setGoal({ ...goal, shortBy: e.target.value })} /></Field>
            </div>
            <div className="row2">
              <Field label="Long-term goal"><input value={goal.longText} onChange={(e) => setGoal({ ...goal, longText: e.target.value })} placeholder="6–12 months" /></Field>
              <Field label="By"><input type="date" value={goal.longBy} onChange={(e) => setGoal({ ...goal, longBy: e.target.value })} /></Field>
            </div>
            <Field label="Why it matters to you"><input value={goal.why} onChange={(e) => setGoal({ ...goal, why: e.target.value })} placeholder="Your motivation" /></Field>
          </>
        )}
      </div>

      <div className="modal-foot" style={{ alignItems: 'center', gap: 10 }}>
        {done ? <span className="muted" style={{ fontSize: 12 }}>Sent to your coach ✓</span> : null}
        <Button onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Submit'}</Button>
      </div>
    </Card>
  )
}
