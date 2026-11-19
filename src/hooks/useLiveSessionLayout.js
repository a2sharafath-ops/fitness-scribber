import { useLayoutEffect, useRef, useState } from 'react'

// The session shares the client workspace's scrolling and button styles. Measure
// its chrome so the summary, jump targets and dock always use the same bounds.
export default function useLiveSessionLayout(readOnly) {
  const sessionRef = useRef(null)
  const headerRef = useRef(null)
  const dockRef = useRef(null)
  const markerRef = useRef(null)
  const [compact, setCompact] = useState(false)
  const [dockBounds, setDockBounds] = useState(null)

  useLayoutEffect(() => {
    const session = sessionRef.current
    const header = headerRef.current
    const dock = dockRef.current
    const measure = () => {
      const bounds = session.getBoundingClientRect()
      const headerHeight = header.getBoundingClientRect().height
      const dockHeight = dock?.getBoundingClientRect().height || 0
      session.style.setProperty('--ls-header-height', headerHeight + 'px')
      session.style.setProperty('--ls-dock-height', dockHeight + 'px')
      const width = Math.min(700, bounds.width, window.innerWidth - 24)
      const left = Math.max(width / 2 + 12, Math.min(window.innerWidth - width / 2 - 12, bounds.left + bounds.width / 2))
      setDockBounds((previous) => previous?.left === left && previous?.width === width ? previous : { left, width })
    }
    const sizes = new ResizeObserver(measure)
    sizes.observe(session)
    sizes.observe(header)
    if (dock) sizes.observe(dock)
    const position = new IntersectionObserver(([entry]) => {
      setCompact(!entry.isIntersecting && entry.boundingClientRect.top < 12)
    }, { rootMargin: '-12px 0px 0px 0px' })
    position.observe(markerRef.current)
    measure()
    window.addEventListener('resize', measure)
    return () => {
      sizes.disconnect()
      position.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [readOnly])

  return { sessionRef, headerRef, dockRef, markerRef, compact, dockBounds }
}
