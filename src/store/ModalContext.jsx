import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ModalContext = createContext(null)

export function ModalProvider({ children }) {
  const [node, setNode] = useState(null)
  const [wide, setWide] = useState(false)

  // isWide: false | true | 'xl' (extra-wide, e.g. the workout builder)
  const openModal = useCallback((content, isWide = false) => {
    setNode(() => content)
    setWide(isWide)
  }, [])
  const closeModal = useCallback(() => setNode(null), [])

  // Escape closes the modal.
  useEffect(() => {
    if (!node) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal()
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
          <div className={'modal' + (wide ? ' wide' : '') + (wide === 'xl' ? ' xl' : '')} role="dialog" aria-modal="true">
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
