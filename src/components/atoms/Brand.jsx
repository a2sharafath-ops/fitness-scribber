export default function Brand({ style, ringOnly = false, onDark = false }) {
  const asset = ringOnly ? 'mark' : 'wordmark'
  const name = 'Orbit by Cureocity'
  return (
    <div className={'orbit-brand' + (ringOnly ? ' orbit-brand-icon' : '') + (onDark ? ' orbit-brand-on-dark' : '')} style={style}>
      <div className="orbit-brand-lockup">
        <img className="orbit-brand-dark-ink" src={`/orbit-${asset}-dark.png`} alt={name} width={ringOnly ? 32 : 132} height={ringOnly ? 15 : 17} />
        <img className="orbit-brand-light-ink" src={`/orbit-${asset}-light.png`} alt={name} width={ringOnly ? 32 : 132} height={ringOnly ? 15 : 17} />
        {!ringOnly && <span className="orbit-brand-by" aria-hidden="true">by Cureocity</span>}
      </div>
    </div>
  )
}
