// Small pure formatting/identity helpers shared across the app.
export const uid = () => Math.random().toString(36).slice(2, 9)

const palette = ['#fb404a', '#0b87c9', '#1f9a43', '#af52de', '#e8850c', '#f472b6', '#5856d6']
export const colorFor = (s) =>
  palette[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length]

export const initials = (n) =>
  String(n).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

// Non-color shape cue so Red/Yellow/Green is distinguishable without color (accessibility).
export const RISK_ICON = { green: '●', yellow: '◆', red: '■', gray: '○', blue: '●', purple: '●', orange: '◆' }
