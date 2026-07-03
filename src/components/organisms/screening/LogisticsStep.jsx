import Field from '../../atoms/Field'
import ChipSelect from '../../molecules/ChipSelect'
import SegToggle from '../../molecules/SegToggle'
import RangeSlider from '../../atoms/RangeSlider'
import { LOCATION_OPTIONS, EQUIPMENT_OPTIONS, EXERCISE_TYPES, SESSION_MINUTES } from '../../../lib/screening'

// Goals §3B availability & logistics, §3C environment & equipment, §3D preferences.
export default function LogisticsStep({ availability, environment, prefs, onChange }) {
  const av = (k, v) => onChange('availability', { ...availability, [k]: v })
  const en = (k, v) => onChange('environment', { ...environment, [k]: v })
  const pr = (k, v) => onChange('prefs', { ...prefs, [k]: v })
  return (
    <>
      <h3 className="scr-step-title">Availability</h3>
      <RangeSlider label="Days per week you can train" value={availability.daysPerWeek ?? 3} min={1} max={7} lo="1" hi="7" onChange={(v) => av('daysPerWeek', v)} />
      <div className="yn-row">
        <div className="yn-q">Minutes per session</div>
        <SegToggle options={SESSION_MINUTES.map((m) => [m, m + "'"])} value={availability.sessionMinutes} onChange={(v) => av('sessionMinutes', v)} ariaLabel="Session length" />
      </div>
      <div className="row2">
        <Field label="Preferred time(s) of day"><input value={availability.timeOfDay || ''} onChange={(e) => av('timeOfDay', e.target.value)} placeholder="e.g. weekday mornings" /></Field>
        <Field label="How soon do you want to start?"><input value={availability.start || ''} onChange={(e) => av('start', e.target.value)} /></Field>
      </div>
      <div className="row2">
        <Field label="Training split preference"><input value={availability.splitPref || ''} onChange={(e) => av('splitPref', e.target.value)} placeholder="or 'let the trainer decide'" /></Field>
        <Field label="Dates you'll be unavailable (travel etc.)"><input value={availability.unavailable || ''} onChange={(e) => av('unavailable', e.target.value)} /></Field>
      </div>

      <h3 className="scr-step-title" style={{ marginTop: 14 }}>Where & with what</h3>
      <p className="scr-step-sub">Where will you train?</p>
      <ChipSelect options={LOCATION_OPTIONS} value={environment.locations} onChange={(v) => en('locations', v)} ariaLabel="Training locations" />
      <p className="scr-step-sub" style={{ margin: '12px 0 6px' }}>Equipment you have access to</p>
      <ChipSelect options={EQUIPMENT_OPTIONS} value={environment.equipment} onChange={(v) => en('equipment', v)} ariaLabel="Equipment" />
      <div className="row2" style={{ marginTop: 12 }}>
        <Field label="Space constraints at home (if any)"><input value={environment.space || ''} onChange={(e) => en('space', e.target.value)} /></Field>
        <Field label="Solo, 1:1, small group, or online-guided?"><input value={environment.groupPref || ''} onChange={(e) => en('groupPref', e.target.value)} /></Field>
      </div>

      <h3 className="scr-step-title" style={{ marginTop: 14 }}>Likes & dislikes</h3>
      <p className="scr-step-sub">Exercise you enjoy</p>
      <ChipSelect options={EXERCISE_TYPES} value={prefs.enjoys} onChange={(v) => pr('enjoys', v)} ariaLabel="Enjoyed exercise" />
      <p className="scr-step-sub" style={{ margin: '12px 0 6px' }}>Exercise you dislike or want to avoid</p>
      <ChipSelect options={EXERCISE_TYPES} value={prefs.dislikes} onChange={(v) => pr('dislikes', v)} ariaLabel="Disliked exercise" />
      <div className="yn-row" style={{ marginTop: 12 }}>
        <div className="yn-q">Intensity preference</div>
        <SegToggle options={[['steady', 'Steady & moderate'], ['hard', 'Hard & intense'], ['mixed', 'Mixed']]} value={prefs.intensity || ''} onChange={(v) => pr('intensity', v)} ariaLabel="Intensity preference" />
      </div>
      <Field label={'Anything you\'re nervous about, or a hard "no"?'}><input value={prefs.hardNo || ''} onChange={(e) => pr('hardNo', e.target.value)} /></Field>
    </>
  )
}
