import Tag from '../atoms/Tag'
import Shape from '../atoms/Shape'

export default function ReadinessTag({ readiness }) {
  const label = readiness.score == null ? 'No readiness score' : `Readiness: ${readiness.score}/100`
  return (
    <Tag color={readiness.color} role="status">
      <Shape color={readiness.color} /> {label}
    </Tag>
  )
}
