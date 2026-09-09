import {useId} from 'react'

// Keep the actual button disabled; explain the prerequisite in visible text,
// not a hover-only tooltip. The server remains the authority for every action.
export default function PoolingAction({reason = '', children, className = 'btn', ...props}) {
  const id = useId()
  return <div className="pooling-action">
    <button type="button" {...props} className={className} disabled={!!reason} aria-describedby={reason ? id : undefined}>{children}</button>
    {reason && <p id={id} className="pooling-lock">{reason}</p>}
  </div>
}
