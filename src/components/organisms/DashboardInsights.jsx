import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function DashboardInsights({ insights }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false))
  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const change = (event) => setReduced(event.matches)
    preference?.addEventListener('change', change)
    return () => preference?.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    if (paused || hovered || focused || reduced) return undefined
    const timer = setInterval(() => setIndex((current) => (current + 1) % insights.length), 8000)
    return () => clearInterval(timer)
  }, [paused, hovered, focused, reduced, insights.length])

  const slide = insights[index]
  const shift = (direction) => setIndex((current) => (current + direction + insights.length) % insights.length)

  return <section className="db-card orbit-insights" aria-roledescription="carousel" aria-labelledby="orbit-insights-heading"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <header className="db-head"><h2 id="orbit-insights-heading">Coaching insights</h2></header>
    <div className="orbit-insight-content" aria-live={paused || reduced || hovered || focused ? 'polite' : 'off'}>
      <h3>{slide.title}</h3><p>{slide.detail}</p>
      <Link className="db-link" to={slide.path}>{slide.action}</Link>
    </div>
    <div className="orbit-insight-tools">
      <button className="orbit-icon-button" type="button" aria-label="Previous insight" onClick={() => shift(-1)}><span aria-hidden="true">‹</span></button>
      <span>{index + 1} of {insights.length}</span>
      <button className="orbit-icon-button" type="button" aria-label="Next insight" onClick={() => shift(1)}><span aria-hidden="true">›</span></button>
      {!reduced && <button className="db-link" type="button" onClick={() => setPaused(!paused)}>{paused ? 'Play insights' : 'Pause insights'}</button>}
    </div>
  </section>
}
