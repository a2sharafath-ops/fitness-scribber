export default function Brand({ style, ringOnly = false, onDark = false, trainerLockup = false }) {
  const asset = ringOnly ? 'mark' : 'wordmark'
  const name = trainerLockup ? 'Orbit Trainer' : 'Orbit by Cureocity'
  const showTrainer = trainerLockup && !ringOnly
  return (
    <div className={'orbit-brand' + (ringOnly ? ' orbit-brand-icon' : '') + (onDark ? ' orbit-brand-on-dark' : '') + (showTrainer ? ' orbit-brand-trainer' : '')}
      style={style} role={showTrainer ? 'img' : undefined} aria-label={showTrainer ? name : undefined}>
      <div className="orbit-brand-lockup">
        <img className="orbit-brand-dark-ink" src={`/orbit-${asset}-dark.png`} alt={showTrainer ? '' : name} width={ringOnly ? 32 : 132} height={ringOnly ? 15 : 17} />
        <img className="orbit-brand-light-ink" src={`/orbit-${asset}-light.png`} alt={showTrainer ? '' : name} width={ringOnly ? 32 : 132} height={ringOnly ? 15 : 17} />
        {!ringOnly && !trainerLockup && <span className="orbit-brand-by" aria-hidden="true">by Cureocity</span>}
      </div>
      {showTrainer && <span className="orbit-brand-trainer-label" aria-hidden="true">TRAINER</span>}
    </div>
  )
}
