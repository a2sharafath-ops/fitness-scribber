import { useEffect, useState, useRef } from 'react'
import Button from '../atoms/Button'
import { subscribe, dismissToast, resolveDialog } from '../../lib/toast'

const T_ICON = { success: '✓', error: '!', info: 'i' }

// Single host for toasts + in-app confirm/prompt dialogs. Mount once near the root.
export default function Toaster() {
  const [{ toasts, dialog }, setState] = useState({ toasts: [], dialog: null })
  useEffect(() => subscribe(setState), [])

  return (
    <>
      {/* Screen-reader announcements for async status (saves, sync, errors). */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => t.message).join('. ')}
      </div>

      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className={'toast ' + t.type}>
              <span className="t-ic" aria-hidden="true">{T_ICON[t.type] || 'i'}</span>
              <span className="t-msg">{t.message}</span>
              <button className="t-x" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      {dialog && <DialogHost dialog={dialog} />}
    </>
  )
}

function DialogHost({ dialog }) {
  const { kind, title, message, danger, confirmLabel, cancelLabel, defaultValue = '', placeholder, multiline } = dialog
  const [value, setValue] = useState(defaultValue)
  const fieldRef = useRef(null)
  const okRef = useRef(null)

  useEffect(() => { (kind === 'prompt' ? fieldRef.current : okRef.current)?.focus() }, [kind])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') resolveDialog(kind === 'prompt' ? null : false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [kind])

  const cancel = () => resolveDialog(kind === 'prompt' ? null : false)
  const ok = () => resolveDialog(kind === 'prompt' ? value : true)

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) cancel() }}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 420 }}>
        {title && <h2>{title}</h2>}
        {message && <div className="dialog-msg">{message}</div>}
        {kind === 'prompt' && (
          <div className="dialog-input">
            {multiline
              ? <textarea ref={fieldRef} value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} />
              : <input ref={fieldRef} value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') ok() }} />}
          </div>
        )}
        <div className="modal-foot">
          <Button variant="ghost" onClick={cancel}>{cancelLabel || 'Cancel'}</Button>
          <Button ref={okRef} variant={danger ? 'danger' : 'primary'} onClick={ok}>{confirmLabel || 'OK'}</Button>
        </div>
      </div>
    </div>
  )
}
