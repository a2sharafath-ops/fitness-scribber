import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'
export const MOTION_CHANGE = 'orbit:motionchange'

export function prefersReducedMotion() {
  return globalThis.document?.documentElement.dataset.orbitMotion === 'reduce' ||
    (globalThis.window?.matchMedia?.(QUERY)?.matches ?? false)
}

export default function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  useEffect(() => {
    const preference = window.matchMedia?.(QUERY)
    const update = () => setReduced(prefersReducedMotion())
    update()
    preference?.addEventListener('change', update)
    document.addEventListener(MOTION_CHANGE, update)
    return () => {
      preference?.removeEventListener('change', update)
      document.removeEventListener(MOTION_CHANGE, update)
    }
  }, [])
  return reduced
}
