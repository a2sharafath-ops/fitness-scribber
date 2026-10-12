import { useModal } from '../../store/ModalContext'
import ModalShell from '../molecules/ModalShell'
import Button from './Button'

export default function ProgressInfo({ term, label, text }) {
  const { openModal, closeModal } = useModal()
  const title = term || label || 'this chart'
  return <button type="button" className="progress-info" aria-label={`What is ${title}?`} onClick={() => openModal(
    <ModalShell title={title} onClose={closeModal} footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
      <p className="progress-info-text">{text}</p>
    </ModalShell>
  )}>i</button>
}
