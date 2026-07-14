import { createContext, useContext, useMemo, useState } from 'react'

// Planner clipboard. Deliberately app-level (not per-page) so a span copied in
// one client's planner survives navigating to another client and can be pasted
// there. In-memory only — a clipboard shouldn't outlive the session.
const Ctx = createContext(null)

export function ClipboardProvider({ children }) {
  const [clip, setClip] = useState(null)
  const value = useMemo(() => ({ clip, setClip, clearClip: () => setClip(null) }), [clip])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useClipboard = () => useContext(Ctx)
