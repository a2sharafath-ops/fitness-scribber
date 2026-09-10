import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const ModalContext = createContext(null)

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function ModalProvider({ children }) {
  const [node, setNode] = useState(null)
  const [wide, setWide] = useState(false)
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(null) // element focused before the modal opened

  // isWide: false | true | 'xl' (extra-wide, e.g. the workout builder)
  const openModal = useCallback((content, isWide = false) => {
    returnFocusRef.current = document.activeElement
    setNode(() => content)
    setWide(isWide)
  }, [])
  const closeModal = useCallback(() => setNode(null), [])

  // Move focus into the dialog on open; restore it to the trigger on close.
  useEffect(() => {
    if (!node) {
      const el = returnFocusRef.current
      returnFocusRef.current = null
      if (el && typeof el.focus === 'function') el.focus()
      return
    }
    const box = dialogRef.current
    if (!box) return
    const first = box.querySelector(FOCUSABLE)
    ;(first || box).focus()
  }, [node])

  // Escape closes the modal; Tab is trapped within the dialog.
  useEffect(() => {
    if (!node) return
    const onKey = (e) => {
      if (e.key === 'Escape') { closeModal(); return }
      if (e.key !== 'Tab') return
      const box = dialogRef.current
      if (!box) return
      const items = [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) { e.preventDefault(); box.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [node, closeModal])

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {node && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div ref={dialogRef} tabIndex={-1} className={'modal' + (wide ? ' wide' : '') + (wide === 'xl' ? ' xl' : '')} role="dialog" aria-modal="true">
            {node}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}
