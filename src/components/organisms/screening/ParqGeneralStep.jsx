import YesNoRow from '../../molecules/YesNoRow'
import { GENERAL_QUESTIONS, DELAY_FLAGS, PARQ_NAME, PARQ_COPYRIGHT, PARQ_ATTRIBUTION } from '../../../lib/parq'

// PAR-Q+ 2024 §1A general health questions + §1B delay conditions.
// Instrument text renders verbatim — no changes are permitted by the license.
export default function ParqGeneralStep({ parq, onChange }) {
  const setG = (id) => (v) => onChange({ ...parq, general: { ...parq.general, [id]: v } })
  const setList = (id) => (e) => onChange({ ...parq, lists: { ...parq.lists, [id]: e.target.value } })
  const setDelay = (id) => (e) => onChange({ ...parq, delay: { ...parq.delay, [id]: e.target.checked } })
  return (
    <>
      <h3 className="scr-step-title">{PARQ_NAME} — General Health Questions</h3>
      <p className="scr-step-sub">The Physical Activity Readiness Questionnaire for Everyone. Please answer YES or NO to each question.</p>
      {GENERAL_QUESTIONS.map((q) => (
        <YesNoRow key={q.id} text={q.text} note={q.note} value={parq.general[q.id]} onChange={setG(q.id)}>
          {q.list && parq.general[q.id] === true && (
            <div className="yn-list">
              <input value={parq.lists?.[q.id] || ''} onChange={setList(q.id)} placeholder={q.list} aria-label={q.list} />
            </div>
          )}
        </YesNoRow>
      ))}
      <div className="scr-banner" style={{ marginTop: 14 }}>
        <strong>Delay becoming more active if:</strong>
        {DELAY_FLAGS.map((f) => (
          <label className="scr-check" key={f.id}>
            <input type="checkbox" checked={!!parq.delay?.[f.id]} onChange={setDelay(f.id)} />
            <span>{f.text}</span>
          </label>
        ))}
      </div>
      <div className="scr-legal">{PARQ_COPYRIGHT} · {PARQ_ATTRIBUTION}</div>
    </>
  )
}
