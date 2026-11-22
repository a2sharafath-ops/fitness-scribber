import { useEffect, useState } from 'react'
import { MOTION_CHANGE } from './useReducedMotion'

const KEY = 'orbit:trainer:appearance'
const SYSTEM = '(prefers-color-scheme: dark)'

function readAppearance() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY))
    if (value && ['light', 'dark', 'system'].includes(value.theme) && Number.isFinite(value.frost)) {
      return { theme: value.theme, frost: Math.min(100, Math.max(0, value.frost)),
        motion: value.motion === 'reduce' ? 'reduce' : 'system', density: value.density === 'compact' ? 'compact' : 'comfortable' }
    }
  } catch { /* The workspace is usable when browser preferences cannot be saved. */ }
  return { theme: 'system', frost: 64, motion: 'system', density: 'comfortable' }
}

export default function useOrbitAppearance({ applyToDocument = true } = {}) {
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
  useEffect(() => {
    if (!applyToDocument) return undefined
    const root = document.documentElement
    root.dataset.orbitTheme = theme
    root.style.setProperty('--orbit-frost', appearance.frost / 100)
    return () => {
      delete root.dataset.orbitTheme
      root.style.removeProperty('--orbit-frost')
    }
  }, [applyToDocument, theme, appearance.frost])
  useEffect(() => {
    if (!applyToDocument) return undefined
    const root = document.documentElement
    root.dataset.orbitDensity = appearance.density
    return () => { delete root.dataset.orbitDensity }
  }, [applyToDocument, appearance.density])
  useEffect(() => {
    if (!applyToDocument) return undefined
    const root = document.documentElement
    root.dataset.orbitMotion = appearance.motion
    document.dispatchEvent(new window.Event(MOTION_CHANGE))
    return () => {
      delete root.dataset.orbitMotion
      document.dispatchEvent(new window.Event(MOTION_CHANGE))
    }
  }, [applyToDocument, appearance.motion])

  const updateAppearance = (patch) => {
    const next = { ...appearance, ...patch }
    setAppearance(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* Retain the current selection. */ }
  }
  return { ...appearance, effectiveTheme: theme, updateAppearance }
}
