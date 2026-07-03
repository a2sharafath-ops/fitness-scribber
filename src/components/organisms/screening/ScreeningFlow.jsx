import { useState } from 'react'
import Button from '../../atoms/Button'
import ConsentStep from './ConsentStep'
import ParqGeneralStep from './ParqGeneralStep'
import ParqFollowupStep from './ParqFollowupStep'
import ParqDeclarationStep from './ParqDeclarationStep'
import HhqPersonalStep from './HhqPersonalStep'
import HhqMedicalStep from './HhqMedicalStep'
import HhqHealthStep from './HhqHealthStep'
import HhqLifestyleStep from './HhqLifestyleStep'
import GoalsStep from './GoalsStep'
import LogisticsStep from './LogisticsStep'
import FinalConsentStep from './FinalConsentStep'
import { anyGeneralYes, generalAnswered, followupAnswered } from '../../../lib/parq'
import { todayISO } from '../../../lib/dates'
import './ScreeningFlow.css'

// Client-facing screening flow: consent → PAR-Q+ (verbatim) → HHQ → Goals.
// The parent persists progress via onSave(draft) after every step (save & resume)
// and submits via onComplete(answers). Outcome computation happens in lib/screening
// on the parent side — this flow NEVER shows the client a clearance/risk result.
export default function ScreeningFlow({ screening, onSave, onComplete, onCancel, busy }) {
  const [f, setF] = useState(screening)
  // If ANY general question is YES the client must complete the ENTIRE follow-up
  // section (all 10 gateways) — that's how the PAR-Q+ works; no per-question routing.
  const steps = ['consent', 'parq', ...(anyGeneralYes(f.parq.general) ? ['followup'] : []),
    'declaration', 'personal', 'medical', 'health', 'lifestyle', 'goals', 'logistics', 'final']
  const [idx, setIdx] = useState(Math.max(0, steps.indexOf(f.step)))
  const step = steps[Math.min(idx, steps.length - 1)]
  const today = todayISO()

  const patch = (k, v) => setF({ ...f, [k]: v })
  const patchIn = (section) => (k, v) => setF({ ...f, [section]: { ...f[section], [k]: v } })

  const canNext = {
    consent: !!(f.consent.collect && f.consent.share),
    parq: generalAnswered(f.parq.general),
    followup: followupAnswered(f.parq.followup),
    declaration: !!(f.parq.declaration?.name?.trim() && f.parq.declaration?.signature?.trim()),
    final: ['accurate', 'share', 'notMedicalAdvice', 'reportChanges'].every((k) => f.acknowledgements?.[k]),
  }[step] ?? true

  const next = () => {
    if (step === 'final') return onComplete(f)
    const to = steps[idx + 1]
    onSave({ ...f, step: to })
    setIdx(idx + 1)
  }
  const back = () => setIdx(Math.max(0, idx - 1))

  return (
    <div>
      <div className="scr-progress" aria-label={`Step ${idx + 1} of ${steps.length}`}>
        {steps.map((s, i) => <i key={s} className={i <= idx ? 'on' : ''} />)}
      </div>
      {step === 'consent' && <ConsentStep consent={f.consent} onChange={(v) => patch('consent', v)} />}
      {step === 'parq' && <ParqGeneralStep parq={f.parq} onChange={(v) => patch('parq', v)} />}
      {step === 'followup' && <ParqFollowupStep parq={f.parq} onChange={(v) => patch('parq', v)} />}
      {step === 'declaration' && (
        <ParqDeclarationStep declaration={f.parq.declaration} today={today}
          onChange={(v) => patch('parq', { ...f.parq, declaration: v })} />
      )}
      {step === 'personal' && <HhqPersonalStep personal={f.hhq.personal} contacts={f.hhq.contacts} onChange={patchIn('hhq')} />}
      {step === 'medical' && <HhqMedicalStep conditions={f.hhq.conditions} symptoms={f.hhq.symptoms} risk={f.hhq.risk} onChange={patchIn('hhq')} />}
      {step === 'health' && (
        <HhqHealthStep meds={f.hhq.meds} msk={f.hhq.msk} womens={f.hhq.womens}
          sex={f.hhq.personal.sex} pregnantFromParq={!!f.parq.delay?.pregnant} onChange={patchIn('hhq')} />
      )}
      {step === 'lifestyle' && <HhqLifestyleStep lifestyle={f.hhq.lifestyle} activity={f.hhq.activity} onChange={patchIn('hhq')} />}
      {step === 'goals' && <GoalsStep goals={f.goals} onChange={(v) => patch('goals', v)} />}
      {step === 'logistics' && (
        <LogisticsStep availability={f.goals.availability} environment={f.goals.environment} prefs={f.goals.prefs}
          onChange={(k, v) => patch('goals', { ...f.goals, [k]: v })} />
      )}
      {step === 'final' && <FinalConsentStep acknowledgements={f.acknowledgements} onChange={(v) => patch('acknowledgements', v)} />}

      <div className="scr-foot">
        <div>
          {idx > 0 ? <Button variant="ghost" onClick={back}>← Back</Button>
            : onCancel && <Button variant="ghost" onClick={onCancel}>Save & close</Button>}
        </div>
        <div className="flex gap">
          {onCancel && idx > 0 && <Button variant="ghost" onClick={() => { onSave({ ...f, step }); onCancel() }}>Save & close</Button>}
          <Button disabled={!canNext || busy} onClick={next}>
            {busy ? 'Saving…' : step === 'final' ? 'Submit screening' : 'Continue →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
