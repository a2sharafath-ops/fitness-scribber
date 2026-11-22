import { useEffect, useLayoutEffect, useState } from 'react'
import { MOTION_CHANGE } from './useReducedMotion'

const KEY = 'orbit:trainer:appearance'
const SYSTEM = '(prefers-color-scheme: dark)'

function readAppearance() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY))
    if (value) {
      return { theme: ['light', 'dark'].includes(value.theme) ? value.theme : 'system',
        frost: Number.isFinite(value.frost) ? Math.min(100, Math.max(0, value.frost)) : 64,
        motion: value.motion === 'reduce' ? 'reduce' : 'system', density: value.density === 'compact' ? 'compact' : 'comfortable' }
    }
  } catch { /* The workspace is usable when browser preferences cannot be saved. */ }
  return { theme: 'system', frost: 64, motion: 'system', density: 'comfortable' }
}

export default function useOrbitAppearance() {
  const [appearance, setAppearance] = useState(readAppearance)
  const [systemDark, setSystemDark] = useState(() => globalThis.window?.matchMedia?.(SYSTEM).matches ?? false)
  const theme = appearance.theme === 'system' ? systemDark ? 'dark' : 'light' : appearance.theme

  useEffect(() => {
    const system = window.matchMedia?.(SYSTEM)
    if (!system) return undefined
    const update = () => setSystemDark(system.matches)
    system.addEventListener('change', update)
    return () => system.removeEventListener('change', update)
  }, [])
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.orbitTheme = theme
    root.style.setProperty('--orbit-frost', appearance.frost / 100)
    root.dataset.orbitDensity = appearance.density
    const themeColor = document.querySelector('meta[name="theme-color"]')
    if (themeColor) themeColor.content = theme === 'dark' ? '#18151b' : '#f7f5f6'
  }, [theme, appearance.frost, appearance.density])
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.orbitMotion = appearance.motion
    document.dispatchEvent(new window.Event(MOTION_CHANGE))
  }, [appearance.motion])

  const updateAppearance = (patch) => {
    const next = { ...appearance, ...patch }
    setAppearance(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* Retain the current selection. */ }
  }
  return { ...appearance, effectiveTheme: theme, updateAppearance }
}
