import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../atoms/Icon'
import { useModal } from '../../store/ModalContext'
import useReducedMotion from '../../hooks/useReducedMotion'

const KEY = 'orbit:insights-paused'
const INTERVAL = 8000

export default function DashboardInsights({ insights }) {
  const { modalOpen } = useModal()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem(KEY) === 'true' } catch { return false }
  })
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [overlay, setOverlay] = useState(false)
  const playback = useRef(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const readVisibility = () => setHidden(document.hidden)
    const readOverlays = () => setOverlay(Boolean(document.querySelector('dialog[open], .orbit-toolbar-menu[open], .db-menu[open], .gb-bell[aria-expanded="true"]')))
    readVisibility()
    readOverlays()
    document.addEventListener('visibilitychange', readVisibility)
    document.addEventListener('toggle', readOverlays, true)
    const toolbar = document.querySelector('.orbit-toolbar')
    const observer = new MutationObserver(readOverlays)
    if (toolbar) observer.observe(toolbar, { attributes: true, attributeFilter: ['aria-expanded'], childList: true, subtree: true })
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', readVisibility)
      document.removeEventListener('toggle', readOverlays, true)
    }
  }, [])

  const playing = !(paused || hovered || focused || reduced || hidden || modalOpen || overlay)
  useEffect(() => {
    if (playback.current?.index !== index) playback.current = { index, remaining: INTERVAL }
    if (!playing || insights.length < 2) return
    const cycle = playback.current
    const started = performance.now()
    const timer = setTimeout(() => setIndex((current) => (current + 1) % insights.length), cycle.remaining)
    return () => {
      clearTimeout(timer)
      cycle.remaining = Math.max(0, cycle.remaining - (performance.now() - started))
    }
  }, [playing, index, insights.length])

  const slide = insights[index]
  const shift = (direction) => setIndex((current) => (current + direction + insights.length) % insights.length)
  const toggle = () => {
    const next = !paused
    setPaused(next)
    if (!next) setHovered(false)
    try { localStorage.setItem(KEY, String(next)) } catch { /* The toggle stays available in this tab. */ }
  }

  return <section className="db-card orbit-insights" aria-roledescription="carousel" aria-labelledby="orbit-insights-heading"
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true) }} onPointerLeave={() => setHovered(false)}>
    <header className="db-head"><h2 id="orbit-insights-heading">Coaching insights</h2></header>
    <div className="orbit-insight-interactive" onFocus={() => setFocused(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
      <div className="orbit-insight-content" key={index} aria-live={playing ? 'off' : 'polite'}>
        <h3>{slide.title}</h3><p>{slide.detail}</p>
        <Link className="db-link" to={slide.path}>{slide.action}</Link>
      </div>
      <div className="orbit-booking-controls" role="group" aria-label="Browse insights">
        <button className="btn ghost orbit-booking-previous" type="button" aria-label="Previous insight" onClick={() => shift(-1)}><Icon name="chevron-right" size={14} /><span>Previous</span></button>
        <div className="orbit-booking-position"><span>{index + 1} of {insights.length}</span><div className="orbit-carousel-dots">
          {insights.map((item, i) => <button key={item.title} type="button" aria-label={item.title} aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)} />)}
        </div></div>
        <button className="btn ghost" type="button" aria-label="Next insight" onClick={() => shift(1)}><span>Next</span><Icon name="chevron-right" size={14} /></button>
      </div>
    </div>
    <div className="orbit-insight-tools"><span>{reduced ? 'Reduced motion' : paused ? 'Auto-play off' : playing ? 'Auto-rotates every 8 seconds' : 'Auto-play paused'}</span>
      {!reduced && <button className="db-link" type="button" onClick={toggle}>{paused ? 'Play insights' : 'Pause insights'}</button>}
    </div>
    {!reduced && <div className="orbit-insight-progress" key={index} data-playing={playing} aria-hidden="true" />}
  </section>
}
