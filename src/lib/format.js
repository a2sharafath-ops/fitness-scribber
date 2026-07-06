// Small pure formatting/identity helpers shared across the app.
export const uid = () => Math.random().toString(36).slice(2, 9)

const palette = ['#fb404a', '#0b87c9', '#1f9a43', '#8e44ad', '#e8850c', '#f472b6', '#5856d6']
export const colorFor = (s) =>
  palette[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length]

// Monochrome avatar backgrounds — neutral charcoal→slate shades only, all dark
// enough for white initials. Deterministic per name so an avatar stays stable.
const monoPalette = ['#2b2c31', '#3a3b41', '#484951', '#565761', '#404a55', '#2f3742']
export const avatarColor = (s) =>
  monoPalette[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % monoPalette.length]

export const initials = (n) =>
  String(n).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

// Non-color shape cue so Red/Yellow/Green is distinguishable without color (accessibility).
export const RISK_ICON = { green: '●', yellow: '◆', red: '■', gray: '○', blue: '●', purple: '●', orange: '◆' }
