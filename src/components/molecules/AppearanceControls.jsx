import SegToggle from './SegToggle'

const choices = {
  theme: [['light', 'Light'], ['dark', 'Dark'], ['system', 'Match system']],
  motion: [['system', 'Device preference'], ['reduce', 'Reduce motion']],
  density: [['comfortable', 'Comfortable'], ['compact', 'Compact']],
}

export default function AppearanceControls({ appearance, prefix = 'orbit' }) {
  function choice(key, label) {
    const id = prefix + '-' + key
    const update = value => appearance.updateAppearance({ [key]: value })
    if (prefix === 'settings' || key === 'theme') return <div className="appearance-choice">
      <span>{label}</span>
      <SegToggle ariaLabel={label} options={choices[key]} value={appearance[key]} onChange={update} />
    </div>
    return <><label htmlFor={id}>{label}</label>
      <select id={id} value={appearance[key]} onChange={event => update(event.target.value)}>
        {choices[key].map(([value, title]) => <option key={value} value={value}>{title}</option>)}
      </select></>
  }
  return <>
    {choice('theme', 'Theme')}
    <label htmlFor={prefix + '-frost'}>Frost <span>{appearance.frost}%</span></label>
    <input type="range" id={prefix + '-frost'} min="0" max="100" value={appearance.frost} onChange={event => appearance.updateAppearance({ frost: Number(event.target.value) })} />
    {choice('motion', 'Motion')}
    {choice('density', 'Content spacing')}
  </>
}
