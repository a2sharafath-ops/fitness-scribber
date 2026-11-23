export default function AppearanceControls({ appearance, prefix = 'orbit' }) {
  return (
    <>
      <div className="orbit-scheme" role="group" aria-label="Theme">
        {[['light', 'Light'], ['dark', 'Dark'], ['system', 'Match system']].map(([theme, label]) => (
          <button key={theme} type="button" aria-pressed={appearance.theme === theme} onClick={() => appearance.updateAppearance({ theme })}>{label}</button>
        ))}
      </div>
      <label htmlFor={prefix + '-frost'}>Frost <span>{appearance.frost}%</span></label>
      <input type="range" id={prefix + '-frost'} min="0" max="100" value={appearance.frost} onChange={(event) => appearance.updateAppearance({ frost: Number(event.target.value) })} />
      <label htmlFor={prefix + '-motion'}>Motion</label>
      <select id={prefix + '-motion'} value={appearance.motion} onChange={event => appearance.updateAppearance({ motion: event.target.value })}>
        <option value="system">Device preference</option>
        <option value="reduce">Reduce motion</option>
      </select>
      <label htmlFor={prefix + '-density'}>Content spacing</label>
      <select id={prefix + '-density'} value={appearance.density} onChange={event => appearance.updateAppearance({ density: event.target.value })}>
        <option value="comfortable">Comfortable</option>
        <option value="compact">Compact</option>
      </select>
    </>
  )
}
