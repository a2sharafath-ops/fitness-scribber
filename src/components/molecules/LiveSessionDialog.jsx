import { useEffect, useRef, useId } from 'react'

export default function LiveSessionDialog({ title, onClose, children, onSubmit, confirm = 'Apply', busy = false }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const trigger = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => { dialog.close(); if (trigger?.isConnected) trigger.focus() }
  }, [])
  return <dialog className="ls-dialog" ref={ref} aria-labelledby={titleId} onCancel={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSubmit?.(new FormData(event.currentTarget), event.currentTarget) }}>
      <div className="ls-dialog-head"><h2 id={titleId}>{title}</h2><button type="button" aria-label="Close dialog" className="ls-more" onClick={onClose}>×</button></div>
      <div className="ls-fields">{children}</div>
      <div className="ls-dialog-foot"><button type="button" className="ls-button" onClick={onClose}>{onSubmit ? 'Cancel' : 'Close'}</button>
        {onSubmit && <button type="submit" className="ls-button primary" disabled={busy}>{busy ? 'Saving…' : confirm}</button>}</div>
    </form>
  </dialog>
}
