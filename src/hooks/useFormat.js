// Binds the pure unit helpers to the coach's currently-selected unit.
import { useMemo } from 'react'
import { useData } from '../store/DataContext'
import { unitName, toDisp, dispToKg, fmtWt, fmtVL } from '../lib/units'

export function useFormat() {
  const { units } = useData()
  return useMemo(
    () => ({
      units,
      unitName: () => unitName(units),
      toDisp: (kg) => toDisp(kg, units),
      dispToKg: (v) => dispToKg(v, units),
      fmtWt: (kg) => fmtWt(kg, units),
      fmtVL: (kg) => fmtVL(kg, units),
    }),
    [units],
  )
}
