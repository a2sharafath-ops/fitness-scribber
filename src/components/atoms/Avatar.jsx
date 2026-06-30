import { colorFor, initials } from '../../lib/format'

export default function Avatar({ name, size = 34 }) {
  return (
    <span
      className="avatar"
      role="img"
      aria-label={name}
      style={{ background: colorFor(name), width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  )
}
