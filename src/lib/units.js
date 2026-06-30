// Weight is always stored in kg; these pure helpers convert for display/entry per the chosen unit.
export const KG2LB = 2.2046226

export const unitName = (u) => (u === 'lb' ? 'lb' : 'kg')

export const toDisp = (kg, u) =>
  kg == null || isNaN(kg) ? kg : u === 'lb' ? Math.round(kg * KG2LB * 10) / 10 : kg

export const dispToKg = (v, u) =>
  v === '' || v == null || isNaN(v) ? null : u === 'lb' ? +(+v / KG2LB).toFixed(2) : +v

export const fmtWt = (kg, u) => (kg == null ? '—' : toDisp(kg, u).toLocaleString() + ' ' + unitName(u))

export const fmtVL = (kg, u) =>
  kg == null ? '—' : (u === 'lb' ? Math.round(kg * KG2LB) : kg).toLocaleString() + ' ' + unitName(u)
