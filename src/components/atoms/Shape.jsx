import { RISK_ICON } from '../../lib/format'

// Non-color shape glyph used alongside color so status is distinguishable for colorblind users.
export default function Shape({ color }) {
  return (
    <span aria-hidden="true" style={{ fontSize: 10 }}>
      {RISK_ICON[color] || ''}
    </span>
  )
}
