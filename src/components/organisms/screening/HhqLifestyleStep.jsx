import Field from '../../atoms/Field'
import SegToggle from '../../molecules/SegToggle'
import YesNoRow from '../../molecules/YesNoRow'
import RangeSlider from '../../atoms/RangeSlider'

// HHQ §2H lifestyle & recovery + §2I current & past physical activity.
// The "physically inactive" risk flag is DERIVED from these answers — not asked.
export default function HhqLifestyleStep({ lifestyle, activity, onChange }) {
  const l = (k, v) => onChange('lifestyle', { ...lifestyle, [k]: v })
  const a = (k, v) => onChange('activity', { ...activity, [k]: v })
  return (
    <>
      <h3 className="scr-step-title">Lifestyle & recovery</h3>
      <div className="row2">
        <Field label="Sleep (hours/night)"><input type="number" step="0.5" value={lifestyle.sleepHrs ?? ''} onChange={(e) => l('sleepHrs', e.target.value === '' ? null : +e.target.value)} /></Field>
        <Field label="Sedentary hours/day (desk/screen)"><input type="number" value={lifestyle.sedentaryHrs ?? ''} onChange={(e) => l('sedentaryHrs', e.target.value === '' ? null : +e.target.value)} /></Field>
      </div>
      <div className="yn-row">
        <div className="yn-q">Sleep quality</div>
        <SegToggle options={[['poor', 'Poor'], ['fair', 'Fair'], ['good', 'Good']]} value={lifestyle.sleepQuality || ''} onChange={(v) => l('sleepQuality', v)} ariaLabel="Sleep quality" />
      </div>
      <div className="yn-row">
        <div className="yn-q">Perceived stress</div>
        <SegToggle options={[['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High']]} value={lifestyle.stress || ''} onChange={(v) => l('stress', v)} ariaLabel="Stress" />
      </div>
      <Field label="Main sources of stress (optional)"><input value={lifestyle.stressSources || ''} onChange={(e) => l('stressSources', e.target.value)} /></Field>
      <Field label="Nutrition snapshot (meals/day · typical pattern · restrictions · hydration)"><textarea value={lifestyle.nutrition || ''} onChange={(e) => l('nutrition', e.target.value)} /></Field>
      <div className="row2">
        <Field label="Caffeine intake"><input value={lifestyle.caffeine || ''} onChange={(e) => l('caffeine', e.target.value)} /></Field>
        <Field label="Energy through the day"><input value={lifestyle.energy || ''} onChange={(e) => l('energy', e.target.value)} placeholder="e.g. afternoon slump" /></Field>
      </div>

      <h3 className="scr-step-title" style={{ marginTop: 14 }}>Your activity</h3>
      <YesNoRow text="Do you currently exercise?" value={activity.exercises} onChange={(v) => a('exercises', v)} />
      {activity.exercises === true && (
        <Field label="What type · how often · how long · how intense?"><input value={activity.detail || ''} onChange={(e) => a('detail', e.target.value)} /></Field>
      )}
      <div className="yn-row">
        <div className="yn-q">Training experience</div>
        <SegToggle options={[['new', 'New'], ['returning', 'Returning after a break'], ['experienced', 'Experienced']]} value={activity.trainingAge || ''} onChange={(v) => a('trainingAge', v)} ariaLabel="Training experience" />
      </div>
      <div className="row2">
        <Field label="Worked with a trainer before? What worked / didn't?"><input value={activity.priorTrainer || ''} onChange={(e) => a('priorTrainer', e.target.value)} /></Field>
        <Field label="Sports / activities you do or have done"><input value={activity.sports || ''} onChange={(e) => a('sports', e.target.value)} /></Field>
      </div>
      <RangeSlider label="How would you rate your current fitness?" value={activity.selfRating ?? 5} min={1} max={10} lo="1" hi="10" onChange={(v) => a('selfRating', v)} />
    </>
  )
}
