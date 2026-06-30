import Tag from '../atoms/Tag'
import Shape from '../atoms/Shape'

// readiness = { label, color } from calc.readinessFor
export default function ReadinessTag({ readiness, short = false }) {
  const label = short ? readiness.label.split(' — ')[0] : readiness.label
  return (
    <Tag color={readiness.color} role="status" aria-label={'Readiness: ' + readiness.label}>
      <Shape color={readiness.color} /> {label}
    </Tag>
  )
}
