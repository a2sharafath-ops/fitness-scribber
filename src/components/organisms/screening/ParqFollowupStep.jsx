import YesNoRow from '../../molecules/YesNoRow'
import { FOLLOWUP_CONDITIONS, FOLLOWUP_LIST_PROMPT, PARQ_COPYRIGHT } from '../../../lib/parq'

// PAR-Q+ §1C — reached when ANY general question is YES: the client completes the
// ENTIRE follow-up section (all 10 condition gateways), answering sub-questions
// only for conditions they have. Verbatim instrument text; no changes permitted.
export default function ParqFollowupStep({ parq, onChange }) {
  const set = (id) => (v) => onChange({ ...parq, followup: { ...parq.followup, [id]: v } })
  const setText = (e) => onChange({ ...parq, conditionsAndMeds: e.target.value })
  return (
    <>
      <h3 className="scr-step-title">Follow-up Questions About Your Medical Condition(s)</h3>
      <p className="scr-step-sub">For each condition: answer YES if you have it, then answer its questions. Answer NO to skip to the next condition.</p>
      {FOLLOWUP_CONDITIONS.map((c, i) => (
        <div key={c.id} style={{ marginBottom: 6 }}>
          <YesNoRow text={`${i + 1}. ${c.gate}`} value={parq.followup[c.id]} onChange={set(c.id)} />
          {parq.followup[c.id] === true && (
            <div className="yn-sub">
              {c.sub.map((s) => (
                <YesNoRow key={s.id} text={s.text} value={parq.followup[s.id]} onChange={set(s.id)} />
              ))}
            </div>
          )}
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        <label className="scr-step-sub" style={{ display: 'block', marginBottom: 6 }}>{FOLLOWUP_LIST_PROMPT}</label>
        <textarea value={parq.conditionsAndMeds || ''} onChange={setText} aria-label={FOLLOWUP_LIST_PROMPT} />
      </div>
      <div className="scr-legal">{PARQ_COPYRIGHT}</div>
    </>
  )
}
