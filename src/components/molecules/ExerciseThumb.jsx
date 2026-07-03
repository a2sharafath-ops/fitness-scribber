// Video thumbnail for an exercise. Shows the stored thumbnail image when present,
// otherwise a generated placeholder tile. Clicking opens the video in a new tab.
// (Thumbnail-only by design — no inline playback.)
export default function ExerciseThumb({ exercise, size = 'md' }) {
  const { name, thumb, video } = exercise
  const inner = (
    <>
      {thumb ? <img src={thumb} alt={name + ' demo'} loading="lazy" /> : <span className="ex-thumb-name">{name}</span>}
      <span className="ex-thumb-play" aria-hidden="true">▶</span>
    </>
  )
  const cls = 'ex-thumb ' + size + (video ? '' : ' empty')
  return video ? (
    <a className={cls} href={video} target="_blank" rel="noreferrer" title={'Watch demo: ' + name}>{inner}</a>
  ) : (
    <div className={cls} title="No video linked">{inner}</div>
  )
}
