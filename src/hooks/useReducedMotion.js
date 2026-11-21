import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export default function useReducedMotion() {
  const [reduced, setReduced] = useState(() => globalThis.window?.matchMedia?.(QUERY)?.matches ?? false)
  useEffect(() => {
    const preference = window.matchMedia?.(QUERY)
    if (!preference) return
    const update = () => setReduced(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  return reduced
}
