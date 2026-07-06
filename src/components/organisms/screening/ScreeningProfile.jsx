import { RISK_ICON } from '../../../lib/format'
import { fmtDate, fmtTime } from '../../../lib/dates'
import { HHQ_CONDITIONS, HHQ_SYMPTOMS, bmiOf, cvdRiskFactors, physicallyInactive, redFlags } from '../../../lib/screening'
import './ScreeningFlow.css'
import Icon from '../../atoms/Icon'

// Section 4 profile aggregation (4.3–4.10): everything from PAR-Q+/HHQ/Goals plus
// computed fields, grouped for how a trainer reads a client. One data model, two
// views: trainerView=false is the CLIENT view — their own inputs and measurements
// only, with red-flag markers, derived risk labels, and clearance data hidden.
const j = (v) => (Array.isArray(v) ? (v.length ? v.join(' · ') : null) : v)
const yn = (v) => (v === true ? 'Yes' : v === false ? 'No' : null)

function Rows({ icon, title, rows }) {
  const filled = rows.filter(([, v]) => v != null && v !== '')
  if (!filled.length) return null
  return (
    <div className="intake-block">
      <div className="i-h"><Icon name={icon} size={15} /> {title}</div>
      <div className="i-b">{filled.map(([l, v]) => <div key={l}><strong>{l}:</strong> {v}</div>)}</div>
    </div>
  )
}

export default function ScreeningProfile({ screening: s, trainerView }) {
  const h = s.hhq || {}, g = s.goals || {}, p = h.personal || {}, mk = (x) => (trainerView ? x + ' ' : '')
  const conditions = HHQ_CONDITIONS.filter((x) => ['past', 'current'].includes(h.conditions?.[x.id]?.status))
    .map((x) => `${trainerView && x.flag ? RISK_ICON.yellow + ' ' : ''}${x.label} (${h.conditions[x.id].status}${h.conditions[x.id].note ? ' — ' + h.conditions[x.id].note : ''})`)
  const symptoms = HHQ_SYMPTOMS.filter((x) => h.symptoms?.[x.id] === true)
    .map((x) => `${trainerView ? RISK_ICON[x.flag === 2 ? 'red' : x.flag === 1 ? 'yellow' : 'gray'] + ' ' : ''}${x.label}`)
  const bmi = bmiOf(p.heightCm, p.massKg)
  const flags = trainerView ? redFlags(s) : null
  const risks = trainerView ? cvdRiskFactors(s) : []
  const a = s.acknowledgements || {}
  const w = h.womens || {}

  return (
    <div>
      <Rows icon="like" title="Goals & targets" rows={[
        ['Primary', g.primary], ['Secondary', j(g.secondary)], ['Success looks like', g.smart],
        ['Target', [g.target?.metric, g.target?.value, g.target?.date && fmtDate(g.target.date)].filter(Boolean).join(' · ') || null],
        ['Event / deadline', g.event], ['Priority order', g.priority],
      ]} />
      <Rows icon="listHeart" title="Medical & health history" rows={[
        ['Conditions', j(conditions)], ['Current symptoms', j(symptoms)],
        ['Family history (early cardiac events)', yn(h.risk?.familyHistory)],
        ['Smoking', h.risk?.smoking ? h.risk.smoking + (h.risk.packsPerDay ? ` (${h.risk.packsPerDay} packs/day)` : '') : null],
        ['Vaping/nicotine', yn(h.risk?.vaping)], ['Alcohol', h.risk?.alcohol],
        ...(trainerView ? [[`Risk-factor rollup ${RISK_ICON.yellow}`, risks.length ? `${risks.length} — ${risks.join(' · ')}` : 'None'],
          ['Physically inactive (derived)', yn(physicallyInactive(s))],
          [`Red flags ${RISK_ICON.red}`, flags.major.length + flags.minor.length ? [...flags.major.map((x) => RISK_ICON.red + ' ' + x), ...flags.minor.map((x) => RISK_ICON.yellow + ' ' + x)].join(' · ') : 'None']] : []),
        ['Prescription meds', h.meds?.prescriptions], ['OTC meds', h.meds?.otc], ['Supplements', h.meds?.supplements],
        ['HR/BP-affecting meds', h.meds?.hrbpMeds], ['Allergies', h.meds?.allergies],
        ['Pregnant', yn(s.parq?.delay?.pregnant || w.pregnant)], ['Postpartum (< 6 mo)', yn(w.postpartum)], ["Women's health notes", w.notes],
      ]} />
      <Rows icon="danger" title="Injuries, pain & movement" rows={[
        [mk(RISK_ICON.yellow) + 'Current pain', h.msk?.currentPain], ['Past injuries', h.msk?.pastInjuries],
        ['Surgeries', h.msk?.surgeries], ['Implants/prostheses', h.msk?.implants],
        ['ROM limits / problem joints', h.msk?.romLimits], ['Movements to avoid', h.msk?.avoidMovements],
        ['Balance problems / falls', yn(h.msk?.balanceFalls)],
      ]} />
      <Rows icon="watch" title="Lifestyle & recovery" rows={[
        ['Occupation', [p.occupation, p.workActivity].filter(Boolean).join(' — ') || null],
        ['Sleep', h.lifestyle?.sleepHrs != null ? `${h.lifestyle.sleepHrs} h · ${h.lifestyle.sleepQuality || '—'}` : null],
        ['Stress', [h.lifestyle?.stress, h.lifestyle?.stressSources].filter(Boolean).join(' — ') || null],
        ['Nutrition', h.lifestyle?.nutrition], ['Caffeine', h.lifestyle?.caffeine],
        ['Sedentary hours/day', h.lifestyle?.sedentaryHrs], ['Energy', h.lifestyle?.energy],
      ]} />
      <Rows icon="dumbbellAlt" title="Training profile & preferences" rows={[
        ['Currently exercises', yn(h.activity?.exercises)], ['Current routine', h.activity?.detail],
        ['Training experience', h.activity?.trainingAge], ['Prior trainer', h.activity?.priorTrainer],
        ['Sports / activity history', h.activity?.sports], ['Self-rated fitness', h.activity?.selfRating != null ? h.activity.selfRating + '/10' : null],
        ['Enjoys', j(g.prefs?.enjoys)], ['Dislikes / avoid', j(g.prefs?.dislikes)],
        ['Intensity preference', g.prefs?.intensity], ['Nervous about / hard no', g.prefs?.hardNo],
      ]} />
      <Rows icon="calendarMark" title="Availability, environment & equipment" rows={[
        ['Days/week', g.availability?.daysPerWeek], ['Session length', g.availability?.sessionMinutes ? g.availability.sessionMinutes + ' min' : null],
        ['Preferred times', g.availability?.timeOfDay], ['Split preference', g.availability?.splitPref],
        ['Start', g.availability?.start], ['Unavailable', g.availability?.unavailable],
        ['Locations', j(g.environment?.locations)], ['Equipment', j(g.environment?.equipment)],
        ['Space constraints', g.environment?.space], ['Session format', g.environment?.groupPref],
      ]} />
      <Rows icon="tuning" title="Baseline measurements" rows={[
        ['Height', p.heightCm ? p.heightCm + ' cm' : null], ['Weight', p.massKg ? p.massKg + ' kg' : null],
        ['BMI (computed)', bmi],
        ['More', 'Body composition, movement screens & fitness tests live in Assessments (time series).'],
      ]} />
      <Rows icon="shield" title="Consent & audit trail" rows={[
        ['Consent to collect', s.consent?.collect ? fmtDate(s.consent.collect.slice(0, 10)) + ' ' + fmtTime(s.consent.collect) : null],
        ['Consent to share with trainer', s.consent?.share ? fmtDate(s.consent.share.slice(0, 10)) + ' ' + fmtTime(s.consent.share) : null],
        ['Acknowledgements', ['accurate', 'share', 'notMedicalAdvice', 'reportChanges'].every((k) => a[k]) ? '✓ All confirmed' + (a.at ? ' — ' + fmtDate(a.at.slice(0, 10)) : '') : null],
        ['Declaration signed', s.parq?.declaration?.signature ? `${s.parq.declaration.signature} — ${fmtDate(s.parq.declaration.date)}${s.parq.declaration.witness ? ' · witness ' + s.parq.declaration.witness : ''}` : null],
        ['Completed / valid until', s.completedOn ? `${fmtDate(s.completedOn)} → ${fmtDate(s.validUntil)}` : null],
        ...(trainerView ? [['Re-screen log', s.rescreenLog?.length ? s.rescreenLog.map((r) => `${fmtDate(r.date)} (${r.reason === 'expired' ? '12-month expiry' : 'health changed'})`).join(' · ') : null]] : []),
      ]} />
    </div>
  )
}
