// Standard modal layout: close button, title, body, footer actions.
export default function ModalShell({ title, onClose, children, footer }) {
  return (
    <>
      <button className="x" style={{ float: 'right' }} onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2>{title}</h2>
      {children}
      {footer && <div className="modal-foot">{footer}</div>}
    </>
  )
}
